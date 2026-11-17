package com.warehousecenter.controller;

import com.warehousecenter.repository.AppUserRepository;
import com.warehousecenter.service.AccountService;
import java.security.Principal;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AccessController {
  private final boolean enabled;
  private final AppUserRepository users;
  private final AccountService accounts;

  public AccessController(
      @Value("${app.security.enabled:true}") boolean enabled,
      AppUserRepository users,
      AccountService accounts) {
    this.enabled = enabled;
    this.users = users;
    this.accounts = accounts;
  }

  @GetMapping("/status")
  public Map<String, Boolean> status() {
    return Map.of("enabled", enabled);
  }

  @GetMapping("/me")
  public Map<String, Object> me(Principal principal) {
    if (principal == null)
      return Map.of(
          "username", "local-demo-operator", "displayName", "Local development", "role", "ADMIN");
    var user = users.findByUsername(principal.getName()).orElseThrow();
    accounts.signedIn(user.username);
    return Map.of(
        "id",
        user.id,
        "username",
        user.username,
        "displayName",
        user.displayName,
        "role",
        user.role);
  }

  @PostMapping("/sign-out")
  public Map<String, String> signOut() {
    accounts.signOut();
    return Map.of("message", "Signed out");
  }
}
