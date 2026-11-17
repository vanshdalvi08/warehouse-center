package com.warehousecenter.controller;

import com.warehousecenter.dto.UserRequests.*;
import com.warehousecenter.entity.*;
import com.warehousecenter.repository.*;
import com.warehousecenter.service.AccountService;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
  private final AppUserRepository users;
  private final AccessAuditRepository audit;
  private final AccountService service;

  public UserController(
      AppUserRepository users, AccessAuditRepository audit, AccountService service) {
    this.users = users;
    this.audit = audit;
    this.service = service;
  }

  @GetMapping
  public List<AppUser> users() {
    return users.findAll(org.springframework.data.domain.Sort.by("id"));
  }

  @GetMapping("/audit")
  public List<AccessAudit> audit() {
    return audit.findTop200ByOrderByIdDesc();
  }

  @PostMapping
  public AppUser create(@Valid @RequestBody Create r) {
    return service.create(r);
  }

  @PostMapping("/{id}")
  public AppUser update(@PathVariable Long id, @Valid @RequestBody Update r) {
    return service.update(id, r);
  }

  @PostMapping("/{id}/password")
  public Map<String, String> password(@PathVariable Long id, @Valid @RequestBody Password r) {
    service.password(id, r);
    return Map.of("message", "Password reset");
  }

  @PostMapping("/{id}/unlock")
  public Map<String, String> unlock(@PathVariable Long id) {
    service.unlock(id);
    return Map.of("message", "Account unlocked");
  }
}
