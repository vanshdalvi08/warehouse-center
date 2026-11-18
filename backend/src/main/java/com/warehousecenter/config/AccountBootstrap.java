package com.warehousecenter.config;

import com.warehousecenter.service.AccountService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class AccountBootstrap implements ApplicationRunner {
  private final AccountService accounts;
  private final boolean enabled;
  private final String username, password;

  public AccountBootstrap(
      AccountService accounts,
      @Value("${app.security.enabled:true}") boolean enabled,
      @Value("${app.security.username:admin}") String username,
      @Value("${app.security.password:}") String password) {
    this.accounts = accounts;
    this.enabled = enabled;
    this.username = username;
    this.password = password;
  }

  public void run(ApplicationArguments args) {
    if (enabled) {
      accounts.bootstrap(username.toLowerCase(java.util.Locale.ROOT), password);
      accounts.migrateLegacyRoles();
    }
  }
}
