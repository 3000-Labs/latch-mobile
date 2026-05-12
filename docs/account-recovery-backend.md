# Latch Account Recovery — Backend System Design

## Overview

This document describes the backend system for Latch account recovery. When a user loses their device or reinstalls the app, they need a way to restore their wallet credentials (passkey private key, credential ID, mnemonic) and regain control of their on-chain smart account.

The system uses **email + OTP verification** as the trust anchor, and **AES-256-GCM encryption** to protect the credential blob at rest. The backend is designed in two phases — Phase 1 uses a backend-controlled encryption key (simpler, ships faster); Phase 2 migrates to PBKDF2-derived keys (no stored key material, more robust against backend compromise).

---

## What Is Being Backed Up

The following SecureStore keys are bundled into a single encrypted **credential blob** and uploaded to the backend during onboarding:

| Key | Type | Why it matters |
|---|---|---|
| `latch_passkey_private_key` | P-256 private key (hex, 64 chars) | Signs all transactions; biometric-gated on device |
| `latch_credential_id` | Hex string (32 chars) | Determines `account_salt` → smart account address |
| `latch_key_data_hex` | Hex string (162+ chars) | P-256 public key + credential ID combined |
| `latch_mnemonic` | 12-word BIP-39 phrase | Ed25519 seed; present on import and recovery-phrase paths |
| `latch_smart_account` | Stellar C-address (56 chars) | Deployed Soroban smart account address |

`latch_pin` is **not** backed up — the user sets a new PIN on recovery.

### Credential Blob Shape

```go
type CredentialBlob struct {
    Version           int    `json:"version"`
    PasskeyPrivateKey string `json:"passkey_private_key"` // hex, 64 chars
    CredentialID      string `json:"credential_id"`        // hex, 32 chars
    KeyDataHex        string `json:"key_data_hex"`         // hex, 162+ chars
    SmartAccount      string `json:"smart_account"`        // Stellar C-address
    Mnemonic          string `json:"mnemonic,omitempty"`   // present on import/recovery-phrase paths only
}
```

---

## Encryption Strategy

### Phase 1 — Backend-Controlled Key

The backend generates a unique AES-256 encryption key per user at registration. This key is stored in the `user_encryption_keys` table and never leaves the server.

**Backup flow:**
1. Mobile assembles the credential blob (JSON)
2. Mobile encrypts it: `AES-256-GCM(blob, key=user_encryption_key, iv=random_12_bytes)`
3. Mobile sends `{ encrypted_blob, iv, auth_tag, smart_account_address }` to the backend
4. Backend verifies auth tag, stores the ciphertext

**Recovery flow:**
1. User verifies email OTP → receives a short-lived recovery token (15 min TTL)
2. Mobile sends recovery token → backend decrypts blob using stored key → returns plaintext blob over TLS
3. Mobile writes each key back to SecureStore

> **Why return plaintext over TLS?** The transport (TLS 1.3) is the security boundary. The server already holds the key; returning plaintext is equivalent in security to returning the key — simpler.

### Phase 2 — PBKDF2-Derived Key (Planned)

No key is stored on the server. The key is derived on demand using:

```
encryption_key = PBKDF2(
  password : email + SERVER_PEPPER,
  salt     : user.id (UUID),
  iterations: 600_000,
  keylen   : 32 bytes,
  digest   : SHA-256
)
```

`SERVER_PEPPER` is a secret stored only in the server's environment. Without it, offline brute-force of the key is infeasible even with the email address known.

**Migration:** Existing Phase 1 backups are migrated by:
1. Decrypting with the old backend key
2. Re-encrypting with the PBKDF2-derived key
3. Setting `encryption_version = 2` on the backup row
4. Deleting the row from `user_encryption_keys`

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Language | Go 1.22+ | Native crypto stdlib; single compiled binary; goroutine concurrency |
| Router | chi | Lightweight, idiomatic Go; composable middleware |
| DB driver | pgx/v5 | Fastest Postgres driver for Go; native binary protocol |
| Query layer | sqlc | Generates type-safe Go from raw SQL; no reflection overhead |
| Cache / OTP | Redis via go-redis/v9 | TTL-native OTP storage, fast rate limiting |
| Email | Resend Go SDK | Developer-friendly, reliable deliverability |
| JWT | golang-jwt/jwt/v5 | Standard Go JWT library |
| Config | godotenv + typed struct | Simple, explicit env loading |
| Secrets | Env vars → AWS Secrets Manager (prod) | |
| Deployment | Single static binary in Alpine Docker (~10 MB) → Railway / Fly.io / AWS ECS | |

