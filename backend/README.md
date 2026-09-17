# Ardab Market - Backend Foundation

Robust, scalable, secure, and performant Node.js + Express.js backend foundation integrated with Prisma ORM and PostgreSQL hosted on Neon, designed to serve the Ardab Market Super Admin and Sub Admin web applications.

---

## 1. Architecture Overview

The backend uses a **unified single server** architecture with **role-segregated domain directories**:

```
                  Frontends (Super Admin / Sub Admin / Future Roles)
                                          ↓
                             Unified Express Backend Server
                                          ↓
      ┌───────────────────────────────────┼───────────────────────────────────┐
      ↓                                   ↓                                   ↓
 /api/admin/*                       /api/customer/*                    /api/seller/*
 (Super Admin & Sub Admin)        (Future Customer Role)             (Future Seller Role)
      ↓                                   ↓                                   ↓
 src/admin/                           src/customer/                      src/seller/
      │                                   │                                   │
      └───────────────────────────────────┼───────────────────────────────────┘
                                          ↓
                                 src/shared/ Core
               (Prisma Singleton, DB Pool, Logger, Central Error Handler)
                                          ↓
                         PostgreSQL on Neon (Pooled & Direct)
```

- **Runtime:** Node.js 20+ (ES Modules, `"type": "module"`)
- **Web Framework:** Express.js 4.x (plain Node.js + Express, zero NestJS)
- **Database & ORM:** PostgreSQL hosted on Neon, managed by Prisma ORM
- **Authentication:** JWT with short-lived tokens and bcrypt password hashing (cost factor 10)
- **Role-Based Access Control (RBAC):** Super Admin vs Sub Admin permission matrix matching frontend contracts
- **Security:** Helmet headers, origin-whitelisted CORS, tiered rate limiting, 1MB payload limits
- **Validation:** Strict declarative schema validation via Zod

---

## 2. Directory Structure

```
backend/
├── prisma/
│   ├── schema.prisma                   # Single source of truth for PostgreSQL database
│   └── seed.js                         # Development seeder for Super Admin & Sub Admin
│
├── src/
│   ├── app.js                          # Express app pipeline & route mounting
│   ├── server.js                       # HTTP listener, lifecycle & graceful shutdown
│   │
│   ├── shared/                         # Core infrastructure shared across all roles
│   │   ├── config/
│   │   │   ├── env.js                  # Centralized env validation & loading
│   │   │   ├── database.js             # Singleton PrismaClient instance & pool management
│   │   │   └── security.js             # Helmet, CORS, and Rate Limiting configurations
│   │   ├── middleware/
│   │   │   ├── error.middleware.js     # Centralized error handler (Prisma, JWT, ApiError)
│   │   │   ├── notFound.middleware.js  # Standard 404 response handler
│   │   │   ├── rateLimit.middleware.js # General & Auth rate limiters
│   │   │   ├── requestId.middleware.js # Correlation ID (X-Request-ID) tracing
│   │   │   └── validate.middleware.js  # Zod schema validation middleware
│   │   ├── utils/
│   │   │   ├── asyncHandler.js         # Async route wrapper
│   │   │   ├── apiResponse.js          # Standardized response formatters & ApiError
│   │   │   ├── logger.js               # Structured logger with sensitive-data scrubbing
│   │   │   └── pagination.js           # Safe pagination helper (default 25, max 100)
│   │   └── constants/
│   │       ├── roles.js                # Platform roles
│   │       └── statuses.js             # User & Session status enums
│   │
│   ├── admin/                          # UNIQUE FOLDER FOR SUPER ADMIN & SUB ADMIN
│   │   ├── routes/
│   │   │   ├── index.js                # Combines all admin endpoints
│   │   │   ├── health.routes.js        # Health check endpoint
│   │   │   └── auth.routes.js          # Shared login, me, and logout endpoints
│   │   ├── controllers/
│   │   │   ├── health.controller.js
│   │   │   └── auth.controller.js
│   │   ├── services/
│   │   │   ├── health.service.js       # Health check & DB ping
│   │   │   └── auth.service.js         # Credential validation & token issuance
│   │   ├── middleware/
│   │   │   ├── adminAuth.middleware.js # Admin JWT verification
│   │   │   └── adminPermission.middleware.js # RBAC & permission checking
│   │   ├── validators/
│   │   │   └── auth.validator.js       # Zod login & password schemas
│   │   ├── constants/
│   │   │   ├── adminRoles.js           # SUPER_ADMIN, SUB_ADMIN
│   │   │   └── adminPermissions.js     # Permission matrix matching frontend
│   │   └── modules/                    # Sub-structures for future admin modules
│   │       ├── superadmin/             # Commercial (products, orders, customers, fleet)
│   │       └── subadmin/               # Governance (support, maintenance, security)
│   │
│   ├── customer/                       # Prepared unique folder for Customer role
│   ├── seller/                         # Prepared unique folder for Seller role
│   └── delivery/                       # Prepared unique folder for Delivery role
│
├── tests/                              # Automated integration tests
├── .env.example                        # Template environment variables (safe)
├── .env                                # Local environment variables (git-ignored)
├── .gitignore
├── package.json
└── README.md
```

---

## 3. Prerequisites

- **Node.js**: `v20.0.0` or higher (verified on Node `v24.17.0`)
- **npm**: `v10.0.0` or higher
- **Neon PostgreSQL account** (or local PostgreSQL instance)

---

## 4. Installation & Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` file from `.env.example`:
   ```bash
   copy .env.example .env
   ```

---

