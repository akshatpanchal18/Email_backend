# TempMail Backend

REST API and real-time backend for a disposable email service. Built with **Express.js**, **TypeScript**, **Prisma**, **PostgreSQL**, and **Socket.IO**.

---

## Live

| Service     | URL                                  |
| ----------- | ------------------------------------ |
| Backend API | _add link here_                      |
| Frontend    | https://tempemail-service.vercel.app |

---

## Tech Stack

| Layer             | Technology                           |
| ----------------- | ------------------------------------ |
| Runtime           | Node.js                              |
| Framework         | Express.js v5                        |
| Language          | TypeScript                           |
| ORM               | Prisma 7                             |
| Database          | PostgreSQL (Neon)                    |
| Real-time         | Socket.IO                            |
| Auth              | JWT + Cookie-based sessions          |
| Validation        | Zod                                  |
| Logging           | Pino + pino-http                     |
| File Storage      | Cloudinary                           |
| Scheduled Cleanup | cron-job.org (external HTTP trigger) |

---

## Architecture

```
                    ┌─────────────────────┐
                    │   Vercel Frontend   │
                    │   React + Vite      │
                    └──────────┬──────────┘
                               │
                     REST API / Socket.IO
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Render Backend    │
                    │ Express + TypeScript │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
                 ▼             ▼             ▼
            PostgreSQL      Socket.IO    Cloudinary
              Neon          Real-time      Images
                 │
                 ▼
             Prisma ORM

cron-job.org
      │
      │ HTTP DELETE /api/v1/cron/email-message
      ▼
Render Backend
      │
      ▼
Delete expired email messages
```

---

## Project Structure

```
src/
├── config/          # Prisma client + Pino logger setup
├── feature/
│   ├── auth/        # Signup, login, logout, session restore
│   ├── mailbox/     # Mailbox CRUD and email message retrieval
│   └── mailgun/     # Inbound email webhook handler
├── helper/          # ApiResponse, ApiError, asyncHandler
├── middleware/       # Auth (JWT + session), Zod validation, error handler, request logger
├── repository/      # Prisma data access layer (User, Session, Mailbox, EmailMessage)
├── service/         # EncryptionService, PasswordService, SocketService
├── types/           # Express request type augmentation
├── util/            # Cron job route, health check
├── app.ts           # Express app setup, routes, middleware
└── index.ts         # HTTP server bootstrap + Socket.IO init

prisma/
├── model/           # Split schema files (user.prisma, mailbox.prisma, email.prisma)
└── schema.prisma    # Root schema with datasource + generator
```

---

## Data Models

### User

Registered account. Owns mailboxes and email messages. Supports soft delete (`is_deleted`, `deletedAt`). Tracks `storage_used_bytes`.

### Session

Server-side session for authenticated users. Stores a `secret_hash` verified against the `temp_session` cookie. Expires after 30 days.

### Mailbox

Has three ownership states via the `OwnerShip` enum:

| Status  | Description                                                          |
| ------- | -------------------------------------------------------------------- |
| `NONE`  | Unclaimed — exists but has no owner                                  |
| `GUEST` | Claimed by a guest — has `guest_secret_hash` for cookie verification |
| `OWNED` | Claimed by a registered user — linked via `owner_id`                 |

### EmailMessage

Inbound emails stored per mailbox. Expires after **2 hours** for guest mailboxes or **15 days** for owned mailboxes. Supports attachments via `EmailAttachment`.

---

## Authentication

Two parallel auth mechanisms share the same `temp_session` cookie:

**User sessions (`type = "u"`)**

- Cookie format: `u.<sessionId>.<secret>`
- On each request: session is fetched from DB, `expiresAt` is checked, and `secret` is bcrypt-compared against `secret_hash`

**Guest sessions (`type = "g"`)**

- Cookie format: `g.<mailboxId>.<secret>`
- Cookie is issued on guest mailbox creation; `guest_secret_hash` is stored on the mailbox
- Currently the hash is stored but not yet verified on subsequent requests

**Access tokens**

