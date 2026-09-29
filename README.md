# QueueLess — Universal Digital Queue Management SaaS Platform

> Multi-tenant digital queue management platform built with **Fastify Backend**, **React Frontend**, **PostgreSQL**, and **Prisma ORM**.

---

## 🚀 Key Features

- **3-Role Architecture**:
  1. `APPLICATION_MANAGER`: Platform-level admin controlling businesses, approvals, subscriptions, and audit logs.
  2. `BUSINESS_USER`: Business operator & owner managing branches, services, staff permissions, and real-time live queues.
  3. `CUSTOMER`: Discovers businesses, views real-time waiting times, takes digital tokens, monitors turn countdowns, and checks in.
- **Transactional & Concurrency-Safe Queue Engine**:
  - Atomic `Call-Next` operation protected by PostgreSQL transactions and state transitions to prevent race conditions when multiple operators work simultaneously.
  - Automatic `peopleAhead` and `estimatedWaitMinutes` calculations.
  - Full lifecycle: `WAITING` → `NOTIFIED` → `CALLED` → `CHECKED_IN` → `SERVING` → `SERVED` (or `SKIPPED`, `CANCELLED`, `NO_SHOW`).
- **Real-Time Live Updates**:
  - Fastify WebSocket endpoint (`/ws/queues/:queueId`) dynamically pushes state changes to customer tickets and operator desks.
- **SaaS Subscriptions**:
  - Tiered plans (`Trial`, `Basic`, `Professional`, `Enterprise`) with branch limits, service limits, and queue throughput limits.

---

## 🗄️ Database Setup (PostgreSQL)

Ensure your local PostgreSQL instance is running with the specified database:

```bash
# Database Name: queueless
# Username: postgres
# Password: 12345678
# Port: 5432
```

Connection String:
```env
DATABASE_URL="postgresql://postgres:12345678@localhost:5432/queueless?schema=public"
```

---

## 📦 Getting Started

### 1. Backend Setup (`queueless-backend`)

```bash
cd queueless-backend

# Install dependencies
npm install

# Push Prisma schema to your PostgreSQL database
npx prisma db push

# Seed the database with demo users, subscription plans, and clinics
npm run prisma:seed

# Start the Fastify backend server (Runs on http://localhost:4000)
npm run dev
```

### 2. Frontend Setup (`queueless-frontend`)

Open a new terminal:

```bash
cd queueless-frontend

# Install dependencies
npm install

# Start Vite React dev server (Runs on http://localhost:5173)
npm run dev
```

---

## 🔑 Demo Seed Accounts

The database seed provides ready-to-test accounts for all three roles:

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Application Manager** | `admin@queueless.com` | `admin123` | Platform-wide Admin |
| **Business User** | `dr.sharma@apexclinic.com` | `business123` | Apex Health & Wellness Clinic |
| **Customer** | `rahul.verma@example.com` | `customer123` | Remote Queue Consumer |

> 💡 *Tip*: You can also click the **"Demo Role" buttons** in the top navigation bar to test each role instantly in 1 click!

---

## 📁 Repository Structure

```
QueueLess/
├── queueless-backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema with all models & enums
│   │   └── seed.js             # Initial platform seed
│   ├── src/
│   │   ├── config/             # Environment & server config
│   │   ├── plugins/            # Prisma, JWT auth, WebSocket, CORS
│   │   ├── modules/
│   │   │   ├── auth/           # Login, register, JWT session
│   │   │   ├── businesses/     # Multi-tenant business management
│   │   │   ├── branches/       # Physical branch locations
│   │   │   ├── services/       # Service desks & duration metrics
│   │   │   ├── queues/         # Concurrency-safe Call-Next & Queue engine
│   │   │   ├── queueEntries/   # Entry lifecycle (check-in, skip, serve)
│   │   │   ├── subscriptions/  # SaaS plans & billing
│   │   │   ├── analytics/      # Business & platform analytics
│   │   │   └── admin/          # Business approvals & audit trail
│   │   ├── app.js              # Fastify app setup
│   │   └── server.js           # Server entry point
│   ├── .env                    # Configured with user PostgreSQL credentials
│   └── package.json
└── queueless-frontend/
    ├── src/
    │   ├── context/            # AuthContext & role state
    │   ├── services/           # REST API client & WebSocket helper
    │   ├── pages/
    │   │   ├── customer/       # Discover, Live Ticket, History
    │   │   ├── business/       # Operator Desk, Services, Analytics, Billing
    │   │   ├── admin/          # Command Center, Approvals, Audit Logs
    │   │   └── auth/           # Login & Register
    │   ├── components/         # Navbar, Badges, Modals
    │   ├── App.jsx             # Dynamic role-based router
    │   ├── index.css           # Modern design system
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```
