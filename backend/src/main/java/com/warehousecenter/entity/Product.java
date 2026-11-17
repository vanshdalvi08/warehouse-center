package com.warehousecenter.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity
@Table(name = "products")
public class Product {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @NotBlank
  @Size(max = 100)
  @Column(nullable = false, unique = true)
  public String sku;

  @NotBlank
  @Size(max = 100)
  @Column(nullable = false)
  public String name;

  @NotBlank
  @Size(max = 100)
  @Column(nullable = false, unique = true)
  public String barcode;

  public Product() {}
}