## 5. Environment Variables Configuration

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `development` / `production` |
| `PORT` | HTTP Server port | `5000` |
| `DATABASE_URL` | Neon pooled connection string | `postgresql://user:pass@ep-pooler.neon.tech/db?sslmode=require` |
| `DIRECT_URL` | Neon direct connection string (for migrations) | `postgresql://user:pass@ep.neon.tech/db?sslmode=require` |
| `JWT_SECRET` | Secret key for signing admin tokens | Min 32 random characters |
| `JWT_EXPIRES_IN` | Token lifespan | `1d` |
| `CORS_ORIGIN` | Comma-separated allowed frontend origins | `http://localhost:3000,http://localhost:3001` |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting window in milliseconds | `900000` (15 minutes) |
| `RATE_LIMIT_MAX` | Max general API requests per window | `100` |
| `AUTH_RATE_LIMIT_MAX` | Max authentication attempts per window | `10` |
| `BREVO_API_KEY` | Brevo Transactional Email API Key | Backend secret |
| `BREVO_SENDER_EMAIL` | Sender email address | `no-reply@ardabmarket.com` |
| `BREVO_SENDER_NAME` | Sender display name | `Ardab Market` |
| `FRONTEND_URL` | Public frontend base URL for password reset links | `http://localhost:3000` |

---

## 6. Neon PostgreSQL Integration & Prisma Workflow

Neon utilizes a connection pooler for serverless scaling and concurrent connections. Prisma is configured to support both pooled runtime connections and direct migration links:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Database Commands

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Run Migrations (Development):**
   ```bash
   npx prisma migrate dev --name add_admin_auth_security
   ```

3. **Deploy Migrations (Production):**
   ```bash
   npx prisma migrate deploy
   ```
   > [!IMPORTANT]
   > Do NOT use `prisma db push` in production. Always use version-controlled Prisma migrations.

4. **Seed Development Database:**
   ```bash
   npm run seed
   ```
   Creates development accounts:
   - **Super Admin:** `admin@ardabmarket.com` / `admin123`
   - **Sub Admin:** `subadmin@ardabmarket.com` / `subadmin123`

5. **Prisma Studio (Visual Database GUI):**
   ```bash
   npm run prisma:studio
   ```

---

## 7. Testing & Verification Commands

The backend includes purpose-built verification scripts to safely test database connectivity, Prisma integration, transactions, and API routes without exposing credentials:

### 1. Test Database Connectivity (Raw Neon PostgreSQL)
Verifies DNS, TLS/SSL encryption handshake, authentication, and execution of `SELECT 1`:
```bash
npm run db:test
```

### 2. Test Prisma Client & Transactions
Verifies Prisma singleton initialization, connection, queries, and interactive `$transaction` rollback/commit atomicity:
```bash
npm run prisma:test
```

### 3. Validate Prisma Schema
Verifies schema syntax and datasource configuration:
```bash
npm run prisma:validate
```

### 4. Run Full Integration Test Suite
Executes the comprehensive automated test suite (53 tests) covering Health probes, CRUD, Transactions, JWT Auth, Server-Side Session Revocation, Forgot/Reset Password flows, Email OTP verification, RBAC guards, and Middlewares:
```bash
npm test
```

---

## 8. Development & Running

- **Start with native watch mode (development):**
  ```bash
  npm run dev
  ```
- **Start production server:**
  ```bash
  npm start
  ```
- **Launch Prisma Studio (Database GUI):**
  ```bash
  npm run prisma:studio
  ```

---

## 9. API Endpoints

### Health, Liveness & Readiness Probes
- `GET /api/health` (or `/api/admin/health`):
  - Comprehensive health check verifying API uptime and Neon PostgreSQL connection.
- `GET /api/health/live`: Fast process liveness probe (`{ "status": "alive" }`).
- `GET /api/health/ready`: Dependency readiness probe (`{ "status": "ready", "database": "connected" }`).

### Administrative Authentication & Security
- `POST /api/auth/login`: Shared login for Super Admin and Sub Admin. Returns JWT token and creates active session record.
- `POST /api/auth/logout`: Revokes current server-side session and clears auth cookie.
- `GET /api/auth/me`: Retrieves current authenticated admin profile.
- `POST /api/auth/forgot-password`: Generates secure password reset token and sends Brevo email (Enumeration-safe).
- `POST /api/auth/reset-password`: Resets password using token, revokes active sessions, and updates password atomically.
- `POST /api/auth/request-otp`: Dispatches 6-digit verification OTP code via email (Enumeration-safe).
- `POST /api/auth/verify-otp`: Verifies 6-digit OTP code with attempt limiting (max 5 attempts).

---

## 10. Security Principles

1. **No Credentials in Frontend:** Database connection strings, Brevo API keys, and JWT secrets exist ONLY in backend `.env`.
2. **Never Return Passwords or Tokens:** Password hashes, raw reset tokens, and raw OTP codes are never returned in API responses or logged.
3. **No Sensitive Data in Logs:** The structured logger automatically redacts passwords, tokens, and authorization headers.
4. **Server-Side Session Revocation:** Validates active session records in `admin_sessions` on every request, enabling immediate revocation upon logout or password reset.
5. **Enumeration Protection:** Forgot-password and OTP request endpoints return generic successful messages regardless of account registration status.
6. **Rate Limiting:** Separate rate limiters protect login, password reset, and OTP endpoints from brute-force attacks.


---

## 10. Graceful Shutdown

The backend process listens for `SIGINT` and `SIGTERM` signals:
1. Stops accepting incoming requests.
2. Allows in-flight HTTP requests to complete.
3. Disconnects the Prisma Client cleanly to release Neon pool connections.
4. Exits safely.
