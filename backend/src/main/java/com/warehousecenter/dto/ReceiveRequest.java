package com.warehousecenter.dto;

import jakarta.validation.constraints.*;

public record ReceiveRequest(
    @NotBlank String barcode, @NotBlank String locationCode, @NotNull @Min(1) Integer quantity) {}
