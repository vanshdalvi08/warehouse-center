package com.warehousecenter.repository;

import com.warehousecenter.entity.WarehouseOrder;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<WarehouseOrder, Long> {
  boolean existsByReference(String reference);
  java.util.Optional<WarehouseOrder> findByReference(String reference);
}
