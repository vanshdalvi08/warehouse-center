package com.warehousecenter.service;

import com.warehousecenter.dto.UserRequests.*;
import com.warehousecenter.entity.*;
import com.warehousecenter.repository.*;
import jakarta.persistence.EntityManager;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountService {
  private final AppUserRepository users;
  private final AccessAuditRepository events;
  private final EntityManager em;
  private final PasswordEncoder encoder =
      PasswordEncoderFactories.createDelegatingPasswordEncoder();
  private final String dummy = encoder.encode("unused-timing-comparison-password");

  public AccountService(AppUserRepository users, AccessAuditRepository events, EntityManager em) {
    this.users = users;
    this.events = events;
    this.em = em;
  }

  private void lock() {
    em.createNativeQuery("SELECT 1 FROM pg_advisory_xact_lock(8202602)").getSingleResult();
  }

  private String actor() {
    var a = SecurityContextHolder.getContext().getAuthentication();
    return a == null ? "system" : a.getName();
  }

  private void check(boolean valid, String message) {
    if (!valid) throw new ResponseStatusException(HttpStatus.CONFLICT, message);
  }

  private String hash(String password) {
    check(
        password.length() >= 12
            && password.length() <= 64
            && password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length <= 72,
        "Use a password of 12-64 characters and at most 72 UTF-8 bytes");
    return encoder.encode(password);
  }

  private void event(String type, String actor, String target, String detail) {
    AccessAudit e = new AccessAudit();
    e.event = type;
    e.actor = actor.length() > 100 ? actor.substring(0, 100) : actor;
    e.target = target;
    e.detail = detail;
    events.save(e);
  }

  @Transactional
  public void bootstrap(String username, String password) {
    lock();
    if (users.count() > 0) return;
    check(username.matches("[a-z0-9._-]{3,60}"), "Invalid bootstrap administrator username");
    AppUser u = new AppUser();
    u.username = username;
    u.displayName = "System Administrator";
    u.role = "ADMIN";
    u.passwordHash = hash(password);
    users.save(u);
    event("USER_BOOTSTRAPPED", "system", u.username, "Initial administrator created");
  }

  @Transactional
  public AppUser create(Create r) {
    lock();
    String username = r.username().toLowerCase(Locale.ROOT);
    check(!users.existsByUsername(username), "Username already exists");
    AppUser u = new AppUser();
    u.username = username;
    u.displayName = r.displayName().trim();
    u.role = r.role();
    u.passwordHash = hash(r.password());
    users.save(u);
    event("USER_CREATED", actor(), u.username, "Role " + u.role);
    return u;
  }

  @Transactional
  public AppUser update(Long id, Update r) {
    lock();
    AppUser u =
        users
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    check(
        !u.username.equals(actor()) || (r.active() && r.role().equals("ADMIN")),
        "You cannot deactivate or demote your own administrator account");
    if (u.active && u.role.equals("ADMIN") && (!r.active() || !r.role().equals("ADMIN")))
      check(users.countByActiveTrueAndRole("ADMIN") > 1, "Keep at least one active administrator");
    String old = u.role + "/" + u.active;
    u.displayName = r.displayName().trim();
    u.role = r.role();
    u.active = r.active();
    event("USER_UPDATED", actor(), u.username, old + " -> " + u.role + "/" + u.active);
    return u;
  }

  @Transactional
  public void password(Long id, Password r) {
    lock();
    AppUser u =
        users
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    u.passwordHash = hash(r.password());
    u.failedAttempts = 0;
    u.lockedUntil = null;
    event("PASSWORD_RESET", actor(), u.username, "Password reset; prior credentials invalidated");
  }

  @Transactional
  public void unlock(Long id) {
    lock();
    AppUser u =
        users
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    u.failedAttempts = 0;
    u.lockedUntil = null;
    event("USER_UNLOCKED", actor(), u.username, "Lockout cleared by administrator");
  }

  public record Verification(AppUser user, String failure) {}

  @Transactional
  public Verification verify(String rawUsername, String password, boolean signIn) {
    String username = rawUsername.toLowerCase(Locale.ROOT);
    AppUser u = users.lockByUsername(username).orElse(null);
    String target = username.length() > 100 ? username.substring(0, 100) : username;
    if (u == null) {
      encoder.matches(
          password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
              ? "invalid-password"
              : password,
          dummy);
      event("LOGIN_FAILED", target, target, "Credentials rejected");
      return new Verification(null, "Invalid credentials");
    }
    if (!u.active) {
      event("LOGIN_FAILED", target, target, "Account inactive");
      return new Verification(null, "Account inactive");
    }
    if (u.lockedUntil != null && u.lockedUntil.isAfter(Instant.now())) {
      event("LOGIN_BLOCKED", target, target, "Account temporarily locked");
      return new Verification(null, "Account temporarily locked");
    }
    if (u.lockedUntil != null) {
      u.lockedUntil = null;
      u.failedAttempts = 0;
    }
    if (password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
        || !encoder.matches(password, u.passwordHash)) {
      u.failedAttempts++;
      if (u.failedAttempts >= 5) u.lockedUntil = Instant.now().plusSeconds(900);
      event(
          u.lockedUntil == null ? "LOGIN_FAILED" : "ACCOUNT_LOCKED",
          target,
          target,
          "Credentials rejected");
      return new Verification(null, "Invalid credentials");
    }
    if (u.failedAttempts > 0) u.failedAttempts = 0;
    if (signIn) event("LOGIN_SUCCEEDED", username, username, "Credentials verified");
    return new Verification(u, null);
  }

  @Transactional
  public void denied(String username, String path) {
    event("ACCESS_DENIED", username, username, path.length() > 500 ? path.substring(0, 500) : path);
  }

  @Transactional
  public void signedIn(String username) {
    event("LOGIN_SUCCEEDED", username, username, "Credentials verified");
  }

  @Transactional
  public void signOut() {
    event("SIGNED_OUT", actor(), actor(), "Client signed out");
  }
}
