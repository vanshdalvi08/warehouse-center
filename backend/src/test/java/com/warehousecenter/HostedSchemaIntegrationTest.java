package com.warehousecenter;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "app.security.username=test-operator",
      "app.security.password=test-password-for-suite",
      "app.cors.allowed-origins=http://127.0.0.1:5173",
      "spring.jpa.properties.hibernate.default_schema=warehouse_hosted_test",
      "spring.jpa.properties.hibernate.hbm2ddl.create_namespaces=true"
    })
@ActiveProfiles("cloud")
@AutoConfigureMockMvc
class HostedSchemaIntegrationTest {
  @DynamicPropertySource
  static void database(DynamicPropertyRegistry r) {
    WorkflowIntegrationTest.database(r);
  }

  @Autowired MockMvc mvc;
  @Autowired JdbcTemplate sql;

  @Test
  void authenticatedApiWritesIntoThePrivateSchema() throws Exception {
    mvc.perform(
            post("/api/products")
                .with(httpBasic("test-operator", "test-password-for-suite"))
                .contentType("application/json")
                .content(
                    "{\"sku\":\"HOSTED-CHECK\",\"name\":\"Schema preflight\",\"barcode\":\"HOSTED-CHECK\"}"))
        .andExpect(status().isCreated());
    assertEquals(
        1,
        sql.queryForObject(
            "select count(*) from warehouse_hosted_test.products where sku='HOSTED-CHECK'",
            Integer.class));
    for (String table :
        new String[] {"products", "inventory", "warehouse_orders", "stock_transactions"}) {
      assertEquals(
          1,
          sql.queryForObject(
              "select count(*) from information_schema.tables where table_schema='warehouse_hosted_test' and table_name=?",
              Integer.class,
              table));
    }
    mvc.perform(get("/api/inventory")).andExpect(status().isUnauthorized());
  }
}
