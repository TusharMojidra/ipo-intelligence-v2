# PRE-DEPLOYMENT AUDIT REPORT

**Application:** IPO Intelligence Terminal V2.0
**Repository:** `D:/IPO_VERSION2.0`
**Audit date:** 2026-11-22
**Mode:** Read-only audit. No source, config, dependency, schema, migration, or env files were modified.

---

## 1. Executive Summary & Deployment Decision

> ## **NO-GO UNTIL FIXES**
>
> The application is not cleared for production. Architecture and authentication design are strong and the backend suite passes 96/96, but one Critical and five High findings must be closed and re-verified before any public deployment. C-1 and H-2 are directly exploitable or externally abusable; the remainder create operational and reliability risk on the Render free tier.

### 1.1 Blocking findings

| ID | Severity | Finding |
|----|----------|---------|
| C-1 | Critical | A live-looking Neon PostgreSQL connection string with an embedded password is committed to the tracked file `.env.example` (line 17) and is present in git history (commit 8211ed0). |
| H-1 | High | All models are retrained at process startup (`api.py:161-251`); `/api/health` returns 200 even when models are not loaded. |
| H-2 | High | Unauthenticated, unthrottled endpoints perform expensive work: `POST /api/upcoming-ipos/refresh` (live scraping) and `GET /api/test/classification` (full out-of-time evaluation). |
| H-3 | High | Client IP is taken from the left-most, client-controlled `X-Forwarded-For` (`security.py:67-83`) while the container trusts all proxies (`--forwarded-allow-ips *`). |
| H-4 | High | `requirements.txt` uses only `>=` lower bounds; no pins or lockfile. |
| H-5 | High | Frontend `tsc --noEmit` fails with 4 type errors; no type gate in CI. |

### 1.2 What is working well

- Cookie-based sessions (HttpOnly, SameSite=Lax, Secure in production); tokens are not stored in localStorage.
- Argon2id hashing with bcrypt fallback; SHA-256 hashing of verification, reset and session tokens; constant-time comparison.
- JWT algorithm pinned; exp and sub required; production guard rejects default or short secrets.
- Server-side session revocation, password-change invalidation, and session listing/termination.
- Strong password policy, breach-list check, account lockout, per-IP auth rate limits.
- CSRF Origin/Referer middleware, strict CORS, comprehensive security headers (HSTS, CSP, COOP/COEP/CORP).
- Ownership checks on watchlist and simulations; get_verified_user on writes.
- 96/96 backend tests pass; npm audit --omit=dev reports 0 vulnerabilities.
- .env is untracked; .dockerignore excludes .env, data/app.db, and tests.

### 1.3 Release conditions

Deploy only after C-1 and all High findings are closed and Appendix B is refreshed. Medium findings may be accepted with a documented, time-boxed mitigation plan; Low findings are backlog.

---

## 2. Scope, Methodology & Evidence Classification

### 2.1 In scope

Frontend (React 19, Vite 6, Tailwind 4); backend/API (FastAPI, routers, schemas, email service); authN/authZ; OWASP security; database; deployment config; dependencies; performance; tests.

### 2.2 Out of scope

Live penetration test; third-party vendor reviews; legal/regulatory certification.

### 2.3 Evidence tags

| Tag | Meaning |
|-----|---------|
| [CI] | Code inspection at the cited line. |
| [AUTO] | Command executed and output observed in this audit. |
| [MAN] | Manual reasoning, not executed. |
| [NT] | NOT TESTED; tooling or access unavailable. |

### 2.4 Method

Repository reconnaissance; full read of api.py, backend/security.py, backend/routers/auth.py, backend/routers/user_data.py, backend/models.py, backend/db.py, backend/schemas.py, backend/email_service.py; frontend review (App.tsx, AuthContext.tsx, AuthModal.tsx, components); execution of tests, type-check, and dependency audits; secret scan of tracked files and the built bundle.

### 2.5 Environment

Windows; Python 3.13.13; Node 26.8.1; npm 11.19.0. No browser automation or DAST tooling available.

---

## 3. Architecture & Technology Inventory

| Layer | Technology | Evidence |
|-------|-----------|----------|
| Backend | FastAPI + Uvicorn | api.py:64; Dockerfile CMD |
| ORM / DB | SQLAlchemy 2.0; SQLite local, PostgreSQL (Neon) prod | backend/db.py:8-29 |
| Auth | Argon2id (+bcrypt), PyJWT HS256, Google OAuth | backend/security.py; routers/auth.py |
| Email | Resend REST via httpx, SMTP fallback | backend/email_service.py:7,108-110,142-144 |
| ML | scikit-learn, XGBoost ensemble and quantile regressors | api.py:186-216 |
| AI companion | Groq chat completion | api.py:957-974 |
| Frontend | React 19, Vite 6, Tailwind 4, Three.js | frontend/package.json |
| Serving | FastAPI serves frontend/dist at / | api.py:1028 |
| Hosting | Render Docker web service, free, oregon | render.yaml |