---

## System Architecture

```
Mobile App
    │
    ▼
┌─────────────────────────────────────────────────────┐
│                 chi Router (Go)                      │
│                                                      │
│   ┌──────────┐   ┌──────────┐   ┌────────────────┐  │
│   │   Auth   │   │  Backup  │   │    Recovery    │  │
│   │ Handler  │   │ Handler  │   │    Handler     │  │
│   └──────────┘   └──────────┘   └────────────────┘  │
│                        │                             │
│   ┌────────────────────▼───────────────────────────┐ │
│   │                Service Layer                   │ │
│   │   OTPService │ EncryptionService │ AuditService│ │
│   └────────────────────┬───────────────────────────┘ │
│                        │                             │
│   ┌────────────────────▼───────────────────────────┐ │
│   │              Store Layer (sqlc)                │ │
│   │          pgx pool │ go-redis client            │ │
│   └────────────────────┬───────────────────────────┘ │
└────────────────────────┼─────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
         ┌────▼─────┐         ┌─────▼────┐
         │ Postgres │         │  Redis   │
         │          │         │          │
         │ users    │         │ OTPs     │
         │ backups  │         │ rate     │
         │ tokens   │         │ limits   │
         │ enc_keys │         │          │
         │ audit    │         └──────────┘
         └──────────┘
```

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Credential backups (one active per user)
CREATE TABLE credential_backups (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_blob        BYTEA NOT NULL,       -- AES-256-GCM ciphertext
  iv                    BYTEA NOT NULL,       -- 12-byte GCM nonce
  auth_tag              BYTEA NOT NULL,       -- 16-byte GCM authentication tag
  encryption_version    SMALLINT DEFAULT 1,  -- 1=backend-key, 2=PBKDF2
  smart_account_address VARCHAR(56),         -- plaintext index (reveals nothing alone)
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)                            -- one active backup per user
);

-- Per-user encryption keys (Phase 1 only; removed in Phase 2)
CREATE TABLE user_encryption_keys (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hex    VARCHAR(64) NOT NULL,           -- AES-256 key, 32 bytes as hex
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL,          -- SHA-256(raw_token)
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable audit trail
CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id),
  action     VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_backups_user_id       ON credential_backups(user_id);
CREATE INDEX idx_refresh_tokens_hash   ON refresh_tokens(token_hash);
CREATE INDEX idx_audit_user_id         ON audit_log(user_id);
CREATE INDEX idx_audit_created_at      ON audit_log(created_at DESC);
```

---

## API Design

**Base URL:** `https://api.latch.app/v1`

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register email, send verification OTP |
| `POST` | `/auth/verify` | Verify OTP → access token + refresh token |
| `POST` | `/auth/refresh` | Rotate refresh token |
| `POST` | `/auth/logout` | Revoke refresh token |

### Backup

| Method | Path | Description |
|---|---|---|
| `POST` | `/backup` | Store encrypted credential blob (requires auth) |
| `GET` | `/backup` | Check if backup exists for authenticated user |
| `PUT` | `/backup` | Update backup (e.g. after passkey rotation) |

### Recovery

| Method | Path | Description |
|---|---|---|
| `POST` | `/recovery/initiate` | Send recovery OTP to email |
| `POST` | `/recovery/verify` | Verify OTP → short-lived recovery token (15 min) |
| `GET` | `/recovery/blob` | Fetch decrypted blob (recovery token required) |

### Request / Response Examples

**`POST /auth/register`**
```json
// Request
{ "email": "user@example.com" }

// Response 200
{ "message": "OTP sent" }
```

**`POST /auth/verify`**
```json
// Request
{ "email": "user@example.com", "otp": "483920" }

// Response 200
{
  "access_token": "eyJ...",
  "refresh_token": "rtk_...",
  "expires_in": 900
}
```

**`POST /backup`**
```json
// Request (Authorization: Bearer <access_token>)
{
  "encrypted_blob": "<base64>",
  "iv": "<base64>",
  "auth_tag": "<base64>",
  "smart_account_address": "CABC..."
}

// Response 201
{ "message": "Backup stored" }
```

