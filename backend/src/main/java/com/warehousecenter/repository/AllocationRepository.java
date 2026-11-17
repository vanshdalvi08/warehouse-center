package com.warehousecenter.repository;

import com.warehousecenter.entity.Allocation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AllocationRepository extends JpaRepository<Allocation, Long> {
  java.util.List<Allocation> findByWarehouseOrderIdOrderByIdAsc(Long id);
}
