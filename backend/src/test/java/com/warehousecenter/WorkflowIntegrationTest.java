package com.warehousecenter;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "app.security.enabled=false")
@AutoConfigureMockMvc
class WorkflowIntegrationTest {
  @DynamicPropertySource
  static void database(DynamicPropertyRegistry r) {
    String url =
        System.getenv()
            .getOrDefault("TEST_DB_URL", "jdbc:postgresql://127.0.0.1:55432/warehouse_center_test");
    if (!url.endsWith("/warehouse_center_test"))
      throw new IllegalArgumentException("Tests require dedicated warehouse_center_test database");
    r.add("spring.datasource.url", () -> url);
    r.add(
        "spring.datasource.username",
        () -> System.getenv().getOrDefault("TEST_DB_USER", "warehouse_demo"));
    r.add("spring.datasource.password", () -> System.getenv().getOrDefault("TEST_DB_PASSWORD", ""));
    r.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
  }

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired JdbcTemplate sql;
  long product;

  @BeforeEach
  void setup() throws Exception {
    sql.execute(
        "TRUNCATE allocations, order_lines, warehouse_orders, inventory, stock_transactions, erp_messages, operation_receipts, products, locations RESTART IDENTITY CASCADE");
    post("/demo/seed", Map.of(), 200);
    product = getJson("/products").get(0).get("id").asLong();
  }

  JsonNode getJson(String path) throws Exception {
    return json.readTree(
        mvc.perform(get("/api" + path)).andReturn().getResponse().getContentAsString());
  }

