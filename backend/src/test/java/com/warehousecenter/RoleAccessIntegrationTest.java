package com.warehousecenter;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

import com.fasterxml.jackson.databind.*;
import com.warehousecenter.service.AccountService;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "app.security.enabled=true",
      "app.security.username=rbac-admin",
      "app.security.password=admin-test-password"
    })
@AutoConfigureMockMvc
class RoleAccessIntegrationTest {
  @DynamicPropertySource
  static void database(DynamicPropertyRegistry r) {
    WorkflowIntegrationTest.database(r);
  }

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate sql;
  @Autowired ObjectMapper json;
  @Autowired AccountService accounts;

  @BeforeEach
  void prepare() {
    sql.execute("TRUNCATE access_audit,app_users RESTART IDENTITY");
    accounts.bootstrap("rbac-admin", "admin-test-password");
  }

  JsonNode postAs(String user, String password, String path, Object body, int status)
      throws Exception {
    var response =
        mvc.perform(
                post("/api" + path)
                    .with(httpBasic(user, password))
                    .contentType("application/json")
                    .content(json.writeValueAsString(body)))
            .andReturn()
            .getResponse();
    assertEquals(status, response.getStatus(), response.getContentAsString());
    return json.readTree(response.getContentAsString());
  }

  JsonNode admin(String path, Object body, int status) throws Exception {
    return postAs("rbac-admin", "admin-test-password", path, body, status);
  }

  long user(String name, String role) throws Exception {
    return admin(
            "/users",
            Map.of(
                "username",
                name,
                "displayName",
                name,
                "password",
                "worker-test-password",
                "role",
                role),
            200)
        .get("id")
        .asLong();
  }

  int getAs(String user, String password, String path) throws Exception {
    return mvc.perform(get("/api" + path).with(httpBasic(user, password)))
        .andReturn()
        .getResponse()
        .getStatus();
  }

  @Test
  void adminCreatesUsersButOperatorCannotEscalate() throws Exception {
    user("worker", "OPERATOR");
    user("reviewer", "AUDITOR");
    assertEquals(200, getAs("worker", "worker-test-password", "/inventory"));
    postAs("worker", "worker-test-password", "/users", Map.of("username", "intruder"), 403);
    postAs("worker", "worker-test-password", "/products", Map.of("sku", "UNAUTHORIZED"), 403);
    postAs("reviewer", "worker-test-password", "/putaway", Map.of(), 403);
    assertEquals(
        0,
        sql.queryForObject(
            "select count(*) from products where sku='UNAUTHORIZED'", Integer.class));
    assertEquals(
        3,
        sql.queryForObject(
            "select count(*) from access_audit where event='ACCESS_DENIED'", Integer.class));
  }

  @Test
  void passwordHashesNeverLeaveUserApi() throws Exception {
    long id = user("worker", "OPERATOR");
    String body =
        mvc.perform(get("/api/users").with(httpBasic("rbac-admin", "admin-test-password")))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertFalse(body.contains("passwordHash"));
    assertFalse(body.contains("worker-test-password"));
    String hash =
        sql.queryForObject("select password_hash from app_users where id=?", String.class, id);
    assertTrue(hash.startsWith("{bcrypt}"));
    assertNotEquals("worker-test-password", hash);
  }

  @Test
  void deactivationRevokesExistingCredentialsImmediately() throws Exception {
    long id = user("worker", "OPERATOR");
    assertEquals(200, getAs("worker", "worker-test-password", "/inventory"));
    admin(
        "/users/" + id, Map.of("displayName", "Worker", "role", "OPERATOR", "active", false), 200);
    assertEquals(401, getAs("worker", "worker-test-password", "/inventory"));
  }

  @Test
  void resetAndRoleChangeTakeEffectOnNextRequest() throws Exception {
    long id = user("worker", "OPERATOR");
    admin("/users/" + id + "/password", Map.of("password", "replacement-password"), 200);
    assertEquals(401, getAs("worker", "worker-test-password", "/inventory"));
    assertEquals(200, getAs("worker", "replacement-password", "/inventory"));
    admin(
        "/users/" + id, Map.of("displayName", "Reviewer", "role", "AUDITOR", "active", true), 200);
    postAs("worker", "replacement-password", "/sales-orders/999/allocate", Map.of(), 403);
  }

  @Test
  void repeatedFailuresLockAccountUntilAdminUnlocks() throws Exception {
    long id = user("worker", "OPERATOR");
    for (int i = 0; i < 5; i++) assertEquals(401, getAs("worker", "wrong", "/auth/me"));
    assertEquals(401, getAs("worker", "worker-test-password", "/auth/me"));
    admin("/users/" + id + "/unlock", Map.of(), 200);
    assertEquals(200, getAs("worker", "worker-test-password", "/auth/me"));
    assertEquals(
        1,
        sql.queryForObject(
            "select count(*) from access_audit where event='ACCOUNT_LOCKED'", Integer.class));
  }

  @Test
  void administratorCannotRemoveOwnAccess() throws Exception {
    long id =
        sql.queryForObject("select id from app_users where username='rbac-admin'", Long.class);
    admin("/users/" + id, Map.of("displayName", "Admin", "role", "OPERATOR", "active", true), 409);
    admin("/users/" + id, Map.of("displayName", "Admin", "role", "ADMIN", "active", false), 409);
    assertEquals(200, getAs("rbac-admin", "admin-test-password", "/users"));
  }

  @Test
  void bootstrapDoesNotResetExistingAccounts() throws Exception {
    long id =
        sql.queryForObject("select id from app_users where username='rbac-admin'", Long.class);
    admin("/users/" + id + "/password", Map.of("password", "replacement-admin-pass"), 200);
    accounts.bootstrap("rbac-admin", "admin-test-password");
    assertEquals(200, getAs("rbac-admin", "replacement-admin-pass", "/inventory"));
  }

  @Test
  void operatorCanReceiveAndLedgerRecordsTheirIdentity() throws Exception {
    user("worker", "OPERATOR");
    admin("/demo/seed", Map.of(), 200);
    long product = sql.queryForObject("select id from products where barcode='WM101'", Long.class);
    long id =
        admin(
                "/mock-erp/purchase-orders",
                Map.of(
                    "reference",
                    "RBAC-" + UUID.randomUUID(),
                    "partner",
                    "Supplier",
                    "lines",
                    List.of(Map.of("productId", product, "quantity", 5))),
                200)
            .get("id")
            .asLong();
    postAs(
        "worker",
        "worker-test-password",
        "/purchase-orders/" + id + "/receive",
        Map.of(
            "barcode",
            "WM101",
            "locationCode",
            "RECV-01",
            "quantity",
            5,
            "operationKey",
            UUID.randomUUID().toString()),
        200);
    assertTrue(
        sql.queryForObject(
                "select count(*) from stock_transactions where actor='worker'", Integer.class)
            > 0);
  }
}
