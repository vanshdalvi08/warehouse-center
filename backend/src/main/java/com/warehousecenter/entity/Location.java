package com.warehousecenter.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity
@Table(name = "locations")
public class Location {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @NotBlank
  @Size(max = 100)
  @Column(nullable = false, unique = true)
  public String code;

  @NotBlank
  @Size(max = 100)
  @Column(nullable = false)
  public String description;

  @NotNull
  @Column(nullable = false)
  public Boolean active = true;

  @NotBlank
  @Pattern(regexp = "RECEIVING|STORAGE|PACKING")
  @Column(nullable = false, columnDefinition = "varchar(255) default 'STORAGE'")
  public String type = "STORAGE";

  @Min(1)
  @Column(nullable = false, columnDefinition = "integer default 10000")
  public int capacity = 10000;

  public Location() {}
}
