package com.warehousecenter.repository;

import com.warehousecenter.entity.ErpMessage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ErpMessageRepository extends JpaRepository<ErpMessage, Long> {}
