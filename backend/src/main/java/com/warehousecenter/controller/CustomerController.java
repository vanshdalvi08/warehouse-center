package com.warehousecenter.controller;

import com.warehousecenter.dto.CustomerRequests.*;
import com.warehousecenter.service.WorkflowService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customer")
public class CustomerController {
  private final WorkflowService workflow;
  public CustomerController(WorkflowService workflow) { this.workflow = workflow; }
  @GetMapping("/catalog")
  public List<CatalogItem> catalog() { return workflow.customerCatalog(); }
  @PostMapping("/orders")
  public Confirmation order(@Valid @RequestBody Order request) { return workflow.customerOrder(request); }
}
