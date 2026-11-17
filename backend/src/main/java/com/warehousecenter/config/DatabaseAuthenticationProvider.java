package com.warehousecenter.config;

import com.warehousecenter.service.AccountService;
import java.util.List;
import org.springframework.security.authentication.*;
import org.springframework.security.core.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.*;

@Component
public class DatabaseAuthenticationProvider implements AuthenticationProvider {
  private final AccountService accounts;

  public DatabaseAuthenticationProvider(AccountService accounts) {
    this.accounts = accounts;
  }

  @Override
  public Authentication authenticate(Authentication request) {
    var result =
        accounts.verify(request.getName(), String.valueOf(request.getCredentials()), false);
    if (result.failure() != null)
      throw new BadCredentialsException("Invalid credentials or account unavailable");
    var u = result.user();
    return UsernamePasswordAuthenticationToken.authenticated(
        u.username, null, List.of(new SimpleGrantedAuthority("ROLE_" + u.role)));
  }

  @Override
  public boolean supports(Class<?> type) {
    return UsernamePasswordAuthenticationToken.class.isAssignableFrom(type);
  }
}
