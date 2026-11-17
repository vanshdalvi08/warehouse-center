package com.warehousecenter.config;

import com.warehousecenter.service.AccountService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
  @Bean
  SecurityFilterChain security(
      HttpSecurity http,
      DatabaseAuthenticationProvider provider,
      AccountService accounts,
      @Value("${app.security.enabled:true}") boolean enabled,
      org.springframework.core.env.Environment environment)
      throws Exception {
    if (!enabled && java.util.Arrays.asList(environment.getActiveProfiles()).contains("cloud")) {
      throw new IllegalStateException("Authentication cannot be disabled in the cloud profile");
    }
    AuthenticationEntryPoint rejected =
        (request, response, error) -> {
          response.setStatus(401);
          response.setContentType("application/json");
          response
              .getWriter()
              .write(
                  "{\"message\":\"Invalid credentials or account unavailable. Contact an administrator if locked.\"}");
        };
    http.authenticationProvider(provider)
        .cors(cors -> {})
        .csrf(csrf -> csrf.disable())
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .requestCache(cache -> cache.disable())
        .formLogin(form -> form.disable())
        .logout(logout -> logout.disable())
        .exceptionHandling(
            errors ->
                errors
                    .authenticationEntryPoint(rejected)
                    .accessDeniedHandler(
                        (request, response, error) -> {
                          var user =
                              org.springframework.security.core.context.SecurityContextHolder
                                  .getContext()
                                  .getAuthentication();
                          accounts.denied(
                              user == null ? "anonymous" : user.getName(),
                              request.getMethod() + " " + request.getRequestURI());
                          response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                          response.setContentType("application/json");
                          response
                              .getWriter()
                              .write("{\"message\":\"Your role does not allow this operation\"}");
                        }))
        .httpBasic(basic -> basic.authenticationEntryPoint(rejected))
        .authorizeHttpRequests(
            auth -> {
              auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll();
              auth.requestMatchers(HttpMethod.GET, "/api/health", "/api/auth/status").permitAll();
              if (!enabled) {
                auth.anyRequest().permitAll();
                return;
              }
              auth.requestMatchers(HttpMethod.GET, "/api/users/audit")
                  .hasAnyRole("ADMIN", "AUDITOR");
              auth.requestMatchers("/api/users", "/api/users/**").hasRole("ADMIN");
              auth.requestMatchers(HttpMethod.POST, "/api/auth/sign-out").authenticated();
              auth.requestMatchers(
                      HttpMethod.POST,
                      "/api/purchase-orders/*/receive",
                      "/api/putaway",
                      "/api/sales-orders/*/allocate",
                      "/api/pick-tasks/*/confirm",
                      "/api/sales-orders/*/pack",
                      "/api/sales-orders/*/dispatch")
                  .hasAnyRole("ADMIN", "OPERATOR");
              auth.requestMatchers(
                      HttpMethod.POST,
                      "/api/products",
                      "/api/locations",
                      "/api/locations/*/state",
                      "/api/mock-erp/**",
                      "/api/demo/seed",
                      "/api/erp-messages/*/acknowledge",
                      "/api/receive")
                  .hasRole("ADMIN");
              auth.requestMatchers(HttpMethod.GET, "/api/**").authenticated();
              auth.anyRequest().denyAll();
            });
    return http.build();
  }
}
