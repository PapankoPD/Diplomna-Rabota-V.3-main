# Security Considerations

This document outlines the security measures implemented in the authentication system and best practices for production deployment.

## 🔐 Authentication Security

### JSON Web Tokens (JWT)

#### Access Tokens
- **Lifespan**: 15 minutes (configurable)
- **Purpose**: Short-lived tokens for API authentication
- **Storage**: Client-side (memory, not localStorage for security)
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Claims**: User ID, email, username, issuer, audience

#### Refresh Tokens
- **Lifespan**: 7 days (configurable)
- **Purpose**: Obtaining new access tokens without re-authentication
- **Storage**: 
  - Server: SHA-256 hash in database
  - Client: Secure, HTTP-only cookies (recommended) or secure storage
- **Rotation**: Automatic rotation on each use
- **Revocation**: Can be revoked individually

### Token Best Practices

✅ **DO:**
- Use HTTPS/TLS in production
- Store refresh tokens securely
- Implement token rotation
- Set appropriate expiration times
- Validate tokens on every request
- Use strong, unique secrets (256-bit minimum)

❌ **DON'T:**
- Store tokens in localStorage (XSS vulnerability)
- Use the same secret for access and refresh tokens
- Make tokens too long-lived
- Include sensitive data in token payload
- Share secrets across environments

### Secret Management

Generate secure secrets using:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Requirements:**
- Minimum 256 bits (64 hex characters)
- Unique per environment (dev, staging, prod)
- Never committed to version control
- Rotated every 90-180 days

## 🛡️ Password Security

### Hashing
- **Algorithm**: bcrypt
- **Rounds**: 12 (configurable via `BCRYPT_ROUNDS`)
- **Salt**: Automatically generated per password

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*...)

### Best Practices
- Never store passwords in plain text
- Never log passwords
- Use secure password reset flows
- Implement password history (prevent reuse)
- Consider implementing password expiry

## 🚨 Brute Force Protection

### Account Lockout
- **Trigger**: 5 failed login attempts (configurable)
- **Duration**: 15 minutes (configurable)
- **Reset**: Successful login resets counter
- **Notification**: User receives lockout message with countdown

### Rate Limiting

#### Global Rate Limit
- **Window**: 15 minutes
- **Limit**: 100 requests per IP
- **Action**: Returns 429 Too Many Requests

#### Authentication Rate Limit
- **Window**: 15 minutes
- **Limit**: 5 requests per IP
- **Endpoints**: `/api/auth/register`, `/api/auth/login`
- **Action**: Returns 429 with retry-after header

### Implementation
```javascript
// Configured in src/middleware/security.js
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests
    message: 'Too many authentication attempts'
});
```

## 🔒 HTTP Security Headers

Implemented via Helmet.js:

### Content Security Policy (CSP)
Prevents XSS attacks by controlling resource loading.

```javascript
contentSecurityPolicy: {
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // ...
    }
}
```

### HTTP Strict Transport Security (HSTS)
Forces HTTPS connections.

```javascript
hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
}
```

### X-Frame-Options
Prevents clickjacking attacks.

```javascript
frameguard: { action: 'deny' }
```

### X-Content-Type-Options
Prevents MIME sniffing.

```javascript
noSniff: true
```

### X-XSS-Protection
Enables browser XSS filtering.

```javascript
xssFilter: true
```

## 🌐 Cross-Origin Resource Sharing (CORS)

### Configuration

```javascript
// Configured in src/middleware/security.js
const corsConfig = cors({
    origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
});
```

### Best Practices
- Specify exact allowed origins (avoid wildcards in production)
- Enable credentials only when necessary
- Limit exposed HTTP methods
- Set appropriate headers

## 🧹 Input Validation & Sanitization

### Validation
Using express-validator for all inputs:

```javascript
// Example: Email validation
body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email')
```

### Sanitization
Automatic removal of dangerous characters:

```javascript
// Removes: < > ;
const sanitize = (str) => str.replace(/[;<>]/g, '');
```

