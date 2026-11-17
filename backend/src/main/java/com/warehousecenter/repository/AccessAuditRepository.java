package com.warehousecenter.repository;

import com.warehousecenter.entity.AccessAudit;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccessAuditRepository extends JpaRepository<AccessAudit, Long> {
  List<AccessAudit> findTop200ByOrderByIdDesc();
}
