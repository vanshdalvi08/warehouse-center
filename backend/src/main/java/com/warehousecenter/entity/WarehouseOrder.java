package com.warehousecenter.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "warehouse_orders")
public class WarehouseOrder {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(nullable = false, unique = true)
  public String reference;

  @Column(nullable = false)
  public String kind;

  @Column(nullable = false)
  public String status = "OPEN";

  public String partner;

  @Column(nullable = false, columnDefinition = "varchar(30) default 'ERP'")
  public String source = "ERP";

  @Column(unique = true)
  public String cartonBarcode;

  public Instant createdAt = Instant.now();

  @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
  @JoinColumn(name = "order_id")
  @OrderBy("id ASC")
  public List<OrderLine> lines = new ArrayList<>();

  @Version public Long version;
}
