# Code Vulnerabilities - Priority Order

> **Status**: 4 CRITICAL fixed, 6 HIGH and 6 MEDIUM remaining
> **Last Updated**: 2026-03-08

---

## CRITICAL - FIXED

### 1. ~~Unauthenticated Admin Seed Endpoints~~ FIXED

**Files:**
- `src/app/api/admin/seed/route.ts`
- `src/app/api/admin/seed-demo/route.ts`

**Issue:** Zero authentication. These endpoints can:
- Wipe the entire database
- Create admin accounts with hardcoded password `Demo123!`
- Return credentials in the response
- `seed-demo` accepts `companyName` and `userEmail` parameters with no auth

**Risk:** Complete database destruction and unauthorized admin access

**Resolution:** Deleted both endpoint directories entirely.

---

### 2. ~~Middleware Excludes All API Routes~~ FIXED

**File:** `src/middleware.ts`

**Issue:** The matcher pattern `'/((?!api|...)*)'` skipped all `/api/` routes, so middleware authentication never ran on any API endpoint.

**Risk:** All API endpoints bypass middleware-level authentication checks

**Resolution:** Updated middleware to include API routes with proper authentication:
- Public API routes explicitly whitelisted
- Vendor API routes require vendor token
- All other API routes require user token

---

### 3. ~~Hardcoded JWT Secret Fallbacks~~ FIXED

**Files:**
- `src/lib/auth.ts`
- `src/lib/vendor-auth.ts`

**Issue:** If environment variables are not set, predictable fallback secrets were used.

**Risk:** Attackers can forge valid JWT tokens if the fallback is used

**Resolution:** Removed fallback values. Application now throws error on startup if `JWT_SECRET` is not set.

---

### 4. ~~Cron Endpoints Auth Bypass~~ FIXED

**Files:**
- `src/app/api/cron/check-stock-levels/route.ts`
- `src/app/api/cron/due-date-notifications/route.ts`

**Issue:** If `CRON_SECRET` environment variable is unset, the auth check was skipped entirely.

**Risk:** Unauthorized execution of cron jobs

**Resolution:** Endpoints now return 500 error if `CRON_SECRET` is not configured, preventing auth bypass.

---

## HIGH

### 5. Open Registration Creates ADMIN Accounts

**File:** `src/app/api/auth/register/route.ts:44`

**Issue:** Any registration automatically gets `Role.ADMIN`. No invite required, no email verification.

**Risk:** Anyone can create an admin account and gain full system access

---

### 6. Unrestricted File Uploads

**Files:**
- `src/app/api/task/[id]/attachments/route.ts`
- `src/app/api/project/[id]/files/route.ts`
- `src/app/api/walkaround/[id]/photos/route.ts`
- `src/app/api/walkaround/[id]/audio/route.ts`
- `src/app/api/assets/[id]/photos/route.ts`
- `src/app/api/contracts/[id]/documents/route.ts`
- `src/app/api/vendor-portal/tasks/[id]/attachments/route.ts`

**Issue:** No file type validation, no file size limits, files written directly to `public/` directory.

**Risk:** Malicious file uploads, server storage exhaustion, potential code execution

---

### 7. Client Portal Token Substring Match

**File:** `src/app/api/client/project/[token]/route.ts:14-16`

**Issue:** Uses `contains` instead of exact match for token lookup. Partial tokens can match unintended projects.

**Risk:** Unauthorized access to other clients' project data

---

### 8. Unauthenticated Shared Task Modification

**File:** `src/app/api/shared/task/[token]/route.ts`

**Issue:** Anyone with the link can change task status. Exposes company information.

**Risk:** Unauthorized task manipulation, information disclosure

---

### 9. SSRF in File Serving

**File:** `src/app/api/files/[id]/route.ts:65-71`

**Issue:** Fetches arbitrary URLs if `document.url` starts with `http`.

**Risk:** Server-Side Request Forgery - can be used to scan internal networks, access internal services

---

### 10. Path Traversal in File Download

**File:** `src/app/api/files/[id]/route.ts:58`

**Issue:** `../` in stored URL could read files outside the upload directory.

**Risk:** Arbitrary file read on the server

---

## MEDIUM

### 11. Wildcard CORS on Login

**File:** `src/app/api/auth/login/route.ts`

**Issue:** `Access-Control-Allow-Origin: *`

**Risk:** Credentials can be stolen via cross-origin requests from malicious sites

---

### 12. Weak Password Policy

**File:** `src/app/api/invite/[token]/route.ts:57`

**Issue:** Minimum 6 characters only, no complexity requirements.

**Risk:** Weak passwords susceptible to brute force attacks

---

### 13. JWT Token in URL Query Parameter

**File:** `src/app/api/files/[id]/route.ts:17`

**Issue:** JWT token passed in URL query string.

**Risk:** Tokens logged in server logs, browser history, referrer headers

---

### 14. No Rate Limiting on Login

**Files:**
- `src/app/api/auth/login/route.ts`
- `src/app/api/vendor-portal/login/route.ts`

**Issue:** No rate limiting or account lockout mechanism.

**Risk:** Brute force password attacks

---

### 15. Shared JWT Secret

**File:** `src/lib/vendor-auth.ts`

**Issue:** Uses the same `JWT_SECRET` as the main application.

**Risk:** Vendor tokens could be used to access main application if validation is weak

---

### 16. Health Endpoint Leaks Error Details

**File:** `src/app/api/health/route.ts:16-21`

**Issue:** Returns detailed error information in response.

**Risk:** Information disclosure about system internals

---

## Recommended Fix Order

1. ~~**Critical 1-4**: These allow complete system compromise with no authentication~~ DONE
2. **High 5-6**: Allow privilege escalation and malicious uploads
3. **High 7-10**: Data access and manipulation vulnerabilities
4. **Medium 11-16**: Defense-in-depth improvements

---

## Notes

- All CRITICAL issues have been addressed
- HIGH issues should be addressed before deploying to production
- Consider implementing a security review process for new API endpoints
- Add automated security scanning to CI/CD pipeline
