package com.warehousecenter.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "operation_receipts")
public class OperationReceipt {
  @Id
  @Column(length = 100)
  public String id;

  @Column(nullable = false, length = 2000)
  public String fingerprint;
}
