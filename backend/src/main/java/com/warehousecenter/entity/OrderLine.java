package com.warehousecenter.entity;

import jakarta.persistence.*;

@org.hibernate.annotations.Check(
    constraints = "quantity > 0 and received >= 0 and received <= quantity")
@Entity
@Table(name = "order_lines")
public class OrderLine {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @ManyToOne(optional = false)
  public Product product;

  @Column(nullable = false)
  public int quantity;

  public int received = 0;
}
