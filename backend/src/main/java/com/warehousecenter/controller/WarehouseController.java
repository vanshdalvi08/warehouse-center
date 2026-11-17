package com.warehousecenter.controller;

import com.warehousecenter.dto.ReceiveRequest;
import com.warehousecenter.entity.*;
import com.warehousecenter.repository.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class WarehouseController {
  private final ProductRepository products;
  private final LocationRepository locations;
  private final InventoryRepository inventory;
  private final StockTransactionRepository transactions;

  public WarehouseController(
      ProductRepository p,
      LocationRepository l,
      InventoryRepository i,
      StockTransactionRepository t) {
    products = p;
    locations = l;
    inventory = i;
    transactions = t;
  }

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "ok", "application", "Warehouse Center");
  }

  @GetMapping("/products")
  public List<Product> products() {
    return products.findAll();
  }

  @ResponseStatus(HttpStatus.CREATED)
  @PostMapping("/products")
  public Product addProduct(@Valid @RequestBody Product p) {
    p.id = null;
    return products.save(p);
  }

  @GetMapping("/locations")
  public List<Location> locations() {
    return locations.findAll();
  }

  @ResponseStatus(HttpStatus.CREATED)
  @PostMapping("/locations")
  public Location addLocation(@Valid @RequestBody Location l) {
    l.id = null;
    return locations.save(l);
  }

  @GetMapping("/inventory")
  public List<Inventory> inventory() {
    return inventory.findAll();
  }

  @GetMapping("/transactions")
  public List<StockTransaction> transactions() {
    return transactions.findAll();
  }

  @PostMapping("/receive")
  public Inventory receive(@Valid @RequestBody ReceiveRequest r) {
    throw new org.springframework.web.server.ResponseStatusException(
        HttpStatus.CONFLICT, "Select a purchase order and use PO-validated receiving");
  }
}
