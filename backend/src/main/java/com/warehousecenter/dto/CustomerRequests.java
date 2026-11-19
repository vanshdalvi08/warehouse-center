package com.warehousecenter.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;

public class CustomerRequests {
  public record Line(@NotNull Long productId, @Min(1) @Max(10000) int quantity) {}
  public record Order(@NotNull UUID requestId, @NotBlank @Size(max=200) String customerName,
      @NotEmpty @Size(max=20) List<@Valid Line> lines) {}
  public record CatalogItem(Long id, String sku, String name, int available) {}
  public record Confirmation(String reference, String status) {}
}
