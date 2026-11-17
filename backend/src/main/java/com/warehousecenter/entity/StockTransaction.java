package com.warehousecenter.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "stock_transactions")
public class StockTransaction {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(nullable = false)
  public String type;

  @Column(nullable = false)
  public String sku;

  @Column(nullable = false)
  public String locationCode;

  @Column(nullable = false)
  public Integer quantity;

  @Column(nullable = false)
  public Instant createdAt = Instant.now();

  public String sourceLocation;
  public String destinationLocation;
  public String reference;
  public String actor = "local-demo-operator";
  public String device = "browser-or-keyboard-scanner";
  public String correlationKey;

  public StockTransaction() {}

  public StockTransaction(String type, String sku, String locationCode, int quantity) {
    this.type = type;
    this.sku = sku;
    this.locationCode = locationCode;
    this.quantity = quantity;
  }
}
