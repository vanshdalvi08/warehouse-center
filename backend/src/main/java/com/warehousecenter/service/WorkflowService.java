package com.warehousecenter.service;

import com.warehousecenter.dto.WorkflowRequests.*;
import com.warehousecenter.entity.*;
import com.warehousecenter.repository.*;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class WorkflowService {
  private final ProductRepository products;
  private final LocationRepository locations;
  private final InventoryRepository inventory;
  private final StockTransactionRepository ledger;
  private final OrderRepository orders;
  private final AllocationRepository allocations;
  private final ErpMessageRepository messages;
  private final OperationReceiptRepository receipts;
  private final EntityManager em;

  public WorkflowService(
      ProductRepository p,
      LocationRepository l,
      InventoryRepository i,
      StockTransactionRepository t,
      OrderRepository o,
      AllocationRepository a,
      ErpMessageRepository m,
      OperationReceiptRepository r,
      EntityManager e) {
    products = p;
    locations = l;
    inventory = i;
    ledger = t;
    orders = o;
    allocations = a;
    messages = m;
    receipts = r;
    em = e;
  }

  // One transaction lock per demo warehouse also protects absent inventory rows and cross-order
  // reservation races.
  private void lock() {
    em.createNativeQuery("SELECT 1 FROM pg_advisory_xact_lock(8202601)").getSingleResult();
  }

  private void check(boolean ok, String message) {
    if (!ok) throw new ResponseStatusException(HttpStatus.CONFLICT, message);
  }

  private <T> T missing(Optional<T> value, String message) {
    return value.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, message));
  }

  private Product product(String barcode) {
    return missing(products.findByBarcode(barcode), "Unknown product barcode");
  }

  private Location location(String code, String type) {
    Location l = missing(locations.findByCode(code), "Unknown location: " + code);
    check(l.active, "Location is blocked: " + code);
    if (type != null) check(type.equals(l.type), "Expected " + type + " location: " + code);
    return l;
  }

  private Inventory row(Product p, Location l) {
    return inventory
        .findByProductIdAndLocationId(p.id, l.id)
        .orElseGet(
            () -> {
              Inventory i = new Inventory();
              i.product = p;
              i.location = l;
              return inventory.save(i);
            });
  }

  private Inventory existing(Product p, Location l) {
    return missing(
        inventory.findByProductIdAndLocationId(p.id, l.id), "No stock at source location");
  }

  private void capacity(Location l, int quantity) {
    long used =
        inventory.findAll().stream()
            .filter(i -> i.location.id.equals(l.id))
            .mapToLong(i -> i.quantity)
            .sum();
    check(used + quantity <= l.capacity, "Destination capacity exceeded");
  }

  private boolean replay(String key, String fingerprint) {
    var old = receipts.findById(key);
    if (old.isPresent()) {
      check(
          old.get().fingerprint.equals(fingerprint),
          "Operation key was already used for a different request");
      return true;
    }
    OperationReceipt r = new OperationReceipt();
    r.id = key;
    r.fingerprint = fingerprint;
    receipts.save(r);
    return false;
  }

  private void log(
      String type, Product p, String from, String to, int qty, String ref, String key) {
    StockTransaction t =
        new StockTransaction(type, p.sku, to == null ? (from == null ? "PACKING" : from) : to, qty);
    t.sourceLocation = from;
    t.destinationLocation = to;
    t.reference = ref;
    t.correlationKey = key == null ? UUID.randomUUID().toString() : key;
    var actor =
        org.springframework.security.core.context.SecurityContextHolder.getContext()
            .getAuthentication();
    if (actor != null
        && actor.isAuthenticated()
        && !(actor
            instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
      t.actor = actor.getName();
    }
    ledger.save(t);
    ErpMessage m = new ErpMessage();
    m.transaction = t;
    m.transactionKey = UUID.randomUUID().toString();
    m.type = type;
    m.reference = ref;
    messages.save(m);
  }

  private WarehouseOrder order(Long id, String kind) {
    WarehouseOrder o = missing(orders.findById(id), "Order not found");
    check(kind.equals(o.kind), "Wrong order type");
    return o;
  }

  public WarehouseOrder create(String kind, Order r) {
    lock();
    check(!orders.existsByReference(r.reference()), "Order reference already imported");
    WarehouseOrder o = new WarehouseOrder();
    o.kind = kind;
    o.reference = r.reference();
    o.partner = r.partner();
    Set<Long> seen = new HashSet<>();
    for (Line x : r.lines()) {
      check(seen.add(x.productId()), "Combine duplicate product lines");
      OrderLine l = new OrderLine();
      l.product = missing(products.findById(x.productId()), "Product not found");
      l.quantity = x.quantity();
      o.lines.add(l);
    }
    return orders.save(o);
  }

  public List<com.warehousecenter.dto.CustomerRequests.CatalogItem> customerCatalog() {
    var stock = inventory.findAll();
    return products.findAll().stream().map(p ->
        new com.warehousecenter.dto.CustomerRequests.CatalogItem(p.id, p.sku, p.name,
            stock.stream().filter(i -> i.product.id.equals(p.id) && i.location.active && "STORAGE".equals(i.location.type))
                .mapToInt(Inventory::getAvailable).sum())).toList();
  }

  public com.warehousecenter.dto.CustomerRequests.Confirmation customerOrder(
      com.warehousecenter.dto.CustomerRequests.Order r) {
    lock();
    String reference = "WEB-" + r.requestId();
    String customer = r.customerName().trim();
    var existing = orders.findByReference(reference);
    if (existing.isPresent()) {
      var old = existing.get();
      check("CUSTOMER".equals(old.source) && customer.equals(old.partner)
          && old.lines.size() == r.lines().size()
          && new HashSet<>(r.lines()).size() == r.lines().size()
          && old.lines.stream().allMatch(l -> r.lines().stream().anyMatch(x -> l.product.id.equals(x.productId()) && l.quantity == x.quantity())),
          "Request identifier already used for a different order");
      return new com.warehousecenter.dto.CustomerRequests.Confirmation(old.reference, old.status);
    }
    var catalog = customerCatalog();
    for (var line : r.lines()) {
      var item = catalog.stream().filter(p -> p.id().equals(line.productId())).findFirst()
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
      check(item.available() >= line.quantity(), "Not enough available stock for " + item.sku() + ". Refresh availability and try again.");
    }
    var order = create("SALES", new Order(reference, customer,
        r.lines().stream().map(l -> new Line(l.productId(), l.quantity())).toList()));
    order.source = "CUSTOMER";
    return new com.warehousecenter.dto.CustomerRequests.Confirmation(order.reference, order.status);
  }

  public WarehouseOrder receive(Long id, Receive r) {
    lock();
    WarehouseOrder o = order(id, "PURCHASE");
    if (replay(
        r.operationKey(),
        "receive:" + id + ":" + r.barcode() + ":" + r.locationCode() + ":" + r.quantity()))
      return o;
    check(!o.status.equals("RECEIVED"), "Purchase order is already received");
    Product p = product(r.barcode());
    OrderLine l =
        o.lines.stream()
            .filter(x -> x.product.id.equals(p.id))
            .findFirst()
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.CONFLICT, "Barcode does not match this purchase order"));
    check(r.quantity() <= l.quantity - l.received, "Quantity exceeds remaining expected units");
    Location dest = location(r.locationCode(), "RECEIVING");
    capacity(dest, r.quantity());
    Inventory i = row(p, dest);
    i.quantity = Math.addExact(i.quantity, r.quantity());
    l.received += r.quantity();
    o.status = o.lines.stream().allMatch(x -> x.received == x.quantity) ? "RECEIVED" : "RECEIVING";
    log("RECEIVE", p, null, dest.code, r.quantity(), o.reference, r.operationKey());
    return o;
  }

  public Map<String, String> move(Move r) {
    lock();
    if (replay(
        r.operationKey(),
        "move:"
            + r.barcode()
            + ":"
            + r.sourceCode()
            + ":"
            + r.destinationCode()
            + ":"
            + r.quantity())) return Map.of("message", "Movement already completed");
    Product p = product(r.barcode());
    Location from = location(r.sourceCode(), null);
    check(!from.type.equals("PACKING"), "Packed stock is managed through its sales order");
    Location to = location(r.destinationCode(), "STORAGE");
    check(!from.id.equals(to.id), "Source and destination must differ");
    Inventory src = existing(p, from);
    check(src.getAvailable() >= r.quantity(), "Insufficient unreserved stock");
    capacity(to, r.quantity());
    Inventory dst = row(p, to);
    src.quantity -= r.quantity();
    dst.quantity = Math.addExact(dst.quantity, r.quantity());
    log(
        from.type.equals("RECEIVING") ? "PUTAWAY" : "TRANSFER",
        p,
        from.code,
        to.code,
        r.quantity(),
        "MOVE",
        r.operationKey());
    return Map.of("message", "Movement completed");
  }

  public WarehouseOrder allocate(Long id) {
    lock();
    WarehouseOrder o = order(id, "SALES");
    check(o.status.equals("OPEN"), "Only open orders can be allocated");
    for (OrderLine l : o.lines) {
      int remaining = l.quantity;
      List<Inventory> rows =
          inventory.findAll().stream()
              .filter(
                  i ->
                      i.product.id.equals(l.product.id)
                          && i.location.active
                          && i.location.type.equals("STORAGE")
                          && i.getAvailable() > 0)
              .sorted(Comparator.comparing(i -> i.id))
              .toList();
      for (Inventory i : rows) {
        int qty = Math.min(i.getAvailable(), remaining);
        if (qty <= 0) break;
        Allocation a = new Allocation();
        a.warehouseOrder = o;
        a.line = l;
        a.inventory = i;
        a.quantity = qty;
        allocations.save(a);
        i.reserved += qty;
        remaining -= qty;
        log("ALLOCATE", l.product, i.location.code, i.location.code, qty, o.reference, null);
      }
      check(
          remaining == 0,
          "Insufficient available storage stock for " + l.product.sku + "; allocation rolled back");
    }
    o.status = "ALLOCATED";
    return o;
  }

  public WarehouseOrder pick(Long allocationId, Pick r) {
    lock();
    Allocation a = missing(allocations.findById(allocationId), "Pick task not found");
    check(!a.picked, "Task already picked");
    check(
        Set.of("ALLOCATED", "PICKING").contains(a.warehouseOrder.status),
        "Order cannot be picked in current state");
    check(a.line.product.barcode.equals(r.barcode()), "Wrong item barcode");
    Inventory src = a.inventory;
    check(src.location.code.equals(r.sourceCode()), "Wrong source location scan");
    location(r.sourceCode(), "STORAGE");
    check(a.quantity == r.quantity(), "Pick the exact allocated task quantity");
    Location dest = location(r.packingCode(), "PACKING");
    capacity(dest, a.quantity);
    Inventory dst = row(a.line.product, dest);
    check(
        src.quantity >= a.quantity && src.reserved >= a.quantity, "Reserved stock is unavailable");
    src.quantity -= a.quantity;
    src.reserved -= a.quantity;
    dst.quantity = Math.addExact(dst.quantity, a.quantity);
    dst.reserved = Math.addExact(dst.reserved, a.quantity);
    a.inventory = dst;
    a.picked = true;
    allocations.saveAndFlush(a);
    List<Allocation> tasks = allocations.findByWarehouseOrderIdOrderByIdAsc(a.warehouseOrder.id);
    a.warehouseOrder.status = tasks.stream().allMatch(x -> x.picked) ? "PICKED" : "PICKING";
    log(
        "PICK",
        a.line.product,
        r.sourceCode(),
        dest.code,
        a.quantity,
        a.warehouseOrder.reference,
        null);
    return a.warehouseOrder;
  }

  public WarehouseOrder pack(Long id, Pack r) {
    lock();
    WarehouseOrder o = order(id, "SALES");
    check(o.status.equals("PICKED"), "All pick tasks must be completed before packing");
    check(
        orders.findAll().stream().noneMatch(x -> r.cartonBarcode().equals(x.cartonBarcode)),
        "Carton barcode already assigned");
    Map<String, Integer> scans = new HashMap<>();
    for (Scan s : r.scans())
      check(scans.put(s.barcode(), s.quantity()) == null, "Duplicate scanned product");
    check(scans.size() == o.lines.size(), "Verify every ordered product exactly once");
    for (OrderLine l : o.lines)
      check(
          Objects.equals(scans.get(l.product.barcode), l.quantity),
          "Packing barcode or quantity mismatch for " + l.product.sku);
    for (Allocation a : allocations.findByWarehouseOrderIdOrderByIdAsc(id)) {
      location(a.inventory.location.code, "PACKING");
    }
    o.cartonBarcode = r.cartonBarcode();
    o.status = "PACKED";
    for (OrderLine l : o.lines)
      log("PACK", l.product, null, null, l.quantity, o.reference, r.cartonBarcode());
    return o;
  }

  public WarehouseOrder dispatch(Long id, Dispatch r) {
    lock();
    WarehouseOrder o = order(id, "SALES");
    check(r.cartonBarcode().equals(o.cartonBarcode), "Wrong carton barcode");
    if (o.status.equals("SHIPPED")) return o;
    check(o.status.equals("PACKED"), "Pack and verify the order before dispatch");
    for (Allocation a : allocations.findByWarehouseOrderIdOrderByIdAsc(id)) {
      Inventory i = a.inventory;
      location(i.location.code, "PACKING");
      check(
          a.picked && !a.shipped && i.quantity >= a.quantity && i.reserved >= a.quantity,
          "Shipment stock is unavailable");
      i.quantity -= a.quantity;
      i.reserved -= a.quantity;
      a.shipped = true;
      log(
          "DISPATCH",
          a.line.product,
          i.location.code,
          null,
          a.quantity,
          o.reference,
          o.cartonBarcode);
    }
    o.status = "SHIPPED";
    return o;
  }

  public ErpMessage acknowledge(Long id, boolean fail) {
    lock();
    ErpMessage m = missing(messages.findById(id), "Message not found");
    if (m.status.equals("ACKNOWLEDGED")) return m;
    m.attempts++;
    m.status = fail ? "FAILED" : "ACKNOWLEDGED";
    m.error = fail ? "Simulated ERP unavailable; warehouse transaction remains committed" : null;
    m.acknowledgedAt = fail ? null : Instant.now();
    return m;
  }

  public Location setLocation(Long id, boolean active) {
    lock();
    Location l = missing(locations.findById(id), "Location not found");
    l.active = active;
    return l;
  }

  public Map<String, String> seed() {
    lock();
    if (products.findByBarcode("WM101").isEmpty()) {
      Product p = new Product();
      p.sku = "WM-101";
      p.name = "Wireless Mouse";
      p.barcode = "WM101";
      products.save(p);
    }
    for (String[] x :
        new String[][] {
          {"RECV-01", "Receiving dock", "RECEIVING"},
          {"A-01", "Aisle A / Rack 01 / Bin 01", "STORAGE"},
          {"PACK-01", "Packing and staging lane", "PACKING"}
        }) {
      if (locations.findByCode(x[0]).isEmpty()) {
        Location l = new Location();
        l.code = x[0];
        l.description = x[1];
        l.type = x[2];
        locations.save(l);
      }
    }
    return Map.of(
        "message", "Demo master data ready. Import a PO to start; no inventory was fabricated.");
  }
}
