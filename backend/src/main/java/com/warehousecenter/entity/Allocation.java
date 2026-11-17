package com.warehousecenter.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "allocations")
public class Allocation {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @ManyToOne(optional = false)
  public WarehouseOrder warehouseOrder;

  @ManyToOne(optional = false)
  public OrderLine line;

  @ManyToOne(optional = false)
  public Inventory inventory;

  public int quantity;
  public boolean picked = false;
  public boolean shipped = false;
}
