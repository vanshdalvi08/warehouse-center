package com.warehousecenter.controller;

import com.warehousecenter.dto.WorkflowRequests.*;
import com.warehousecenter.entity.*;
import com.warehousecenter.repository.*;
import com.warehousecenter.service.WorkflowService;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class WorkflowController {
  private final WorkflowService service;
  private final OrderRepository orders;
  private final AllocationRepository allocations;
  private final ErpMessageRepository messages;

  public WorkflowController(
      WorkflowService s, OrderRepository o, AllocationRepository a, ErpMessageRepository m) {
    service = s;
    orders = o;
    allocations = a;
    messages = m;
  }

  @GetMapping("/purchase-orders")
  public List<WarehouseOrder> purchases() {
    return orders.findAll().stream().filter(o -> o.kind.equals("PURCHASE")).toList();
  }

  @GetMapping("/sales-orders")
  public List<WarehouseOrder> sales() {
    return orders.findAll().stream().filter(o -> o.kind.equals("SALES")).toList();
  }

  @PostMapping("/mock-erp/purchase-orders")
  public WarehouseOrder purchase(@Valid @RequestBody Order r) {
    return service.create("PURCHASE", r);
  }

  @PostMapping("/mock-erp/sales-orders")
  public WarehouseOrder sale(@Valid @RequestBody Order r) {
    return service.create("SALES", r);
  }

  @PostMapping("/purchase-orders/{id}/receive")
  public WarehouseOrder receive(@PathVariable Long id, @Valid @RequestBody Receive r) {
    return service.receive(id, r);
  }

  @PostMapping("/putaway")
  public Map<String, String> move(@Valid @RequestBody Move r) {
    return service.move(r);
  }

  @PostMapping("/sales-orders/{id}/allocate")
  public WarehouseOrder allocate(@PathVariable Long id) {
    return service.allocate(id);
  }

  @GetMapping("/sales-orders/{id}/tasks")
  public List<Allocation> tasks(@PathVariable Long id) {
    return allocations.findByWarehouseOrderIdOrderByIdAsc(id);
  }

  @PostMapping("/pick-tasks/{id}/confirm")
  public WarehouseOrder pick(@PathVariable Long id, @Valid @RequestBody Pick r) {
    return service.pick(id, r);
  }

  @PostMapping("/sales-orders/{id}/pack")
  public WarehouseOrder pack(@PathVariable Long id, @Valid @RequestBody Pack r) {
    return service.pack(id, r);
  }

  @PostMapping("/sales-orders/{id}/dispatch")
  public WarehouseOrder dispatch(@PathVariable Long id, @Valid @RequestBody Dispatch r) {
    return service.dispatch(id, r);
  }

  @GetMapping("/erp-messages")
  public List<ErpMessage> messages() {
    return messages.findAll();
  }

  @PostMapping("/erp-messages/{id}/acknowledge")
  public ErpMessage ack(@PathVariable Long id, @RequestBody Acknowledge r) {
    return service.acknowledge(id, r.fail());
  }

  @PostMapping("/locations/{id}/state")
  public Location state(@PathVariable Long id, @Valid @RequestBody LocationState r) {
    return service.setLocation(id, r.active());
  }

  @PostMapping("/demo/seed")
  public Map<String, String> seed() {
    return service.seed();
  }
}
