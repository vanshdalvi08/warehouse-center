package com.warehousecenter.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "erp_messages")
public class ErpMessage {
  @OneToOne
  @JoinColumn(name = "stock_transaction_id", unique = true)
  public StockTransaction transaction;

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(unique = true, nullable = false)
  public String transactionKey;

  public String type;
  public String reference;
  public String status = "PENDING";
  public int attempts = 0;
  public String error;
  public Instant createdAt = Instant.now();
  public Instant acknowledgedAt;
}
