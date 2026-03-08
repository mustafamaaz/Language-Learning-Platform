# Authentication & Authorization System

This document describes how authentication and authorization work across the Language Learning Platform, covering every file and function involved, how data is stored, and how role-based access control is enforced.

---

## Overview

The system uses **Google OAuth 2.0** for identity verification and a **dual-token strategy** (short-lived JWT access token + long-lived opaque refresh token) for session management. There are two roles: `user` and `admin`. Users never auto-logout; sessions persist indefinitely until the user explicitly logs out.

---

## Database Tables

Defined in `server/src/db/init.js` via `ensureTables()`.

### `users`

| Column      | Type         | Notes                                                |
| ----------- | ------------ | ---------------------------------------------------- |
| id          | UUID (PK)    | Auto-generated via `gen_random_uuid()`               |
| google_id   | TEXT (UNIQUE) | Google account subject ID                            |
| email       | TEXT (UNIQUE) | Google email address                                 |
| name        | TEXT         | Display name from Google profile                     |
| avatar_url  | TEXT         | Profile picture URL                                  |
| role        | TEXT         | `'user'` (default) or `'admin'`, enforced by CHECK   |
| created_at  | TIMESTAMPTZ  | Row creation time                                    |
| updated_at  | TIMESTAMPTZ  | Auto-updated on change via a trigger                 |

### `refresh_tokens`

| Column     | Type         | Notes                                              |
| ---------- | ------------ | -------------------------------------------------- |
| id         | UUID (PK)    | Auto-generated                                     |
| user_id    | UUID (FK)    | References `users(id)`, CASCADE on delete           |
| token_hash | TEXT         | SHA-256 hash of the raw opaque token               |
| created_at | TIMESTAMPTZ  | When the token was issued                          |

Raw refresh tokens are **never stored** in the database. Only their SHA-256 hashes are persisted, so even if the database is compromised, tokens cannot be replayed.

---

## Token Strategy

### Access Token (short-lived)
- **Type**: Signed JWT containing `{ userId, email, role }`
- **Lifetime**: 15 minutes (`ACCESS_TOKEN_EXPIRY` in `authController.js`)
- **Storage**: Held in React state (memory only, never localStorage)
- **Transport**: Sent as `Authorization: Bearer <token>` header on every API request
- **Created by**: `signAccessToken()` in `server/src/controllers/authController.js`

### Refresh Token (long-lived)
- **Type**: 64-byte cryptographically random opaque string
- **Lifetime**: 1 year `maxAge` on the cookie (effectively infinite)
- **Storage**: HttpOnly cookie (`refresh_token`) with `path: /api/auth`
- **Security**: SHA-256 hashed before database storage; **rotated** on every use (old token deleted, new one issued)
- **Created by**: `createRefreshToken()` in `server/src/services/authService.js`
- **Rotated by**: `rotateRefreshToken()` in `server/src/services/authService.js`

### Why This Approach
- Access tokens are short-lived, limiting the damage window if intercepted.
- Refresh tokens are HttpOnly cookies, invisible to JavaScript and safe from XSS.
- Token rotation means a stolen refresh token can only be used once before being invalidated.
- No auto-logout: as long as the refresh cookie exists, the client silently obtains new access tokens.

---

## Login Flow (Step by Step)

### 1. User clicks "Sign in with Google"
- **Client file**: `client/src/pages/LoginPage.tsx` (user login) or `client/src/pages/AdminLoginPage.tsx` (admin login)
- The `<GoogleLogin>` component from `@react-oauth/google` handles the Google consent screen and returns a `credential` (Google ID token).

### 2. Client sends credential to the server
- **Client file**: `client/src/lib/authApi.ts` -> `googleLogin(credential, role?)`
- Sends `POST /api/auth/google` with `{ credential, role }`. The `role` field is `"admin"` only when logging in from the admin portal.

### 3. Server verifies the Google ID token
- **Server file**: `server/src/controllers/authController.js` -> `googleLogin()`
- Uses `google-auth-library`'s `OAuth2Client.verifyIdToken()` to verify the token against `GOOGLE_CLIENT_ID`.
- Extracts the user's `email`, `name`, `picture`, and `sub` (Google ID) from the verified payload.

### 4. Server upserts the user record
- **Server file**: `server/src/services/authService.js` -> `upsertUser()`
- Inserts a new row into the `users` table or updates an existing row matched by `email`.
- The `role` column is **not overwritten** during upsert, so a pre-seeded admin keeps their role.