### 3.1 Data flow

Browser (cookie session) -> FastAPI security-headers middleware -> CSRF Origin/Referer middleware -> CORS -> routers (auth, user_data) and public inference/scraper/chat routes -> PostgreSQL (Neon), in-memory model state, Groq, Resend, external IPO sources -> static frontend/dist.

### 3.2 Trust boundaries

1. Browser to FastAPI: cookie session, Origin/Referer-checked state changes.
2. FastAPI to Neon: TLS via sslmode=require.
3. FastAPI to third parties: Groq, Resend, Google, scraper targets.
4. Render edge to container: proxy headers trusted unconditionally (H-3).

### 3.3 Endpoint inventory (summary)

Public: /api/health, /api/status, /api/recent-ipos, /api/upcoming-ipos, /api/history, /api/predict, /api/predict/phase1, /api/sensitivity, /api/feedback, /api/contact, /api/companion/chat, robots.txt, sitemap.xml, favicon.ico.

Public but heavy: POST /api/upcoming-ipos/refresh; GET /api/test/classification.

Auth router (/api/auth): google/config, google/login, google/callback, google (POST), register, verify-email (GET/POST), resend-verification, login, forgot-password, reset-password, logout, sessions (GET/DELETE), sessions/{id} (DELETE), me.

User router (/api/user): watchlist (GET/POST/DELETE), simulations (GET/POST/DELETE). Writes require get_verified_user.

---

## 4. Functional & Frontend Assessment

| Check | Result | Evidence |
|-------|--------|----------|
| Production bundle exists | PASS: dist/index.html + 1,032,015 B JS + 106,021 B CSS, timestamped 2026-11-22 19:34 | [AUTO] |
| tsc --noEmit | FAIL: 4 type errors | [AUTO] |
| npm audit --omit=dev | PASS: 0 vulnerabilities | [AUTO] |
| Frontend unit/E2E tests | [NT]: no test script | [CI] |

Type errors [AUTO]:

1. src/App.tsx:307: object literal sets confidence, not in PredictionResult (TS2353).
2. src/App.tsx:352: updater returns a partial object missing company_name, direction, expected_median, predicted_range and 7 more (TS2345).
3. src/App.tsx:441: passes onNavigateTab to SideScale, which does not accept it (TS2322).
4. src/components/SideScale.tsx:13: Record<NavigationTab, ScaleSection[]> is missing the history key (TS2741).

Impact: Vite does not type-check, so the bundle still builds, but these are genuine state-contract and prop-contract drifts that can cause runtime undefined reads or dead navigation. [CI]/[AUTO]

### 4.1 Routing and auth gating

Single-page App.tsx with tab state; no client router and no auth-gated routes. Authorization is enforced at the API layer (correct posture), but authenticated views can render without a session. [CI]

AuthContext purges legacy localStorage tokens and relies on the HttpOnly cookie; requests use credentials include. [CI]

### 4.2 XSS and injection surface

No dangerouslySetInnerHTML, innerHTML, eval, or new Function in frontend source. [CI] The built bundle contains no API keys or DB credentials; the only 127.0.0.1 occurrence is an internal constant and http://www.w3.org is an SVG namespace. [AUTO]

### 4.3 Responsive, cross-browser, accessibility

[NT]: no browser automation; visual regression, responsive breakpoints, keyboard navigation, and screen-reader behavior were not executed.

---

## 5. Backend API & Business Logic Assessment

### 5.1 Input validation

All request models use bounded Pydantic fields (issue_size 1-500000; message 5-5000 chars; history max 20; password 8-128). EmailStr used for all email fields. [CI] (api.py:254-285,946-954; backend/schemas.py)

### 5.2 Injection

ORM access is parameterized via SQLAlchemy; no user-controlled SQL interpolation. The only dynamic SQL is the startup migration (backend/db.py:57-59), which interpolates hardcoded column names and definitions, not user input. Not exploitable, but fragile (M-9). [CI]

### 5.3 Rate limiting and abuse controls

