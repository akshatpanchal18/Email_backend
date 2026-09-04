# TempMail Backend

Backend API for a temporary/disposable email service built with **Express.js**, **TypeScript**, **Prisma**, **PostgreSQL**, and **Socket.IO**.

The backend provides mailbox management, email message handling, authentication/session management, real-time email updates, and scheduled cleanup of expired temporary mailboxes.

## Tech Stack

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Socket.IO
- Zod
- JWT
- Cookie-based Sessions
- Pino / Pino HTTP
- Cloudinary
- cron-job.org

---

## Architecture

```text
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
              Neon          Real-time       Images
                 │
                 ▼
             Prisma ORM

cron-job.org
      │
      │ HTTP request
      ▼
Render Backend
      │
      ▼
Cleanup expired mailboxes/messages
```
