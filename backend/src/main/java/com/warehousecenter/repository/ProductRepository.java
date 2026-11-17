package com.warehousecenter.repository;

import com.warehousecenter.entity.Product;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {
  Optional<Product> findByBarcode(String barcode);
}