  JsonNode post(String path, Object body, int expected) throws Exception {
    var response =
        mvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(
                        "/api" + path)
                    .contentType("application/json")
                    .content(json.writeValueAsString(body)))
            .andReturn()
            .getResponse();
    assertEquals(expected, response.getStatus(), path + " " + response.getContentAsString());
    return json.readTree(response.getContentAsString());
  }

  Map<String, Object> orderBody(String ref, int qty) {
    return Map.of(
        "reference",
        ref,
        "partner",
        "Test partner",
        "lines",
        List.of(Map.of("productId", product, "quantity", qty)));
  }

  long order(String kind, String ref, int qty) throws Exception {
    return post("/mock-erp/" + kind + "-orders", orderBody(ref, qty), 200).get("id").asLong();
  }

  Map<String, Object> receipt(int qty, String barcode, String key) {
    return Map.of(
        "barcode", barcode, "locationCode", "RECV-01", "quantity", qty, "operationKey", key);
  }

  Map<String, Object> move(int qty, String dest, String key) {
    return Map.of(
        "barcode",
        "WM101",
        "sourceCode",
        "RECV-01",
        "destinationCode",
        dest,
        "quantity",
        qty,
        "operationKey",
        key);
  }

  void stock(int qty, int reserved) throws Exception {
    JsonNode rows = getJson("/inventory");
    int q = 0, r = 0;
    for (JsonNode i : rows) {
      q += i.get("quantity").asInt();
      r += i.get("reserved").asInt();
      assertTrue(i.get("quantity").asInt() >= i.get("reserved").asInt());
      assertTrue(i.get("reserved").asInt() >= 0);
    }
    assertEquals(qty, q);
    assertEquals(reserved, r);
  }

  void receiveStock(int qty) throws Exception {
    long po = order("purchase", "PO", qty);
    post("/purchase-orders/" + po + "/receive", receipt(qty, "WM101", "r1"), 200);
    post("/putaway", move(qty, "A-01", "m1"), 200);
  }

  long pickAll(long so) throws Exception {
    long task = 0;
    for (JsonNode t : getJson("/sales-orders/" + so + "/tasks")) {
      task = t.get("id").asLong();
      post(
          "/pick-tasks/" + task + "/confirm",
          Map.of(
              "barcode",
              t.get("line").get("product").get("barcode").asText(),
              "sourceCode",
              t.get("inventory").get("location").get("code").asText(),
              "packingCode",
              "PACK-01",
              "quantity",
              t.get("quantity").asInt()),
          200);
    }
    return task;
  }

  @Test
  void fullJourneyAndExactlyOnceDispatch() throws Exception {
    long po = order("purchase", "PO-1001", 50);
    var r = receipt(50, "WM101", "receipt-1001");
    post("/purchase-orders/" + po + "/receive", r, 200);
    post("/purchase-orders/" + po + "/receive", r, 200);
    stock(50, 0);
    assertEquals(1, getJson("/transactions").size());
    post("/putaway", move(50, "A-01", "putaway-1001"), 200);
    post("/putaway", move(50, "A-01", "putaway-1001"), 200);
    stock(50, 0);
    long so = order("sales", "SO-1001", 10);
    post("/sales-orders/" + so + "/allocate", Map.of(), 200);
    stock(50, 10);
    pickAll(so);
    stock(50, 10);
    var pack =
        Map.of(
            "cartonBarcode",
            "CARTON-1",
            "scans",
            List.of(Map.of("barcode", "WM101", "quantity", 10)));
    post("/sales-orders/" + so + "/pack", pack, 200);
    stock(50, 10);
    var shipped =
        post("/sales-orders/" + so + "/dispatch", Map.of("cartonBarcode", "CARTON-1"), 200);
    assertEquals("SHIPPED", shipped.get("status").asText());
    stock(40, 0);
    int count = getJson("/transactions").size();
    post("/sales-orders/" + so + "/dispatch", Map.of("cartonBarcode", "CARTON-1"), 200);
    stock(40, 0);
    assertEquals(count, getJson("/transactions").size());
    assertEquals(count, getJson("/erp-messages").size());
    assertEquals(6, count);
  }

  @Test
  void wrongReceiptOverReceiptAndReplayConflictLeaveNoStock() throws Exception {
    long po = order("purchase", "PO", 50);
    post("/purchase-orders/" + po + "/receive", receipt(50, "BAD", "bad"), 404);
    post("/purchase-orders/" + po + "/receive", receipt(51, "WM101", "over"), 409);
    stock(0, 0);
    assertEquals(0, getJson("/transactions").size());
    long other =
        post("/products", Map.of("sku", "OTHER", "name", "Other product", "barcode", "OTHER"), 201)
            .get("id")
            .asLong();
    post("/purchase-orders/" + po + "/receive", receipt(1, "OTHER", "wrong"), 409);
    stock(0, 0);
    post("/purchase-orders/" + po + "/receive", receipt(20, "WM101", "ok"), 200);
    post("/purchase-orders/" + po + "/receive", receipt(21, "WM101", "ok"), 409);
    stock(20, 0);
    post("/purchase-orders/" + po + "/receive", receipt(30, "WM101", "rest"), 200);
    stock(50, 0);
  }

  @Test
  void blockedCapacityAndWrongZoneCannotMoveStock() throws Exception {
    long po = order("purchase", "PO", 50);
    post("/purchase-orders/" + po + "/receive", receipt(50, "WM101", "r"), 200);
    long loc = 0;
    for (JsonNode l : getJson("/locations"))
      if (l.get("code").asText().equals("A-01")) loc = l.get("id").asLong();
    post("/locations/" + loc + "/state", Map.of("active", false), 200);
    post("/putaway", move(50, "A-01", "blocked"), 409);
    post(
        "/locations",
        Map.of("code", "TINY", "description", "Small bin", "type", "STORAGE", "capacity", 5),
        201);
    post("/putaway", move(50, "TINY", "full"), 409);
    post("/putaway", move(50, "PACK-01", "wrong-zone"), 409);
    stock(50, 0);
    assertEquals(1, getJson("/transactions").size());
  }

  @Test
  void invalidPickPackAndDispatchLeaveStateUnchanged() throws Exception {
    receiveStock(50);
    long so = order("sales", "SO", 10);
    post("/sales-orders/" + so + "/allocate", Map.of(), 200);
    long task = getJson("/sales-orders/" + so + "/tasks").get(0).get("id").asLong();
    post(
        "/pick-tasks/" + task + "/confirm",
        Map.of("barcode", "BAD", "sourceCode", "A-01", "packingCode", "PACK-01", "quantity", 10),
        409);
    post(
        "/pick-tasks/" + task + "/confirm",
        Map.of(
            "barcode", "WM101", "sourceCode", "RECV-01", "packingCode", "PACK-01", "quantity", 10),
        409);
    post(
        "/pick-tasks/" + task + "/confirm",
        Map.of("barcode", "WM101", "sourceCode", "A-01", "packingCode", "PACK-01", "quantity", 11),
        409);
    stock(50, 10);
    post("/sales-orders/" + so + "/dispatch", Map.of("cartonBarcode", "CARTON"), 409);
    pickAll(so);
    post(
        "/sales-orders/" + so + "/pack",
        Map.of(
            "cartonBarcode", "CARTON", "scans", List.of(Map.of("barcode", "BAD", "quantity", 10))),
        409);
    stock(50, 10);
    post(
        "/sales-orders/" + so + "/pack",
        Map.of(
            "cartonBarcode",
            "CARTON",
            "scans",
            List.of(Map.of("barcode", "WM101", "quantity", 10))),
        200);
    post("/sales-orders/" + so + "/dispatch", Map.of("cartonBarcode", "WRONG"), 409);
    stock(50, 10);
  }

  @Test
  void insufficientMultiLineAllocationRollsBackEverything() throws Exception {
    receiveStock(50);
    long other =
        post("/products", Map.of("sku", "NONE", "name", "No stock", "barcode", "NONE"), 201)
            .get("id")
            .asLong();
    long so =
        post(
                "/mock-erp/sales-orders",
                Map.of(
                    "reference",
                    "SO",
                    "partner",
                    "Customer",
                    "lines",
                    List.of(
                        Map.of("productId", product, "quantity", 10),
                        Map.of("productId", other, "quantity", 1))),
                200)
            .get("id")
            .asLong();
    post("/sales-orders/" + so + "/allocate", Map.of(), 409);
    stock(50, 0);
    assertEquals(0, getJson("/sales-orders/" + so + "/tasks").size());
    assertEquals(2, getJson("/transactions").size());
    assertEquals("OPEN", getJson("/sales-orders").get(0).get("status").asText());
  }

  @Test
  void concurrentOrdersCannotReserveSameUnits() throws Exception {
    receiveStock(50);
    long a = order("sales", "SO-A", 40), b = order("sales", "SO-B", 40);
    var pool = Executors.newFixedThreadPool(2);
    try {
      List<Callable<Integer>> calls = List.of(() -> allocateStatus(a), () -> allocateStatus(b));
      List<Integer> results = new ArrayList<>();
      for (var f : pool.invokeAll(calls)) results.add(f.get());
      Collections.sort(results);
      assertEquals(List.of(200, 409), results);
      stock(50, 40);
    } finally {
      pool.shutdownNow();
    }
  }

  int allocateStatus(long id) throws Exception {
    return mvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(
                "/api/sales-orders/" + id + "/allocate"))
        .andReturn()
        .getResponse()
        .getStatus();
  }

  @Test
  void erpFailureRetryAndUniqueImports() throws Exception {
    receiveStock(50);
    post("/mock-erp/purchase-orders", orderBody("PO", 50), 409);
    post("/products", Map.of("sku", "WM-101", "name", "Duplicate", "barcode", "WM101"), 409);
    post("/receive", Map.of("barcode", "WM101", "locationCode", "A-01", "quantity", 10), 409);
    long msg = getJson("/erp-messages").get(0).get("id").asLong();
    assertEquals(
        "FAILED",
        post("/erp-messages/" + msg + "/acknowledge", Map.of("fail", true), 200)
            .get("status")
            .asText());
    stock(50, 0);
    JsonNode ack = post("/erp-messages/" + msg + "/acknowledge", Map.of("fail", false), 200);
    assertEquals("ACKNOWLEDGED", ack.get("status").asText());
    assertEquals(2, ack.get("attempts").asInt());
    stock(50, 0);
    post("/putaway", move(0, "A-01", "zero"), 400);
  }

  @Test
  void multiBinPicksPreserveTotalAndReserveOnlyOwnStock() throws Exception {
    long po = order("purchase", "PO", 50);
    post("/purchase-orders/" + po + "/receive", receipt(50, "WM101", "r"), 200);
    post("/locations", Map.of("code", "A-02", "description", "Second bin", "type", "STORAGE"), 201);
    post("/putaway", move(5, "A-01", "m1"), 200);
    post("/putaway", move(45, "A-02", "m2"), 200);
    long so = order("sales", "SO", 10);
    post("/sales-orders/" + so + "/allocate", Map.of(), 200);
    assertEquals(2, getJson("/sales-orders/" + so + "/tasks").size());
    pickAll(so);
    stock(50, 10);
    assertEquals("PICKED", getJson("/sales-orders").get(0).get("status").asText());
    post(
        "/sales-orders/" + so + "/pack",
        Map.of(
            "cartonBarcode", "BOX", "scans", List.of(Map.of("barcode", "WM101", "quantity", 10))),
        200);
    post("/sales-orders/" + so + "/dispatch", Map.of("cartonBarcode", "BOX"), 200);
    stock(40, 0);
  }

  @Test
  void multiProductOrderVerifiesEveryLineBeforeDispatch() throws Exception {
    receiveStock(50);
    long keyboard =
        post("/products", Map.of("sku", "KB-102", "name", "Keyboard", "barcode", "KB102"), 201)
            .get("id")
            .asLong();
    long po =
        post(
                "/mock-erp/purchase-orders",
                Map.of(
                    "reference",
                    "PO-KEYBOARD",
                    "partner",
                    "Supplier",
                    "lines",
                    List.of(Map.of("productId", keyboard, "quantity", 20))),
                200)
            .get("id")
            .asLong();
    post("/purchase-orders/" + po + "/receive", receipt(20, "KB102", "keyboard-receipt"), 200);
    post(
        "/putaway",
        Map.of(
            "barcode",
            "KB102",
            "sourceCode",
            "RECV-01",
            "destinationCode",
            "A-01",
            "quantity",
            20,
            "operationKey",
            "keyboard-move"),
        200);
    long so =
        post(
                "/mock-erp/sales-orders",
                Map.of(
                    "reference",
                    "SO-MULTI",
                    "partner",
                    "Customer",
                    "lines",
                    List.of(
                        Map.of("productId", product, "quantity", 10),
                        Map.of("productId", keyboard, "quantity", 4))),
                200)
            .get("id")
            .asLong();
    post("/sales-orders/" + so + "/allocate", Map.of(), 200);
    stock(70, 14);
    pickAll(so);
    stock(70, 14);
    post(
        "/sales-orders/" + so + "/pack",
        Map.of(
            "cartonBarcode",
            "MULTI-BOX",
            "scans",
            List.of(Map.of("barcode", "WM101", "quantity", 10))),
        409);
    post(
        "/sales-orders/" + so + "/pack",
        Map.of(
            "cartonBarcode",
            "MULTI-BOX",
            "scans",
            List.of(
                Map.of("barcode", "WM101", "quantity", 10),
                Map.of("barcode", "KB102", "quantity", 4))),
        200);
    post("/sales-orders/" + so + "/dispatch", Map.of("cartonBarcode", "MULTI-BOX"), 200);
    stock(56, 0);
    for (JsonNode message : getJson("/erp-messages")) {
      assertTrue(message.get("transaction").get("id").asLong() > 0);
    }
  }
}
