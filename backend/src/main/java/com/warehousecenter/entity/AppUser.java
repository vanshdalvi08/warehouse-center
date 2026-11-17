package com.warehousecenter.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "app_users")
public class AppUser {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(nullable = false, unique = true, length = 60)
  public String username;

  @Column(nullable = false, length = 100)
  public String displayName;

  @JsonIgnore
  @Column(nullable = false)
  public String passwordHash;

  @Column(nullable = false, length = 20)
  public String role;

  @Column(nullable = false)
  public boolean active = true;

  @JsonIgnore public int failedAttempts;
  public Instant lockedUntil;
  public Instant createdAt = Instant.now();
  @Version public Long version;
}
