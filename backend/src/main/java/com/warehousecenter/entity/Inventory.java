package com.warehousecenter.entity;

import jakarta.persistence.*;

@org.hibernate.annotations.Check(
    constraints = "quantity >= 0 and reserved >= 0 and reserved <= quantity")
@Entity
@Table(
    name = "inventory",
    uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "location_id"}))
public class Inventory {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "product_id")
  public Product product;

  @ManyToOne(optional = false)
  @JoinColumn(name = "location_id")
  public Location location;

  @Column(nullable = false)
  public Integer quantity = 0;

  @Column(nullable = false, columnDefinition = "integer default 0")
  public int reserved = 0;

  public int getAvailable() {
    return quantity - reserved;
  }

  @Version public Long version;

  public Inventory() {}
}