| Surface | Limit | Mechanism |
|---------|-------|-----------|
| Login failures | 5 / 15 min / IP | in-memory defaultdict (auth.py:78-107) |
| Signup | 5 / hour / IP | in-memory (auth.py:89-99) |
| OTP | 10 min window | in-memory (auth.py:110-119) |
| Reset/resend | 15 min window | in-memory (auth.py:121-130) |
| Feedback | 20 / hour / IP | in-memory (api.py:865-884) |
| AI chat | 30 / min / IP | in-memory (api.py:942-971) |
| Predict / sensitivity | none | - |
| Upcoming refresh / test eval | none | - |

All counters are per-process and in-memory; with multiple workers or instances they are not shared, and a restart resets them. Combined with H-3 (spoofable IP), effective protection is weaker than the configured numbers imply. [CI]/[MAN]

### 5.4 Error handling and information disclosure

/api/health returns only status/version/model flag; /api/status returns model details only to authenticated users. Login returns generic failures and writes AuthAuditLog entries on login/register/logout/reset/verify. Startup migration swallows exceptions with print, so schema failures can go unnoticed (M-9). [CI]

---

## 6. Authentication, Authorization & Session Management

### 6.1 Password handling

Argon2id primary with bcrypt fallback [CI]; policy 8-128 chars, 8-19 requires upper+lower+digit+symbol, 20+ passphrase needs 2 categories (security.py:86-134) [CI]; breach-list rejection and 128-char hashing-DoS cap [CI].

### 6.2 JWT and sessions

HS256 with algorithm pinned at decode, exp and sub required (security.py:192-216). Production guard refuses default or under-32-char secret (security.py:30-38). UserSession stores SHA-256 token hash, expiry, revocation flag, IP, UA (models.py:72-83). Revocation covers expired, revoked, and password-changed-after-session (security.py:287-358). Session list/revoke endpoints exist (auth.py:970-1024). [CI]

### 6.3 Cookie configuration

| Attribute | Value | Assessment |
|-----------|-------|------------|
| Name | ipo_session | - |
| HttpOnly | True | Good [CI] |
| SameSite | Lax | Good [CI] |
| Secure | True when ENVIRONMENT=production or HTTPS | Good [CI] |
| Max-Age | 24 h (7 d with remember-me) | Reasonable [CI] |

### 6.4 OAuth

Google ID-token flow verifies audience via google.auth; code flow validates state against an in-memory store with expiry (auth.py:203-275). Weakness: state is process-local, lost on restart, not shared across workers/instances (M-3). [CI]

### 6.5 Authorization and IDOR

Dependencies get_current_user / get_verified_user / get_optional_current_user gate routes. Watchlist and simulation queries filter by user_id; delete-by-id also filters ownership (user_data.py:21-127). No admin or role-gated routes exist; User.role is stored but never consulted (L-8). [CI]

### 6.6 Email verification and reset

Verification and reset tokens are SHA-256 hashed at rest, single-use (is_used), and expiry-bound (models.py:40-66). Verification links use ?token= in the URL; email HTML sets referrer no-referrer to reduce leakage (L-2). OTP codes are stored in plaintext (models.py:96) (M-4). [CI]

### 6.7 Account lockout

failed_login_attempts increments and locked_until applies after 5 failures, cleared on success (auth.py:734-763). Bypassable via H-3 (spoofed X-Forwarded-For changes the rate-limit key). [CI]/[MAN]

---

## 7. Security Assessment (OWASP, Secrets, Headers, CSRF/CORS)

### 7.1 Secrets management: CRITICAL