### SQL Injection Prevention
- **Parameterized Queries**: All database queries use parameterized statements
- **No String Concatenation**: Never build SQL with string concatenation
- **ORM/Query Builder**: Using pg library with parameter binding

Example:
```javascript
// ✅ SAFE
await query('SELECT * FROM users WHERE email = $1', [email]);

// ❌ UNSAFE
await query(`SELECT * FROM users WHERE email = '${email}'`);
```

## 🗄️ Database Security

### Connection Security
- Use SSL/TLS for database connections in production
- Limit connection pool size
- Use dedicated database user with minimal privileges
- Never use superuser for application

### Schema Protection
```sql
-- Grant minimum necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
REVOKE DELETE ON users FROM app_user;
```

### Password Storage
- All passwords hashed with bcrypt (12 rounds)
- Refresh tokens stored as SHA-256 hashes
- Never store sensitive data in plain text

### Data Integrity
- Foreign key constraints
- Check constraints on critical fields
- Transaction support for multi-step operations

## 🔄 Token Lifecycle Management

### Token Storage (Server)
```javascript
// Store refresh token hash (not the token itself)
const tokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
);
```

### Token Rotation
On each refresh:
1. Validate old refresh token
2. Revoke old refresh token
3. Generate new access + refresh tokens
4. Store new refresh token hash
5. Return new tokens to client

### Token Revocation
- Logout revokes refresh token
- Manual revocation supported
- Expired tokens cleaned up automatically

```sql
-- Cleanup function (run periodically)
SELECT cleanup_expired_tokens();
```

## 🚀 Production Deployment Checklist

### Environment
- [ ] Set `NODE_ENV=production`
- [ ] Generate unique JWT secrets (minimum 256-bit)
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure secure database connections

### Database
- [ ] Use strong database passwords
- [ ] Enable SSL for database connections
- [ ] Create dedicated database user (not superuser)
- [ ] Set up regular backups
- [ ] Configure connection pooling limits

### Application
- [ ] Set specific CORS allowed origins
- [ ] Configure rate limiting for your traffic
- [ ] Set up log rotation
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Set up health check monitoring

### Network
- [ ] Use firewall to restrict database access
- [ ] Enable DDoS protection
- [ ] Use reverse proxy (Nginx, HAProxy)
- [ ] Configure load balancing if needed

### Monitoring
- [ ] Monitor failed login attempts
- [ ] Track rate limit violations
- [ ] Alert on unusual traffic patterns
- [ ] Monitor database performance
- [ ] Set up uptime monitoring

## 🔍 Security Audit Checklist

### Regular Tasks
- [ ] Review access logs weekly
- [ ] Rotate JWT secrets every 90 days
- [ ] Update dependencies monthly
- [ ] Run security audits (`npm audit`)
- [ ] Review user permissions quarterly

### Incident Response
- [ ] Have a plan for token compromise
- [ ] Know how to revoke all tokens
- [ ] Document breach notification process
- [ ] Maintain security contact information

## 🐛 Common Vulnerabilities Addressed

### ✅ Protected Against

| Vulnerability | Protection |
|--------------|------------|
| SQL Injection | Parameterized queries |
| XSS (Cross-Site Scripting) | Input sanitization, CSP headers |
| CSRF (Cross-Site Request Forgery) | SameSite cookies, CORS |
| Brute Force | Rate limiting, account lockout |
| Session Hijacking | Short-lived tokens, HTTPS only |
| Clickjacking | X-Frame-Options header |
| MIME Sniffing | X-Content-Type-Options |
| Password Cracking | Bcrypt hashing (12 rounds) |
| Token Theft | Token rotation, secure storage |
| Man-in-the-Middle | HTTPS/TLS, HSTS |

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

## 📞 Reporting Security Issues

If you discover a security vulnerability, please:
1. **DO NOT** create a public issue
2. Email security concerns to your security team
3. Include detailed description and steps to reproduce
4. Allow reasonable time for fixes before disclosure
