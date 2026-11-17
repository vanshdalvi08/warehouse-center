package com.warehousecenter.controller;

import java.security.Principal;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AccessController {
  private final boolean enabled;

  public AccessController(@Value("${app.security.enabled:false}") boolean enabled) {
    this.enabled = enabled;
  }

  @GetMapping("/status")
  public Map<String, Boolean> status() {
    return Map.of("enabled", enabled);
  }

  @GetMapping("/me")
  public Map<String, String> me(Principal principal) {
    return Map.of("username", principal == null ? "local-demo-operator" : principal.getName());
  }
}
