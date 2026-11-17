package com.warehousecenter.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "access_audit")
public class AccessAudit {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(nullable = false)
  public String event;

  @Column(nullable = false, length = 100)
  public String actor;

  @Column(length = 100)
  public String target;

  @Column(length = 500)
  public String detail;

  public Instant createdAt = Instant.now();
}
