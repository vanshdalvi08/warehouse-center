package com.warehousecenter;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "app.security.enabled=true",
      "app.security.username=test-operator",
      "app.security.password=test-password-for-suite"
    })
@AutoConfigureMockMvc
class SecurityIntegrationTest {
  @DynamicPropertySource
  static void database(DynamicPropertyRegistry r) {
    WorkflowIntegrationTest.database(r);
  }

  @Autowired MockMvc mvc;

  @Test
  void healthAndAccessStatusArePublic() throws Exception {
    mvc.perform(get("/api/health")).andExpect(status().isOk());
    mvc.perform(get("/api/auth/status"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.enabled").value(true));
  }

  @Test
  void inventoryAndWritesRequireAuthentication() throws Exception {
    mvc.perform(get("/api/inventory")).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/demo/seed")).andExpect(status().isUnauthorized());
  }

  @Test
  void customerCatalogIsPublicButWarehouseAndOrderListsRemainPrivate() throws Exception {
    mvc.perform(get("/api/customer/catalog")).andExpect(status().isOk());
    mvc.perform(get("/api/sales-orders")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/customer/orders")).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/customer/orders").contentType("application/json").content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void validCredentialsWorkAndWrongPasswordIsRejected() throws Exception {
    mvc.perform(get("/api/auth/me").with(httpBasic("test-operator", "test-password-for-suite")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value("test-operator"));
    mvc.perform(get("/api/inventory").with(httpBasic("test-operator", "wrong")))
        .andExpect(status().isUnauthorized());
    mvc.perform(get("/api/inventory").with(httpBasic("test-operator", "test-password-for-suite")))
        .andExpect(status().isOk());
  }

  @Test
  void foreignOriginIsNotAllowed() throws Exception {
    mvc.perform(
            options("/api/inventory")
                .header("Origin", "https://untrusted.example")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "Authorization"))
        .andExpect(status().isForbidden());
  }

  @Test
  void selectedLoginRoleMustMatchTheDatabaseAssignment() throws Exception {
    mvc.perform(
            get("/api/auth/me")
                .param("role", "ADMIN")
                .with(httpBasic("test-operator", "test-password-for-suite")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.role").value("ADMIN"));
    mvc.perform(
            get("/api/auth/me")
                .param("role", "SUPERVISOR")
                .with(httpBasic("test-operator", "test-password-for-suite")))
        .andExpect(status().isForbidden())
        .andExpect(
            jsonPath("$.message")
                .value(
                    "This account is not assigned to the selected role. Choose the correct role and try again."));
  }

  @Test
  void unsupportedLoginRoleIsRejected() throws Exception {
    mvc.perform(
            get("/api/auth/me")
                .param("role", "UNKNOWN")
                .with(httpBasic("test-operator", "test-password-for-suite")))
        .andExpect(status().isBadRequest());
  }
}
