package com.warehousecenter.dto;

import jakarta.validation.constraints.*;

public class UserRequests {
  public record Create(
      @NotBlank @Pattern(regexp = "[A-Za-z0-9._-]{3,60}") String username,
      @NotBlank @Size(max = 100) String displayName,
      @NotBlank @Size(min = 12, max = 64) String password,
      @NotBlank @Pattern(regexp = "ADMIN|SUPERVISOR|WAREHOUSE_OPERATOR") String role) {}

  public record Update(
      @NotBlank @Size(max = 100) String displayName,
      @NotBlank @Pattern(regexp = "ADMIN|SUPERVISOR|WAREHOUSE_OPERATOR") String role,
      @NotNull Boolean active) {}

  public record Password(@NotBlank @Size(min = 12, max = 64) String password) {}
}
