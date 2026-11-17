package com.warehousecenter.repository;

import com.warehousecenter.entity.Inventory;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {
  Optional<Inventory> findByProductIdAndLocationId(Long productId, Long locationId);
}
