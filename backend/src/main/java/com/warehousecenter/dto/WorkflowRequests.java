package com.warehousecenter.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public class WorkflowRequests {
  public record Line(@NotNull Long productId, @Min(1) int quantity) {}

  public record Order(
      @NotBlank @Size(max = 100) String reference,
      @NotBlank @Size(max = 200) String partner,
      @NotEmpty List<@Valid Line> lines) {}

  public record Receive(
      @NotBlank @Size(max = 100) String barcode,
      @NotBlank @Size(max = 100) String locationCode,
      @Min(1) int quantity,
      @NotBlank @Size(max = 100) String operationKey) {}

  public record Move(
      @NotBlank @Size(max = 100) String barcode,
      @NotBlank @Size(max = 100) String sourceCode,
      @NotBlank @Size(max = 100) String destinationCode,
      @Min(1) int quantity,
      @NotBlank @Size(max = 100) String operationKey) {}

  public record Pick(
      @NotBlank @Size(max = 100) String barcode,
      @NotBlank @Size(max = 100) String sourceCode,
      @NotBlank @Size(max = 100) String packingCode,
      @Min(1) int quantity) {}

  public record Scan(@NotBlank @Size(max = 100) String barcode, @Min(1) int quantity) {}

  public record Pack(
      @NotBlank @Size(max = 100) String cartonBarcode, @NotEmpty List<@Valid Scan> scans) {}

  public record Dispatch(@NotBlank @Size(max = 100) String cartonBarcode) {}

  public record LocationState(@NotNull Boolean active) {}

  public record Acknowledge(boolean fail) {}
}