### 5. Admin role check (admin login only)
- **Server file**: `server/src/controllers/authController.js` -> `googleLogin()`, lines 70-74
- If the request includes `role: "admin"` but the user's database role is not `admin`, the server responds with **403 Forbidden**.

### 6. Server issues tokens
- `signAccessToken(user)` creates a JWT with `{ userId, email, role }`.
- `createRefreshToken(user.id)` generates 64 random bytes, SHA-256 hashes them, stores the hash in `refresh_tokens`, and returns the raw token.
- `setRefreshCookie()` sets the raw token as an HttpOnly cookie: `refresh_token=<userId>:<rawToken>`.

### 7. Client stores the session
- **Client file**: `client/src/contexts/AuthContext.tsx` -> `login()`
- Stores the access token and user object in React state.
- Schedules a background refresh ~13 minutes later via `scheduleRefresh()`.

---

## Session Persistence (Page Refresh)

When the page reloads, React state is lost. The session is restored like this:

1. **`AuthProvider`** mounts and calls `refreshAccessToken()` (`client/src/lib/authApi.ts`).
2. This sends `POST /api/auth/refresh` with `credentials: "include"` so the browser attaches the HttpOnly `refresh_token` cookie automatically.
3. The server's `refresh()` handler (`server/src/controllers/authController.js`) reads the cookie, extracts the `userId` and raw token, and calls `rotateRefreshToken()`.
4. `rotateRefreshToken()` (`server/src/services/authService.js`) hashes the raw token, deletes the matching row from `refresh_tokens`, and creates a new token. This is **token rotation**: the old token is permanently invalidated.
5. The server responds with a new access token and sets a new refresh cookie.
6. The client updates its React state with the new access token and user info.

The `refreshAccessToken()` function in `authApi.ts` includes **inflight deduplication**: concurrent calls share a single HTTP request, preventing race conditions from React Strict Mode's double-mount behavior.

---

## Logout Flow

1. User clicks "Logout" in the `TopNav` component (`client/src/components/TopNav.tsx`).
2. `useAuth().logout()` is called, which invokes `logoutApi()` from `client/src/lib/authApi.ts`.
3. This sends `POST /api/auth/logout` to the server.
4. The server's `logout()` handler (`server/src/controllers/authController.js`) calls `deleteAllRefreshTokens(userId)` (`server/src/services/authService.js`) to remove every refresh token for that user from the database.
5. The server clears the `refresh_token` cookie via `clearRefreshCookie()`.
6. The client clears React state (`accessToken = null`, `user = null`) and redirects to `/login`.

---

## Role-Based Access Control (RBAC)

### How Roles Are Assigned

- **Default role**: Every new user gets `role = 'user'` (enforced by the database `DEFAULT 'user'`).
- **Admin promotion**: Run the seed script from the server directory:

```bash
node src/scripts/seedAdmin.js admin@example.com
```

This calls `promoteToAdmin(email)` in `server/src/services/authService.js`, which either inserts a new user with `role = 'admin'` or updates an existing user's role to `admin`.

### Server-Side Enforcement

Two middleware functions work together as a pipeline:

1. **`authenticate()`** in `server/src/middleware/authenticate.js`
   - Reads the `Authorization: Bearer <token>` header.
   - Verifies the JWT using `jsonwebtoken.verify()`.
   - Attaches the decoded payload (`{ userId, email, role }`) to `req.user`.
   - Returns **401** if the token is missing or invalid.

2. **`authorize(...allowedRoles)`** in `server/src/middleware/authorize.js`
   - A factory function that returns middleware checking `req.user.role` against `allowedRoles`.
   - Returns **403** if the user's role is not in the allowed list.

### Route Protection Matrix (Server)

Defined in `server/src/routes/contentRoutes.js` and `server/src/app.js`:

| Route Pattern                            | Method        | Protection                   |
| ---------------------------------------- | ------------- | ---------------------------- |
| `/api/auth/google`                       | POST          | Public                       |
| `/api/auth/refresh`                      | POST          | Public (cookie-based)        |
| `/api/auth/logout`                       | POST          | Public                       |
| `/api/auth/me`                           | GET           | `authenticate`               |
| `/api/languages`, `/api/curricula` (GET) | GET           | Public                       |
| `/api/curricula/:s/:t` (POST/PUT/DELETE) | POST/PUT/DEL  | `authenticate` + `authorize("admin")` |
| `/api/playground/*`                      | GET           | `authenticate` + `authorize("admin")` |

The `adminOnly` array in `contentRoutes.js` bundles `[authenticate, authorize("admin")]` for reuse.

### Client-Side Enforcement

