# Heart of BizMate — Backend API

The independent, secure backend for MHI BizMate. This is a standalone Node.js
application that runs **outside** the Base44 frontend runtime. It validates
Supabase access tokens, enforces workspace authorization, and routes every
business mutation through the Heart of BizMate before touching the database.

## Architecture

```
Frontend (Base44)  →  VITE_BACKEND_URL  →  Heart of BizMate API (/api/v1)
                                              ↓
                                    ┌───────────────────────┐
                                    │  Auth (Supabase JWT)  │
                                    │  Workspace resolver   │
                                    │  Permission check     │
                                    │  Business validation   │
                                    │  DB transaction        │
                                    │  Audit log             │
                                    └───────────────────────┘
                                              ↓
                                    Supabase (service-role key)
                                    RLS as second boundary
```

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in:
#   SUPABASE_URL              — your Supabase project URL
#   SUPABASE_SERVICE_ROLE_KEY  — service-role key (NEVER expose to frontend)
#   CORS_ALLOWED_ORIGINS       — the published app URL
```

### 3. Run the database migrations

Run migrations `0001` through `0006` in the Supabase SQL Editor (in order).
Each migration is idempotent (`create table if not exists`, `create or replace function`).

### 4. Start the server

```bash
npm start          # production
npm run dev        # development (auto-reload)
```

The API listens on `http://localhost:3001` (or `PORT` in .env).

### 5. Connect the frontend

The backend URL is embedded in `src/api/backendConfig.js` (Base44's build
pipeline does not inject `.env` into the frontend bundle). Update
`BACKEND_URL` there to point to your deployed backend, then republish.

The frontend automatically switches from offline preview stubs to real HTTP
adapters when `BACKEND_URL` is non-empty. No other code changes required.

## API Endpoints (v1)

All endpoints require `Authorization: Bearer <supabase_access_token>`.

| Method | Path                          | Description                     |
|--------|-------------------------------|---------------------------------|
| GET    | /api/v1/customers             | List customers                  |
| POST   | /api/v1/customers             | Create customer                 |
| PATCH  | /api/v1/customers/:id          | Update customer                 |
| DELETE | /api/v1/customers/:id          | Delete customer                 |
| GET    | /api/v1/products              | List products                   |
| POST   | /api/v1/products              | Create product                  |
| PATCH  | /api/v1/products/:id           | Update product / stock           |
| DELETE | /api/v1/products/:id           | Delete product                  |
| GET    | /api/v1/orders                | List orders                     |
| POST   | /api/v1/orders                | Create order (atomic, stock-safe)|
| PATCH  | /api/v1/orders/:id             | Update order / change status    |
| GET    | /api/v1/orders/:id/items      | Get order items                 |
| GET    | /api/v1/leads                 | List leads                      |
| POST   | /api/v1/leads                 | Create lead                     |
| GET    | /api/v1/transactions          | List transactions               |
| POST   | /api/v1/transactions          | Create transaction               |
| DELETE | /api/v1/transactions          | Delete by filter                |
| GET    | /api/v1/notifications         | List notifications              |
| PATCH  | /api/v1/notifications/:id      | Mark read                       |
| GET    | /api/v1/business              | Get business profile            |
| PATCH  | /api/v1/business              | Update business profile          |
| GET    | /api/v1/dashboard             | Computed business metrics       |
| GET    | /api/v1/conversations         | List conversations              |
| GET    | /api/v1/conversations/:id/messages | List messages              |
| GET    | /api/v1/sourcing/suppliers    | List suppliers                  |
| POST   | /api/v1/sourcing/suppliers     | Create supplier                 |
| GET    | /api/v1/sourcing/purchases    | List purchases                  |
| GET    | /api/v1/marketing             | List campaigns                  |
| GET    | /api/v1/automation/settings   | List automation settings        |
| GET    | /api/v1/automation/usage      | Get AI usage                    |
| POST   | /api/v1/heart/propose          | AI action proposal (Heart)     |
| GET    | /api/v1/heart/actions         | List valid Heart actions        |

## Security

- **Service-role key** is server-side only. The frontend never sees it.
- **JWT validation** via `supabase.auth.getUser(token)` — no local secret needed.
- **Workspace isolation** — every query is scoped by the server-resolved
  `workspace_id`. The client cannot supply a different workspace.
- **RLS** remains enabled on all tables as a second boundary.
- **Audit logging** on all business-critical mutations.
- **Rate limiting** on all endpoints; tighter limit on AI proposals.
- **CORS** restricted to configured origins.
- **Helmet** for security headers.

## Deployment

Deploy to any Node.js host (Railway, Render, Fly.io, a VPS, etc.):

```bash
npm install --production
npm start
```

Set the environment variables from `.env.example` in your host's dashboard.