- Short-lived JWT sent in `Authorization: Bearer <token>` header
- Used to identify the user on protected routes
- Refreshed via `GET /api/v1/auth/restore` using the session cookie

---

## API Reference

### Auth — `/api/v1/auth`

| Method | Path       | Auth           | Description                            |
| ------ | ---------- | -------------- | -------------------------------------- |
| POST   | `/signup`  | —              | Register a new user                    |
| POST   | `/login`   | —              | Login and receive JWT + session cookie |
| GET    | `/logout`  | Session cookie | Delete session                         |
| GET    | `/restore` | Session cookie | Issue a fresh access token             |

### Mailbox — `/api/v1/mailbox`

| Method | Path                                   | Auth         | Description                              |
| ------ | -------------------------------------- | ------------ | ---------------------------------------- |
| POST   | `/create`                              | Optional JWT | Create or claim a mailbox                |
| GET    | `/mailbox/:address`                    | —            | Get mailbox by address                   |
| GET    | `/my-mailboxes`                        | JWT required | Get all mailboxes for the logged-in user |
| GET    | `/my-messages/:mailboxId`              | —            | Get non-expired messages for a mailbox   |
| PATCH  | `/:mailboxId/messages/:messageId/read` | —            | Mark a message as read                   |

### Mailgun Webhooks — `/api/v1/mailgun`

| Method | Path            | Description                        |
| ------ | --------------- | ---------------------------------- |
| POST   | `/webhook`      | Receive inbound email from Mailgun |
| POST   | `/webhook-test` | Test webhook endpoint              |

### Utility

| Method | Path                         | Description                                                                  |
| ------ | ---------------------------- | ---------------------------------------------------------------------------- |
| GET    | `/awake`                     | Ping — confirms server is running                                            |
| GET    | `/health`                    | Health check                                                                 |
| DELETE | `/api/v1/cron/email-message` | Cron-triggered cleanup of expired messages (requires `x-cron-secret` header) |

---

## Real-time Events (Socket.IO)

Clients join a mailbox room to receive live updates.

| Client → Server | Payload     | Description                     |
| --------------- | ----------- | ------------------------------- |
| `join_mailbox`  | `mailboxId` | Subscribe to a mailbox room     |
| `leave_mailbox` | `mailboxId` | Unsubscribe from a mailbox room |

| Server → Client | Payload           | Description                             |
| --------------- | ----------------- | --------------------------------------- |
| `new_message`   | Full email object | Fired when Mailgun delivers a new email |
| `message_read`  | `{ messageId }`   | Fired when a message is marked as read  |

---

## Mailbox Ownership Flow

```
createMailbox(address, user?)
│
├── Mailbox exists?
│   ├── GUEST  → user logged in?  → claim it (OWNED), clear guest_secret_hash
│   │            guest?           → throw "temporarily taken"
│   ├── OWNED  → same user?       → return existing
│   │            different user?  → throw "permanently taken"
│   └── NONE   → user logged in?  → connect user (OWNED)
│                guest?           → claimAsGuest() → set GUEST + secret + cookie
│
└── Mailbox does not exist?
    ├── user logged in? → create OWNED
    └── guest?         → create GUEST + expiresAt(+2h) + secret + cookie
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
PORT=5000
CLIENT_URL=http://localhost:3000

DATABASE_URL="postgresql://user:password@localhost:5432/db_name"

ACCESS_TOKEN_SECRET=your_jwt_secret
ACCESS_TOKEN_VALIDITY=15m
CRON_SECRET=your_cron_secret

DOMAIN_ADDRESS=@yourdomain.com

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_KEY_SECRET=your_api_key_secret
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run database migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Start dev server
npm run dev
```

### Scripts

| Script                  | Description                                   |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Start dev server with nodemon + tsx           |
| `npm run build`         | Install, generate Prisma, migrate, compile TS |
| `npm start`             | Run compiled output from `dist/`              |
| `npm run prisma:studio` | Open Prisma Studio                            |
| `npm run prisma:reset`  | Reset and re-run all migrations               |