**`GET /recovery/blob`**
```json
// Request (Authorization: Bearer <recovery_token>)

// Response 200
{
  "blob": {
    "version": 1,
    "passkey_private_key": "...",
    "credential_id": "...",
    "key_data_hex": "...",
    "smart_account": "...",
    "mnemonic": "..."
  }
}
```

---

## Rate Limiting

All limits are enforced in Redis.

| Endpoint | Limit |
|---|---|
| OTP send (`/auth/register`, `/recovery/initiate`) | 3 requests per email per hour |
| OTP verify (`/auth/verify`, `/recovery/verify`) | 5 attempts per OTP, then invalidate |
| Recovery initiation | 3 per email per day |
| Backup update (`PUT /backup`) | 10 per user per day |
| All endpoints (general) | 100 requests per minute per IP |

OTPs are stored in Redis with a 10-minute TTL. After 5 failed verification attempts the OTP is deleted and the user must request a new one.

---

## Project Structure

```
latch-backend/
├── cmd/
│   └── server/
│       └── main.go               # Entry point — wires everything, starts HTTP server
├── internal/
│   ├── config/
│   │   └── config.go             # Typed env var loading via godotenv
│   ├── handler/
│   │   ├── auth.go               # POST /auth/register, /auth/verify, /auth/refresh, /auth/logout
│   │   ├── backup.go             # POST/GET/PUT /backup
│   │   └── recovery.go           # POST /recovery/initiate, /recovery/verify; GET /recovery/blob
│   ├── service/
│   │   ├── otp.go                # Redis OTP generation and verification
│   │   ├── encryption.go         # AES-256-GCM + PBKDF2 (crypto/aes, crypto/sha256 — stdlib only)
│   │   ├── email.go              # Resend Go SDK integration
│   │   └── audit.go              # Audit log writes
│   ├── middleware/
│   │   ├── auth.go               # JWT verification middleware
│   │   └── ratelimit.go          # Redis-backed rate limiting
│   ├── db/
│   │   ├── queries/              # Raw .sql files (sqlc input)
│   │   │   ├── users.sql
│   │   │   ├── backups.sql
│   │   │   ├── tokens.sql
│   │   │   └── audit.sql
│   │   └── generated/            # sqlc output — type-safe Go DB functions (do not edit)
│   └── store/
│       ├── postgres.go           # pgx connection pool init
│       └── redis.go              # go-redis client init
├── migrations/                   # SQL migration files (goose or plain SQL)
│   ├── 001_create_users.sql
│   ├── 002_create_backups.sql
│   ├── 003_create_enc_keys.sql
│   ├── 004_create_refresh_tokens.sql
│   └── 005_create_audit_log.sql
├── sqlc.yaml                     # sqlc codegen config
├── Dockerfile
├── .env.example
└── go.mod
```

---

## Security Considerations

- **Transport:** TLS 1.3 enforced on all endpoints; HSTS enabled
- **Tokens:** Access tokens expire in 15 minutes; refresh tokens in 30 days (rotated on use)
- **Refresh tokens:** Only the SHA-256 hash is stored — raw token is never persisted
- **OTPs:** 6-digit numeric; 10-minute TTL; max 5 verification attempts; timing-safe comparison
- **Encryption keys (Phase 1):** Stored in a separate table; query requires user ownership check
- **Audit log:** Append-only; records every backup store, recovery initiation, and recovery completion with IP and user agent
- **Email enumeration:** `/auth/register` and `/recovery/initiate` always return the same response regardless of whether the email exists
- **CORS:** Restricted to the Latch mobile app bundle identifier
- **Input validation:** All request bodies decoded into typed Go structs; malformed or missing fields return 400 before reaching handler logic
- **No CGO:** Pure Go crypto (stdlib `crypto/aes`, `crypto/hmac`, `crypto/sha256`) — no C dependencies, simpler builds and smaller binary

---

## Build Order

1. Prisma schema + initial migration
2. Auth flow — register → OTP → tokens → refresh → logout
3. Backup endpoint — store and retrieve
4. Recovery flow — initiate → verify → return blob
5. Mobile integration:
   - Collect email during onboarding
   - Trigger backup at end of onboarding flow
   - Add "Recover Account" entry point on the unlock screen
6. Phase 2 migration — PBKDF2 key derivation, deprecate `user_encryption_keys` table
