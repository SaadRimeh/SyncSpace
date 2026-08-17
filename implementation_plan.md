# Day 2: Authentication, JWT, User Model & Security Middleware

## Overview
Implement the complete, production-grade authentication and user management system for SyncSpace. This includes secure password hashing (bcrypt), JSON Web Token (JWT) generation & validation, user profile management (timezone, currency preferences), Redis session caching for sub-millisecond auth checks, and request validation middleware using Zod.

---

## User Review Required
> [!NOTE]
> All user routes will use JWT bearer tokens (`Authorization: Bearer <token>`). Authenticated user data will be cached in Redis (`session:user:<userId>`) to prevent duplicate database lookups during high concurrency, with automatic invalidation on profile updates.

---

## Proposed Changes

### Core Models & Database Queries

#### [NEW] [userModel.js](file:///c:/Users/Windows.11/Desktop/ProgrammingJob/SyncSpace/backend/src/models/userModel.js)
- `createUser({ email, password_hash, full_name, timezone, currency, avatar_url })`: Inserts new user record returning sanitized object.
- `findByEmail(email)`: Retrieves full user record including `password_hash` for authentication.
- `findById(id)`: Retrieves sanitized user record without `password_hash`.
- `updateProfile(id, { full_name, avatar_url, timezone, currency })`: Updates profile preferences.
- `updatePassword(id, password_hash)`: Updates user's password hash.
- `deleteUser(id)`: Removes user and cascades deletion to all user-owned entities.

---

### Request Validation & Schemas

#### [NEW] [validate.js](file:///c:/Users/Windows.11/Desktop/ProgrammingJob/SyncSpace/backend/src/middleware/validate.js)
- Express middleware wrapper for Zod schemas (`req.body`, `req.query`, `req.params`).
- Returns standardized `400 Bad Request` with structured field errors.

#### [NEW] [authValidation.js](file:///c:/Users/Windows.11/Desktop/ProgrammingJob/SyncSpace/backend/src/validations/authValidation.js)
- `registerSchema`: Email, password (min 8 chars, mixed format), full name (min 2 chars), optional timezone & currency.
- `loginSchema`: Email and password.
- `changePasswordSchema`: Current password and new password with confirmation.
- `updateProfileSchema`: Optional full name, avatar URL, valid IANA timezone string, currency code (e.g. USD, EUR, GBP, JPY).

---

### Security & Authentication Middleware

#### [NEW] [authMiddleware.js](file:///c:/Users/Windows.11/Desktop/ProgrammingJob/SyncSpace/backend/src/middleware/authMiddleware.js)
- `requireAuth`: Verifies `Bearer` JWT token from `Authorization` header.
- Fetches user session from Redis cache (`session:user:<userId>`); falls back to PostgreSQL if cache miss, and caches for 15 minutes.
- Attaches `req.user` to the request object.
- Helper `invalidateUserSession(userId)` to clear cached session upon updates.

---

### Controllers & Routes

#### [NEW] [authController.js](file:///c:/Users/Windows.11/Desktop/ProgrammingJob/SyncSpace/backend/src/controllers/authController.js)
- `register`: Validates uniqueness, hashes password, saves user, signs JWT, caches session, returns 201 with token and user profile.
- `login`: Checks credentials with `comparePassword`, signs JWT, caches session, returns 200 with token and user profile.
- `getMe`: Returns current user's profile from `req.user`.
- `changePassword`: Verifies current password, updates password hash, invalidates session cache.
- `logout`: Clears Redis session cache.

#### [NEW] [userController.js](file:///c:/Users/Windows.11/Desktop/ProgrammingJob/SyncSpace/backend/src/controllers/userController.js)
- `getProfile`: Returns sanitized user details & preferences.
- `updateProfile`: Updates timezone, currency, full name, avatar URL, clears session cache, returns updated record.

#### [NEW] [authRoutes.js](file:///c:/Users/Windows.11/Desktop/ProgrammingJob/SyncSpace/backend/src/routes/authRoutes.js)
- Routes for registration, login, getMe, change-password, and logout.

#### [NEW] [userRoutes.js](file:///c:/Users/Windows.11/Desktop/ProgrammingJob/SyncSpace/backend/src/routes/userRoutes.js)
- Routes for profile retrieval and preferences updates.

#### [MODIFY] [app.js](file:///c:/Users/Windows.11/Desktop/ProgrammingJob/SyncSpace/backend/src/app.js)
- Mount `/api/auth` and `/api/users` routes.

---

### Verification & Testing

#### [NEW] [auth.test.js](file:///c:/Users/Windows.11/Desktop/ProgrammingJob/SyncSpace/backend/src/tests/auth.test.js)
- Comprehensive test suite to execute:
  1. User registration with validation checks.
  2. Duplicate email prevention.
  3. Login with correct and incorrect passwords.
  4. Accessing protected `/api/auth/me` with and without tokens.
  5. Updating user timezone and currency preferences (`PATCH /api/users/profile`).
  6. Changing user password and logging in with new credentials.
  7. Verifying Redis session caching behavior.

---

## Verification Plan

### Automated Tests
- Run test script:
  ```powershell
  node backend/src/tests/auth.test.js
  ```
- Run linter / syntax validation:
  ```powershell
  node backend/src/server.js --test
  ```

### Manual Verification
- Test registration, login, and protected endpoints via curl/HTTP requests.
