package com.warehousecenter.repository;

import com.warehousecenter.entity.AppUser;
import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
  Optional<AppUser> findByUsername(String username);

  boolean existsByUsername(String username);

  long countByActiveTrueAndRole(String role);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select u from AppUser u where u.username=:username")
  Optional<AppUser> lockByUsername(String username);
}
