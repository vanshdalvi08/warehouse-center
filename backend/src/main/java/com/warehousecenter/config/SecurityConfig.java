package com.warehousecenter.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
  private final boolean enabled;
  private final String username;
  private final String password;

  public SecurityConfig(
      @Value("${app.security.enabled:false}") boolean enabled,
      @Value("${app.security.username:operator}") String username,
      @Value("${app.security.password:}") String password) {
    this.enabled = enabled;
    this.username = username;
    this.password = password;
    if (enabled && (username.isBlank() || password.length() < 12)) {
      throw new IllegalStateException(
          "Hosted access requires APP_USERNAME and an APP_PASSWORD of at least 12 characters");
    }
  }

  @Bean
  UserDetailsService users() {
    if (!enabled) return new InMemoryUserDetailsManager();
    return new InMemoryUserDetailsManager(
        User.withUsername(username)
            .password("{bcrypt}" + new BCryptPasswordEncoder().encode(password))
            .roles("OPERATOR")
            .build());
  }

  @Bean
  SecurityFilterChain security(HttpSecurity http) throws Exception {
    AuthenticationEntryPoint rejected =
        (request, response, error) -> {
          response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
          response.setContentType("application/json");
          response.getWriter().write("{\"message\":\"Sign in to access this workspace\"}");
        };
    http.cors(cors -> {})
        .csrf(csrf -> csrf.disable())
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .requestCache(cache -> cache.disable())
        .formLogin(form -> form.disable())
        .logout(logout -> logout.disable())
        .exceptionHandling(errors -> errors.authenticationEntryPoint(rejected))
        .httpBasic(basic -> basic.authenticationEntryPoint(rejected))
        .authorizeHttpRequests(
            auth -> {
              auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll();
              auth.requestMatchers(HttpMethod.GET, "/api/health", "/api/auth/status").permitAll();
              if (enabled) auth.anyRequest().authenticated();
              else auth.anyRequest().permitAll();
            });
    return http.build();
  }
}