1. **`ProtectedRoute`** component (`client/src/components/ProtectedRoute.tsx`)
   - Wraps routes that require authentication.
   - Reads `isAuthenticated`, `isAdmin`, and `isLoading` from `useAuth()`.
   - Redirects to `/login` if not authenticated.
   - Redirects to `/` if the route requires `admin` role but the user is not an admin.
   - Renders child routes via `<Outlet />` when access is granted.

2. **Route structure** in `client/src/App.tsx`:

| Path          | Component         | Access          |
| ------------- | ----------------- | --------------- |
| `/login`      | `LoginPage`       | Public          |
| `/admin`      | `AdminLoginPage`  | Public          |
| `/`           | `HomePage`        | Authenticated   |
| `/game`       | `GamePage`        | Authenticated   |
| `/playground` | `PlaygroundPage`  | Admin only      |

3. **TopNav** (`client/src/components/TopNav.tsx`)
   - Conditionally renders the "Playground" button only when `isAdmin` is `true`.
   - Displays the user's avatar and name.
   - Shows a "Logout" button that calls `useAuth().logout()`.

---

## Automatic Token Refresh (API Interceptor)

**File**: `client/src/lib/api.ts`

Every API request goes through `apiRequest()`, which:

1. Calls `authHeaders()` to get the current access token via the `getToken` function registered by `AuthContext`.
2. Attaches `Authorization: Bearer <token>` to the request.
3. If the server responds with **401**, calls `tryRefreshOnce()` to silently obtain a new access token via the refresh endpoint.
4. Retries the original request with the new token.
5. If the refresh also fails, the error propagates and the `AuthContext` clears the session.

The token getter is wired up in `AuthContext.tsx` via `setTokenGetter(getToken)`, linking the auth context to the API module.

---

## File Reference Summary

### Server

| File | Key Functions | Purpose |
| ---- | ------------- | ------- |
| `server/src/db/init.js` | `ensureTables()` | Creates `users` and `refresh_tokens` tables |
| `server/src/services/authService.js` | `upsertUser()`, `findUserById()`, `createRefreshToken()`, `rotateRefreshToken()`, `deleteAllRefreshTokens()`, `promoteToAdmin()` | All database operations for auth |
| `server/src/controllers/authController.js` | `googleLogin()`, `refresh()`, `logout()`, `me()` | HTTP handlers for the auth endpoints |
| `server/src/routes/authRoutes.js` | Router setup | Maps endpoints to controller functions |
| `server/src/middleware/authenticate.js` | `authenticate()` | JWT verification middleware |
| `server/src/middleware/authorize.js` | `authorize()` | Role-checking middleware factory |
| `server/src/routes/contentRoutes.js` | `adminOnly` array | Protects curriculum write routes |
| `server/src/app.js` | Express setup | Mounts auth routes, applies middleware to playground routes |
| `server/src/scripts/seedAdmin.js` | CLI entry point | Promotes a user to admin role |

### Client

| File | Key Functions/Components | Purpose |
| ---- | ------------------------ | ------- |
| `client/src/App.tsx` | `App` | Route definitions with `ProtectedRoute` wrappers |
| `client/src/contexts/AuthContext.tsx` | `AuthProvider`, `useAuth()` | Manages auth state, token refresh scheduling, login/logout |
| `client/src/lib/authApi.ts` | `googleLogin()`, `refreshAccessToken()`, `logoutApi()`, `getCurrentUser()` | HTTP calls to auth endpoints |
| `client/src/lib/api.ts` | `apiRequest()`, `setTokenGetter()`, `tryRefreshOnce()` | Auto-injects auth headers, retries on 401 |
| `client/src/components/ProtectedRoute.tsx` | `ProtectedRoute` | Route guard based on auth state and role |
| `client/src/pages/LoginPage.tsx` | `LoginPage` | Google Sign-In for regular users |
| `client/src/pages/AdminLoginPage.tsx` | `AdminLoginPage` | Google Sign-In for admin users |
| `client/src/components/TopNav.tsx` | `TopNav` | User info display, role-conditional nav, logout button |

---

## Environment Variables

| Variable | Location | Purpose |
| -------- | -------- | ------- |
| `JWT_SECRET` | `server/.env` | Secret key for signing/verifying JWT access tokens |
| `GOOGLE_CLIENT_ID` or `VITE_GOOGLE_CLIENT_ID` | `server/.env` | Google OAuth client ID for server-side token verification |
| `VITE_GOOGLE_CLIENT_ID` | `client/.env` | Google OAuth client ID for the Google Sign-In button |