| Finding | Evidence | Severity |
|---------|----------|----------|
| Tracked .env.example line 17 contains a real-looking Neon PostgreSQL URL with an embedded password (postgresql://neondb_owner:[REDACTED]@[REDACTED-host]/neondb?sslmode=require), present in git history (8211ed0). | git grep, git log [AUTO] | Critical (C-1) |
| Working-tree .env contains live-looking Resend, Groq, Google OAuth secret, Neon DB, and JWT secret values. File is untracked and .dockerignore-excluded. | .env present; git ls-files shows only .env.example [AUTO] | High (C-2) |
| .env.example JWT_SECRET_KEY is a placeholder, not a real key. | [CI] | OK |
| Built JS bundle contains no secrets. | [AUTO] | OK |

Required actions: rotate the Neon DB password now; replace .env.example line 17 with a placeholder; purge the secret from git history (git filter-repo or BFG) and force-push; rotate every credential present in .env if the workspace, archive, or any artifact was ever shared; review Neon access logs for anomalous connections.

### 7.2 OWASP Top 10 mapping

| Category | Status | Notes |
|----------|--------|-------|
| A01 Broken Access Control | Mostly good | Ownership checks; no admin surface; server-side auth. Watch unauthenticated heavy endpoints (H-2). |
| A02 Cryptographic Failures | Good | Argon2id, SHA-256 token hashes, TLS to DB, HSTS. |
| A03 Injection | Good | ORM parameterization, bounded inputs, no eval/innerHTML. |
| A04 Insecure Design | Partial | Startup retraining, public heavy endpoints, in-memory OAuth state. |
| A05 Security Misconfiguration | Partial | Root container, unpinned deps, SQLite fallback, sandbox sender. |
| A06 Vulnerable Components | Partial | npm clean; Python CVE scan not tested; unpinned versions. |
| A07 AuthN Failures | Good | Lockout, strong policy, OAuth; IP-spoof bypass (H-3). |
| A08 Data Integrity | Good | No untrusted deserialization. |
| A09 Logging/Monitoring | Partial | Audit table populated; no retention/alerting; migration errors only printed. |
| A10 SSRF | Low | Scraper fetches fixed external sources; no user-supplied URL fetch. |

### 7.3 Security headers and CSP

Present on all responses (api.py:69-99): X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP/COEP/CORP, HSTS (prod/HTTPS), CSP.

CSP weaknesses: script-src includes unsafe-inline (M-5); X-XSS-Protection is deprecated and ignored by modern browsers (L-1); style-src unsafe-inline is expected for Tailwind runtime styles.

### 7.4 CSRF

Custom middleware validates Origin, then Referer, on POST/PUT/DELETE/PATCH under /api/ when an ipo_session cookie is present (api.py:117-144). Gap: if neither Origin nor Referer is sent, the request proceeds; SameSite=Lax is the effective backstop and no synchronizer token is used (M-8).

### 7.5 CORS

Explicit origin allow-list from ALLOWED_ORIGINS; fallback list includes production URL, localhost, and one private LAN IP (api.py:101-115). allow_credentials=True with explicit origins is correct (no wildcard). [CI]

### 7.6 Transport

HSTS one year, includeSubDomains, preload when production/HTTPS. Uvicorn runs with --proxy-headers --forwarded-allow-ips * so any client-supplied forwarding header is trusted (H-3). [CI]

### 7.7 Automated and dynamic testing

[NT]: no DAST (ZAP, Burp, nuclei) and no Python CVE scanner available. Findings are code-inspection and local-execution based.

---

## 8. Database, Deployment & Configuration

### 8.1 Database

| Aspect | Observation | Assessment |
|--------|-------------|------------|
| Engine selection | DATABASE_URL; default sqlite:///./data/app.db | M-6 if env missing in prod |
| Driver | psycopg2-binary; sslmode=require in example | Good |
| Schema creation | Base.metadata.create_all at startup | Acceptable at this scale |
| Migrations | Hand-rolled ALTER TABLE with f-strings; exceptions swallowed | M-9 fragile |
| Indexes | Indexed FKs, unique email/google_id/session hash | Good |
| Sensitive at rest | Password hashes, token hashes, plaintext OTP | M-4 |
| PII | Email, name, IP, UA in users, auth_audit_logs, feedback_submissions | Needs retention policy (L-4) |
| Local DB artifact | data/app.db exists locally (untracked, docker-ignored) | Do not distribute |

### 8.2 Container and runtime

| Item | Observation | Assessment |
|------|-------------|------------|
| Base image | python:3.11-slim | Local 3.13 drift (L-5) |
| User | no USER directive; runs as root | M-1 |
| Build tools | gcc, libpq-dev, curl retained | Larger attack surface |
| HEALTHCHECK | none (Render uses healthCheckPath) | See H-1 |
| Proxy trust | --forwarded-allow-ips * | H-3 |
| .dockerignore | excludes .env, data/app.db, tests, node_modules | Good |
| Frontend serving | StaticFiles(frontend/dist) at / | Good |
| Startup | retrains all models (api.py:161-251) | H-1 |

### 8.3 Render configuration (render.yaml)

| Item | Value | Assessment |
|------|-------|------------|
| Plan / region | free / oregon | 512 MB RAM, cold starts (H-1) |
| autoDeploy | true | Every push deploys; needs CI gate (H-5) |
| healthCheckPath | /api/health | 200 even if models absent (H-1) |
| JWT_SECRET_KEY | generateValue true | Good |
| DATABASE_URL | sync false | Must be set manually; else SQLite fallback (M-6) |
| SMTP_FROM_EMAIL | onboarding@resend.dev | M-2 sandbox sender |
| ALLOWED_ORIGINS | production URL | Good |
| GOOGLE_*, GROQ_API_KEY, RESEND_API_KEY | sync false | Must be set manually |

### 8.4 Repository hygiene

| Observation | Assessment |
|-------------|------------|
| .env untracked; only .env.example tracked | Good |
| .env.example contains a real DB credential | C-1 |
| frontend/dist/* committed (5 files, 1.03 MB JS) | M-7 |
| models/ipo_models.joblib committed and unused at runtime | M-7 / H-1 |
| Data CSVs and report figures committed | Acceptable but bloats repo |
| .gitignore explicitly re-includes frontend/dist/ | Intentional; document it |
| Working tree clean (git status --porcelain empty) | Good |

---

## 9. Dependencies, Performance, Automated Tests & Residual Risk

### 9.1 Python dependencies

requirements.txt lists 22 packages, all with >= lower bounds only: no upper bounds, hashes, or lockfile (H-4). pip-audit is not installed, so Python CVE status is [NT]. Recommended: add pip-audit to CI and pin with pip-tools or uv. The resend SDK is not required; email_service.py calls the Resend REST API via httpx and falls back to SMTP, consistent with the installed environment. [CI]

### 9.2 Frontend dependencies

npm audit --omit=dev: 0 vulnerabilities [AUTO]. Dev dependencies include typescript ~6.0.3; the build script allocates 4 GB heap. No dev-only transitive audit beyond npm audit.

### 9.3 Automated tests

| Suite | Tests | Client-based | Result |
|-------|-------|--------------|--------|
| test_api.py | 16 | Yes | PASS |
| test_auth_api.py | 4 | Yes | PASS |
| test_auth_remediation.py | 25 | Yes | PASS |
| test_database.py | 4 | No | PASS |
| test_enterprise_auth.py | 5 | Yes | PASS |
| test_security.py | 4 | No | PASS |
| test_security_audit.py | 28 | Yes | PASS |
| test_upcoming_ipos.py | 2 | Yes | PASS |
| test_vulnerabilities.py | 8 | Yes | PASS |
| Total | 96 | - | 96 passed, 3 warnings, 160.85 s [AUTO] |

Gaps: no conftest.py, no pytest config, tests run on local SQLite only (no PostgreSQL integration), no load/performance tests, no frontend tests, no E2E.

### 9.4 Performance

| Concern | Observation | Impact |
|---------|-------------|--------|
| Cold start | Trains XGBoost(200) + RF(300) + RF-reg(200) + GBR(200) + 3 quantile GBR(150) at boot | High CPU, tens of seconds, memory spike (H-1) |
| Free tier | 512 MB RAM; sklearn/XGBoost + pandas CSV + model state | OOM/restart risk (H-1) |
| Health semantics | /api/health 200 regardless of model readiness | Traffic routed before ready |
| Heavy public endpoints | Full evaluation + live scraping, unauthenticated | CPU/network exhaustion (H-2) |
| Bundle | Single 1.03 MB JS chunk, no code splitting | Slower first load (L-6) |
| Request inference | Vectorized per request; no caching | Acceptable at expected volume |

### 9.5 Residual risk after remediation

Moderate-Low, dominated by in-memory rate limiting and OAuth state under multi-instance scaling, unsafe-inline CSP, absence of Python CVE scanning and frontend tests, email deliverability via sandbox sender, and operational fragility of startup retraining on a free tier.

---

## Appendix A: Findings Register

| ID | Sev | Area | Finding | Evidence | Remediation |
|----|-----|------|---------|----------|-------------|
| C-1 | Critical | Secrets | Live-looking Neon DB URL and password committed in .env.example:17 and git history | git grep, git log [AUTO] | Rotate DB password; replace with placeholder; purge history; audit DB logs |
| C-2 | High | Secrets | Working-tree .env holds live secrets (untracked) | file present [AUTO] | Confirm never committed or shared; rotate if any exposure; keep ignored |
| H-1 | High | Performance | Full model retraining at startup; health ignores readiness | api.py:161-251,288-295 | Load serialized joblib at boot; make health reflect readiness; add startup timeout |
| H-2 | High | Abuse/DoS | Unauthenticated, unthrottled scraping and full-evaluation endpoints | api.py:414-418,431-440 | Require auth/admin or disable in prod; add strict rate limits |
| H-3 | High | AuthN bypass | Left-most X-Forwarded-For trusted plus --forwarded-allow-ips * | security.py:67-83; Dockerfile | Trust only the Render edge; use proxy-provided client IP; restrict forwarded IPs |
| H-4 | High | Supply chain | Unpinned Python deps (>= only) | requirements.txt | Pin exact versions; add lockfile and pip-audit in CI |
| H-5 | High | Frontend quality | tsc --noEmit fails with 4 errors | App.tsx:307,352,441; SideScale.tsx:13 | Fix PredictionResult contract, history key, onNavigateTab prop; add type-check to CI |
| M-1 | Medium | Container | Runs as root; build toolchain retained | Dockerfile | Add non-root USER; multi-stage build; drop gcc/libpq-dev from runtime |
| M-2 | Medium | Email | Sandbox sender onboarding@resend.dev | render.yaml; email_service.py:17 | Verify domain in Resend; set branded SMTP_FROM_EMAIL |
| M-3 | Medium | OAuth | In-memory state store | auth.py:75,232,270 | Use signed/expiring state or server-side store |
| M-4 | Medium | Data at rest | OTP stored plaintext | models.py:96 | Store OTP hash; compare in constant time |
| M-5 | Medium | Headers | CSP script-src unsafe-inline | api.py:88 | Move inline scripts to files/nonces; tighten CSP |
| M-6 | Medium | Config | Silent SQLite fallback in prod | db.py:8; render.yaml | Fail fast in production if DATABASE_URL missing |
| M-7 | Medium | Repo hygiene | Built dist and model binary committed | git ls-files [AUTO] | Build in CI/Docker; stop committing artifacts or gate them |
| M-8 | Medium | CSRF | No token; header check skipped if absent | api.py:124-142 | Add double-submit token or require Origin in prod |
| M-9 | Medium | DB | f-string ALTER TABLE; swallowed errors | db.py:52-62 | Use Alembic; fail loudly on migration error |
| M-10 | Medium | Deps | Python CVE scan not run | tooling absent [NT] | Install/run pip-audit; add to CI |
| L-1 | Low | Headers | Deprecated X-XSS-Protection | api.py:74 | Remove |
| L-2 | Low | Tokens | Verify token in URL | auth.py:588; email HTML | Acceptable with no-referrer; consider POST exchange |
| L-3 | Low | Privacy | No account deletion/export | routes inventory | Add DSAR/delete flow |
| L-4 | Low | Audit | No log retention/alerting | models.py:142-150 | Define retention and alerting |
| L-5 | Low | Runtime | Python 3.11 image vs 3.13 local | Dockerfile | Align versions |
| L-6 | Low | Perf | 1 MB single JS chunk | dist/assets | Code-split routes/components |
| L-7 | Low | Abuse | No rate limit on predict/sensitivity | api.py:809-862 | Add per-IP limits |
| L-8 | Low | AuthZ | role column unused | models.py:23 | Remove or implement RBAC |
| L-9 | Info | Ops | autoDeploy true without CI gate | render.yaml | Require green checks before deploy |

---

## Appendix B: Evidence Log

| # | Command / Action | Result |
|---|------------------|--------|
| B-1 | python -m pytest tests -q | 96 passed, 3 warnings in 160.85s |
| B-2 | tsc --noEmit -p tsconfig.json (frontend) | 4 errors (App.tsx x3, SideScale.tsx x1) |
| B-3 | npm audit --omit=dev (frontend) | found 0 vulnerabilities |
| B-4 | python -m pip_audit -r requirements.txt | No module named pip_audit; NOT TESTED |
| B-5 | Artifact presence check | data/processed/cleaned_ipo_data.csv, data/raw/ipo_data.csv, data/raw/nifty_daily.csv, reports/figures/range_predictions.csv, data/app.db, frontend/dist/index.html all exist |
| B-6 | frontend/dist inventory | index.html 3,451 B; index CSS 106,021 B; index JS 1,032,015 B; favicon.svg; icons.svg |
| B-7 | git status --porcelain | empty (clean tree) |
| B-8 | git grep for credential prefixes | 1 hit: .env.example:17 (Neon URL with password) |
| B-9 | git log --all -- .env .env.example | 8211ed0 (secret present in history) |
| B-10 | git ls-files env filter | only .env.example tracked; .env untracked |
| B-11 | git ls-files -- data reports models frontend/dist | data CSVs, report figures, models/ipo_models.joblib, frontend/dist/* tracked |
| B-12 | Bundle secret scan | 0 credential hits; 0 localhost; 127.0.0.1 internal only |
| B-13 | Backend csrf grep | middleware api.py:117-144; OAuth state check auth.py:268-275 |
| B-14 | Cookie flags grep | httponly True, samesite lax, secure prod (security.py:263-282) |
| B-15 | Endpoint enumeration | 30+ routes including 2 unauthenticated heavy endpoints |
| B-16 | Test inventory | 9 files, 96 tests; no conftest.py or pytest config |

All secret values are redacted. No hashes, tokens, or API keys are reproduced in this report.

---

## Appendix C: NOT TESTED

| Area | Reason |
|------|--------|
| Live penetration test / DAST | No ZAP, nuclei, or Burp available |
| Python dependency CVEs | pip-audit not installed |
| Browser E2E, responsive, cross-browser | No Playwright or browser automation |
| Accessibility (WCAG) | No assistive-tech or browser tooling |
| Load and soak testing | No load generator or staging environment |
| PostgreSQL-specific behavior | Tests run on SQLite only |
| Live third-party integrations | No external calls made (Resend, Groq, Google, Neon) |
| Email deliverability | Requires verified domain and live send |

---

## Appendix D: Recommended Remediation Order

1. C-1: rotate Neon credential, scrub .env.example, purge git history, audit DB logs. Immediate.
2. C-2: confirm .env never left the machine; rotate if uncertain.
3. H-3: fix proxy/IP trust (security-control bypass).
4. H-2: lock down or remove public heavy endpoints.
5. H-1: load serialized model at boot; make health reflect readiness; test cold start on 512 MB.
6. H-5: fix TS errors and add tsc to CI.
7. H-4 / M-10: pin dependencies, add lockfile, run pip-audit.
8. M-1, M-2, M-3, M-6: container hardening, verified sender, shared OAuth state, fail-fast DB config.
9. M-4, M-5, M-7, M-8, M-9: OTP hashing, CSP tightening, artifact hygiene, CSRF token, Alembic.
10. Low/Info: backlog.

Re-audit gate: re-run B-1, B-2, B-3, B-8/B-9, and cold-start timing before promoting to production.

---

## Appendix E: Runtime Verification Addendum (2026-11-23)

Audit-only pass against the running instance (`python run_app.py`, 0.0.0.0:8000). No repository source, config, dependency, schema or environment file was modified. Browser automation used Chrome via Playwright; write-path tests were run against an isolated second instance (127.0.0.1:8010 with a throwaway SQLite file outside the repo) so the live database was not exercised for writes.

### E-1 Environment correction: the live database is Neon, not data/app.db

| Item | Earlier assumption | Verified reality |
|------|--------------------|------------------|
| Live DB | `data/app.db` | `.env` `DATABASE_URL` points at Neon Postgres (`neondb`) |
| Live users | 16, 0 admin | 6 users, 1 admin, 2 verified |
| `data/app.db` | the database | Stale local file, last modified 2026-11-20, not used by the running server |
| `otp_hash` column | present | absent from Neon `users`; the OTP path does not exist in the production schema |

Consequences:
- The admin bootstrap question is answered: one admin row already exists in the live DB. The 200 path of the admin endpoints remains NOT TESTED because no admin credentials were available; only 401 (anonymous) and 403 (verified non-admin) were observed.
- Any earlier statement about "the local DB" describes `data/app.db` only and must not be read as production state.
- Because the leaked Neon credential is the credential the running application authenticates with, C-1 is an active-exposure finding, not merely a history-hygiene finding. Rotation is mandatory before deploy.

### E-2 Secret exposure scope (C-1 / C-2 refinement)

| Check | Result |
|-------|--------|
| `.env` tracked by git | no |
| `.env` ignored | yes (`.gitignore:12`) |
| Working-tree scan, 72 files, prefixes `npg_`, `GOCSPX-`, `gsk_`, `re_aE4` | 0 hits |
| `HEAD` `.env.example` | 0 hits |
| Dangling commit `8211ed0` `.env.example` | 1 hit (Neon URL with password) |
| `8211ed0` ancestor of `HEAD` | no |
| Commits reachable from `HEAD` containing `npg_` | 0 |

The leak is confined to a dangling commit still reachable through the reflog. Purge scope is narrower than "all history", but the credential rotation is unchanged and non-negotiable.

### E-3 End-to-end feature results

Browser E2E on the isolated instance: 14 PASS / 2 INFO / 0 FAIL.

| Feature | Result | Evidence |
|---------|--------|----------|
| Landing page renders | PASS | title "IPO Intelligence Terminal / Listing Gain & Range Predictor" |
| Nav: Predictor, Upcoming IPOs, Real Track Record, User Guide, Contact & Feedback | PASS | each tab renders its own heading |
| Phase 1 classifier to `POST /api/predict` | PASS | 200 |
| Phase 2 listing deck to `POST /api/predict` | PASS | 200, expected_gain 39.6, range +9.8% to +63.8% |
| Detailed Analysis expand | PASS | `#know-more-expanded-details` visible |
| Download Report (dossier) modal opens | PASS | `#dossier-close-btn` visible |
| Dossier close button | PASS | modal dismissed |
| Dossier Escape key | INFO (gap) | Escape does not close the modal |
| `POST /api/auth/register` | PASS | 201 |
| Session cookie `ipo_session` | PASS | present and HttpOnly |
| `GET /api/auth/me` | PASS | 200 with user object |
| Unverified GET watchlist | PASS | 200 |
| Unverified POST watchlist and simulation | PASS (gate) | 403 "Email verification required" |
| Verified watchlist POST / GET / DELETE | PASS | 201 / 200 / 200 |
| Verified simulation POST / GET / DELETE | PASS | 201 / 200 / 200 |
| Admin endpoint, verified non-admin | PASS (gate) | 403 |
| UI sign out, re-login, session restore | PASS | 200, 200 |
| Login rate limit | PASS | 5 x 401 then 429 |
| CSRF / origin guard on cookie-auth writes | PASS (gate) | 403 for untrusted origin |
| Forgot-password | PASS | 200, generic message |
| verify-email with bad token | PASS | 400 |
| Sessions API and Sessions modal | PASS | 200, 1 session, modal opens |
| Mobile 390x844 layout and hamburger menu | PASS | no horizontal overflow, menu opens |
| Contact page | PASS (by design) | heading, mailto link, copy button, zero form fields |
| Console errors and failed requests | PASS | none during landing, predict and navigation |

Notes:
- `GET /api/auth/me` returns 200 with a `null` body for guests (`response_model=Optional[UserResponse]`). Assertions must test the body, not the status code.
- `POST /api/feedback` has no frontend consumer; the Contact tab is intentionally mailto-only, so the feedback table is never written from the UI.

### E-4 Documentation path correction

`/api/openapi.json` is 404. Schema and docs are mounted at the root and disabled when `ENVIRONMENT=production` (api.py:78-80):

| Path | Development | Result |
|------|-------------|--------|
| `/openapi.json` | enabled | 200, 32,677 B |
| `/docs` | enabled | 200 |
| `/redoc` | enabled | 200 |
| `/api/openapi.json` | n/a | 404 |

### E-5 Accessibility observations (low)

- Two inputs lack an accessible name: the Phase 1 issue-size input (placeholder-only) and the AI companion chat input.
- No images without `alt` on the landing page.
- The dossier modal does not respond to Escape; focus trapping was not verified.

### E-6 Test-environment hygiene

- One E2E user was created in Neon during an early pass because the harness assumed `data/app.db`. It was removed afterwards (id 54, with 1 session, 1 verification token, 1 reset token, 3 audit rows). Neon is back to 6 users, 1 admin, 0 rows matching `e2e%`.
- The isolated instance on 127.0.0.1:8010 and its throwaway SQLite file are stopped; the main :8000 instance is running and healthy.
- Earlier E2E "failures" (Phase 1 route, theme dropdown, Dial and Range, Detailed Analysis, Contact) were harness selector errors, not product defects, and are excluded from the findings above.

### E-7 Additions to Appendix C (NOT TESTED)

| Area | Reason |
|------|--------|
| Admin endpoint success path (200) | Admin row exists but no admin credentials available |
| Python dependency CVEs | `pip-audit` still not installed |
| Live email delivery (Resend) | No verified domain, no send performed |
| Google OAuth end-to-end flow | Only `/api/auth/google/config` (200) exercised |
| DAST, load and soak testing | No tooling, no staging environment |

### E-8 Verdict (unchanged)

NO-GO for the Render deploy. Verified blockers, in order:

1. C-1: rotate the Neon credential the running app is currently using, then purge the dangling `8211ed0` object and expire the reflog.
2. Commit the 13 modified and 2 untracked files (including `frontend/dist/theme-init.js`, and this report), otherwise a fresh deploy serves an `index.html` that references a missing asset.
3. `render.yaml`: add `FORWARDED_ALLOW_IPS`; confirm `ENVIRONMENT=production` so docs and `/openapi.json` stay disabled.
4. Health-check window: `/api/health` returns 503 until the model is loaded, which conflicts with `healthCheckPath`.
- Startup and artifact hygiene: request-path `initialize_models()` inside `_enrich_upcoming_ipos` and the 17.5 MB committed `models/ipo_models.joblib`.
6. Schema drift: `otp_hash` and `otp_verifications` are dead in production; drop or implement, and introduce Alembic.

Runtime verification strengthens the earlier static verdict: the application surface works end to end, so remaining risk is concentrated in credential exposure, deploy integrity and configuration, not in feature functionality.

---

End of report.
