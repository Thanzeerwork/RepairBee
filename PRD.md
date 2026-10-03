# 🐝 RepairBee — Product Requirements Document (PRD)

> **Version:** 1.0  
> **Last Updated:** 2026-09-25  
> **Status:** Active Development — MVP Phase  
> **Project Start:** 2026-09-14  

---

## 1. Product Overview & Vision

**RepairBee** is a two-sided repair marketplace that connects customers who need electronics and home appliance repairs with verified local repair shops — handling the full journey: **pickup** from the customer, **repair** at the shop, and **delivery** back to the customer's doorstep.

**Tagline:** *"Swiggy for Repairs"* — transparent pricing, status tracking, and verified shops.

### 1.1 Core Value Propositions

| Stakeholder | Value |
|---|---|
| **Customers** | One-tap repair booking, approve quote before work starts, doorstep pickup & delivery |
| **Repair Shops** | Steady stream of repair jobs, digital dashboard, earnings management |
| **Delivery Partners (Runners)** | Flexible per-km earnings, simple job management |
| **Platform** | Commission on every completed repair job |

### 1.2 Target Market
- **Geography:** Single city MVP (India-first)
- **Categories:** Electronics (phones, laptops, TVs) + Home Appliances (AC, fridge, washing machine)
- **Users:** Urban consumers who need convenient repair services

---

## 2. User Roles & Permissions

### 2.1 Customer
- Register/login via Email + Password or Google OAuth
- Request repair jobs with photos, videos & text
- View shop quotes → approve or reject before work starts
- Track order status at every stage (15-stage pipeline)
- Chat with shop and delivery partner separately
- Rate shop and delivery partner independently
- Manage multiple saved addresses + pick from map
- Pay via In-app Wallet / UPI / Credit/Debit Card
- Apply promo codes and referral codes
- View full repair history
- Cancel order before pickup (full refund)
- Raise disputes post-delivery (within 48 hours)
- Raise warranty re-repair requests within warranty period
- Run hardware diagnostics on devices

### 2.2 Repair Shop (Workshop Owner)
- Self-register → Admin approval required
- View incoming repair requests (product, photos, issue details)
- Send price quote + estimated time to customer
- Update repair status manually at each stage
- Chat with customer
- Manage earnings dashboard + request withdrawal to bank
- View job history with statuses
- Issue warranty on completed repairs (tiered: Silver/Gold/Platinum)
- View ratings and customer reviews
- Clean room QC reporting

### 2.3 Delivery Partner (Runner) — Separate Portal
- Register → Admin approval required
- View admin-assigned pickup and delivery jobs
- Navigate to customer / shop address
- Update delivery status at each stage
- Chat with customer
- View km-based earnings per job
- Request withdrawal to bank
- Tamper-proof pouch system with telemetry
- Video proof vault for pickup/delivery

### 2.4 Admin (Web Dashboard)
- Approve / reject shop registrations
- Approve / reject delivery partner registrations
- Block / unblock customers, shops, delivery partners
- Manually assign delivery partners to jobs
- Resolve disputes and process refunds (3-tier escalation)
- View platform-wide analytics
- Manage promo codes and referral reward settings
- Monitor all active orders and their status
- Manage outbound messaging (SMS/Email/Push)
- Honeycomb Rewards program management

---

## 3. Core User Flows

### 3.1 Customer Repair Journey

```
Register/Login
     │
     ▼
Create Repair Request
(Category → Product → Issue → Media Upload → SOS or Scheduled → Address)
     │
     ▼
Browse & Select Shop
(Listed by Rating + Proximity | Filter by product type)
     │
     ▼
Receive & Approve Quote
(Shop sends price + ETA → Customer approves or rejects)
     │
     ▼
Pay via Wallet / UPI / Card
(Payment held in Escrow)
     │
     ▼
Pickup by Delivery Partner
(Pickup Requested → Partner Assigned → Out for Pickup → Picked Up)
     │
     ▼
Repair at Shop
(Received → Diagnosis → In Progress → Completed)
[Customer notified at each step]
     │
     ▼
Return Delivery to Customer
(Out for Delivery → Delivered)
     │
     ▼
Customer Confirms Delivery
→ Escrow Released to Shop
→ Rate Shop + Delivery Partner
```

### 3.2 Order Status Pipeline (15 Stages)

| Stage | Who Updates |
|---|---|
| Repair Requested | System |
| Quote Sent | Shop |
| Quote Approved | Customer |
| Payment Confirmed | System |
| Pickup Requested | System |
| Delivery Partner Assigned | Admin |
| Out for Pickup | Delivery Partner |
| Picked Up | Delivery Partner |
| Received at Shop | Shop |
| Diagnosis in Progress | Shop |
| Repair in Progress | Shop |
| Repair Completed | Shop |
| Out for Delivery | Delivery Partner |
| Delivered | Delivery Partner |
| Delivery Confirmed | Customer / Auto (24hr) |

### 3.3 SOS vs Scheduled Repair

| Feature | SOS (Urgent) | Scheduled |
|---|---|---|
| Pickup time | ASAP (within 2–4 hrs) | Customer picks date & time slot |
| Priority queue | High priority | Standard queue |
| Pricing | May carry SOS surcharge | Standard quote |
| Shop availability | Only currently open shops | All matching shops |
| Delivery partner | Immediately assigned | Assigned at scheduled time |

---

## 4. Feature Modules

### 4.1 Authentication Module
- Email + Password registration/login
- Google OAuth login (Firebase Auth)
- Phone number OTP verification
- JWT-based session management (access + refresh tokens)
- Password reset via email link
- Separate auth flows for Customer, Shop, Delivery Partner

### 4.2 Repair Request Module
- Product category: Electronics / Home Appliances
- Product type: Phone, Laptop, TV, AC, Fridge, Washing Machine
- Predefined issue checklist per product type
- Text description + Photo + Video upload
- Repair type: SOS (Urgent) or Scheduled (date & time slot)
- Address picker: Saved addresses OR pick on map
- Hardware diagnostic integration

### 4.3 Shop Discovery Module
- Shop listing sorted by: Rating + Proximity
- Search / filter by: Product type, minimum rating
- Shop profile: Name, specialties, rating, reviews, warranty policy, past job count

### 4.4 Quote & Approval Module
- Shop receives request notification
- Shop sends quote: Price (INR) + Estimated repair time
- Customer gets Push + SMS + Email notification
- Customer taps Approve or Reject
- Quote approval triggers payment flow

### 4.5 Payment Module (Razorpay)
- UPI, Credit/Debit Card, Net Banking
- In-app wallet: Top-up and use for payments
- **Escrow flow:**
  - Amount held on quote approval
  - Released to shop after customer confirms delivery
  - Auto-release after 24 hours if customer doesn't respond
- Commission auto-deducted before shop payout
- Promo code / referral discount applied at checkout
- Full refund on cancellation (before pickup)

### 4.6 Delivery Module
- Admin manually assigns delivery partners
- Two delivery legs per order: Pickup leg + Return delivery leg
- Google Maps navigation integration
- Distance calculated via Google Maps Distance Matrix API
- Per-km rate × total km = delivery partner earnings
- Tamper-proof pouch system
- Telemetry tracking (GPS coordinates, timestamps)
- Video proof vault for condition documentation

### 4.7 In-App Chat Module (Socket.io)
- Customer ↔ Shop chat per order
- Customer ↔ Delivery Partner chat per order
- Customer ↔ Support chat
- Text + Image sharing support
- Chat history stored and linked to order

### 4.8 Rating & Review Module
- Post-delivery rating prompt
- Customer rates Shop: 1–5 stars + written review
- Customer rates Delivery Partner: 1–5 stars
- Rolling average rating per shop / delivery partner

### 4.9 Warranty Module (Tiered)
- **Silver Tier:** 30-day warranty
- **Gold Tier:** 90-day warranty  
- **Platinum Tier:** 180-day warranty
- Warranty expiry date shown in customer repair history
- One-tap warranty claim within window
- Creates linked re-repair request (same shop, free of charge)
- New pickup → repair → delivery cycle initiated

### 4.10 Dispute Module (3-Tier Escalation)
- Customer raises dispute within 48 hours of delivery
- Evidence submission: Reason, description, photo/video
- **Tier 1:** Auto-resolution rules
- **Tier 2:** Manual admin review
- **Tier 3:** Arbitration panel
- Resolution types: Approve Refund / Order Re-repair / Reject Dispute
- Escrow holds during dispute

### 4.11 Cancellation Module
- Cancel only before pickup (Delivery Partner not yet out)
- Full refund to original payment method
- Shop and delivery partner notified

### 4.12 Earnings & Payout Module
- **Shop:** Per-job breakdown, commission deducted, net amount, withdrawal to bank
- **Delivery Partner:** Per-job km earnings, pickup + delivery legs shown separately, withdrawal to bank
- Total earnings (week/month/all-time) dashboards

### 4.13 Promo Codes & Referral Module
- Promo Codes: % discount or flat INR off, min order value, expiry, max usage
- Referral Program: Unique codes, referee discount, referrer wallet credit
- Admin creates/manages all promo codes

### 4.14 Notifications Module
- Push Notifications (FCM)
- SMS (Twilio)
- Email (SendGrid/Nodemailer)
- Outbound message scheduling and templating
- All status changes trigger multi-channel notifications

### 4.15 Analytics Module
- **Customer:** Full repair history
- **Shop:** Jobs dashboard, monthly earnings chart
- **Admin:** GMV, commission revenue, orders by category, top shops, partner performance, pending approvals, open disputes

### 4.16 Hardware Diagnostic Module
- Device health scanning before repair
- Diagnostic report generation
- Pre-repair condition documentation

### 4.17 Honeycomb Rewards Program
- Customer loyalty/gamification system
- Points earned on completed repairs
- Redeemable for discounts

### 4.18 Invoice System
- Detailed invoice generation per order
- Breakdown: repair cost, delivery charge, commission, taxes
- Downloadable/printable invoices

---

## 5. Commission & Payment Model

```
Customer Pays ──► Escrow (Platform holds)
                        │
              Customer Confirms Delivery
                        │
               ┌────────┴────────┐
               │                 │
         Commission %       Net Amount
         (Platform keeps)  (Credited to Shop Earnings)

Delivery Partner earnings calculated separately:
  Total KM (pickup leg + return leg) × Per KM Rate = Partner Earning
  (Paid from platform operational budget)
```

- Commission rate: Configurable per category by admin (default 15%)
- Delivery rate: Configurable per-km rate (default ₹10/km)
- Referral reward: ₹50 referrer, ₹100 referee discount

---

## 6. Tech Stack (Implemented)

### 6.1 Backend (`repairbee-backend/`)

| Layer | Technology |
|---|---|
| Runtime | Node.js + Express.js v5 |
| Primary Database | PostgreSQL (Supabase) |
| Cache / OTP | Redis (ioredis) |
| Auth | JWT (access + refresh) + Firebase Admin (Google OAuth) |
| Payments | Razorpay |
| Real-time Chat | Socket.io |
| File Uploads | Multer (local disk) |
| File Storage | AWS S3 (planned) |
| SMS | Twilio (planned) |
| Email | Nodemailer |
| Push Notifications | Firebase Cloud Messaging |
| Logging | Winston |
| Security | Helmet, CORS, Rate Limiting, Compression |
| Scheduling | node-cron |

### 6.2 Customer-Facing Web App (`repairbee-web/`)

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Routing | React Router v7 |
| Icons | Lucide React |
| Maps | Leaflet (OpenStreetMap) |
| HTTP Client | Axios |
| Real-time | Socket.io Client |
| Auth State | Supabase JS Client |
| Animations | Canvas Confetti |
| Port | 5174 |

### 6.3 Admin Dashboard (`repairbee-admin/`)

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Routing | React Router v7 |
| Charts | Recharts |
| Icons | Lucide React |
| HTTP Client | Axios |
| Linting | oxlint |
| Port | 5173 (default) |

### 6.4 Customer Mobile App (`repairbee-app/`)

| Layer | Technology |
|---|---|
| Framework | React Native (Expo SDK 57) |
| Architecture | New Architecture Enabled |
| Navigation | Expo Router v5 (File-based) |
| State Management | Zustand |
| Styling & Theme | Design Tokens System (Warm Amber Palette) |
| Icons | Lucide React Native |
| Fonts | Plus Jakarta Sans + Inter (@expo-google-fonts) |
| Hardware & Sensors | Expo Haptics, ImagePicker, Location, SecureStore |
| HTTP & Sockets | Axios + Socket.io Client |
| Language | TypeScript (Strict Mode) |

---

## 7. Database Schema

**25 migrations** covering all core tables:

| Table | Purpose |
|---|---|
| `users` | All user accounts (customer/shop/delivery/admin) |
| `addresses` | Customer saved addresses with lat/lng |
| `shops` | Repair shop profiles and metadata |
| `products` | Product categories and types |
| `issue_types` | Predefined issues per product |
| `repair_orders` | Core order records with full lifecycle |
| `order_status_logs` | Audit trail of status changes |
| `payments` | Payment records with escrow tracking |
| `deliveries` | Pickup/return delivery legs |
| `chats` | Chat messages (customer↔shop, customer↔partner, support) |
| `ratings` | Ratings and reviews |
| `disputes` | Dispute records with 3-tier escalation |
| `promo_codes` | Promotional codes |
| `referrals` | Referral tracking |
| `withdrawals` | Payout/withdrawal requests |
| `notifications` | Push/SMS/Email notification log |
| `outbound_messages` | Scheduled outbound messaging |
| `honeycomb_rewards` | Loyalty rewards program |

### Additional Columns (via later migrations):
- Runner pouch & telemetry tracking
- Clean room QC report fields
- Warranty tier & plan (Silver/Gold/Platinum)
- Diagnostic report data
- Video proof vault URLs
- Enhanced dispute escrow arbitration

---

## 8. Project Structure

```
Project Repairbee/
├── repairbee-backend/          # Node.js + Express API
│   ├── database/
│   │   ├── migrations/         # 25 SQL migration files
│   │   ├── seeds/              # Seed data (products, issues, admin)
│   │   ├── scripts/
│   │   └── migrate.js          # Migration runner
│   ├── docs/
│   │   └── RepairBee_API.postman_collection.json
│   ├── src/
│   │   ├── config/             # DB, env, Redis config
│   │   ├── middleware/         # Auth, validation, upload, rate limiting, errors
│   │   ├── modules/            # 20 domain modules
│   │   │   ├── analytics/
│   │   │   ├── auth/
│   │   │   ├── chat/
│   │   │   ├── deliveries/
│   │   │   ├── disputes/
│   │   │   ├── earnings/
│   │   │   ├── notifications/
│   │   │   ├── payments/
│   │   │   ├── products/
│   │   │   ├── promos/
│   │   │   ├── quotes/
│   │   │   ├── ratings/
│   │   │   ├── referrals/
│   │   │   ├── repairs/
│   │   │   ├── rewards/
│   │   │   ├── shops/
│   │   │   ├── uploads/
│   │   │   ├── users/
│   │   │   ├── warranty/
│   │   │   └── withdrawals/
│   │   ├── utils/              # Logger, constants, helpers, error classes
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # Entry point + Socket.io
│   ├── .env.example
│   └── package.json
│
├── repairbee-web/              # Customer-facing web app (React + Vite)
│   └── src/
│       ├── api/                # API client modules
│       ├── components/         # Reusable UI components
│       ├── context/            # React context providers
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # Utility libraries
│       ├── pages/
│       │   ├── Home.jsx                # Landing page
│       │   ├── Login.jsx               # Customer login
│       │   ├── Register.jsx            # Customer registration
│       │   ├── BookingWizard.jsx       # Repair request creation flow
│       │   ├── CustomerDashboard.jsx   # Customer order dashboard
│       │   ├── OrderTracking.jsx       # Real-time order tracking
│       │   ├── InvoicePage.jsx         # Invoice view
│       │   ├── HardwareDiagnostic.jsx  # Device diagnostics
│       │   ├── RewardsHub.jsx          # Honeycomb rewards
│       │   ├── WorkshopLogin.jsx       # Shop owner login
│       │   ├── WorkshopPortal.jsx      # Shop owner dashboard
│       │   ├── RunnerLogin.jsx         # Delivery partner login
│       │   ├── RunnerPortal.jsx        # Delivery partner dashboard
│       │   ├── AdminLogin.jsx          # Admin login
│       │   └── AdminPortal.jsx         # Admin dashboard
│       ├── App.jsx
│       └── main.jsx
│
├── repairbee-admin/            # Standalone admin dashboard (React + Vite)
│   └── src/
│       ├── api/                # Admin API client
│       ├── components/         # Admin UI components
│       ├── context/            # Auth context
│       ├── pages/
│       │   ├── Dashboard.jsx   # Overview analytics
│       │   ├── Orders.jsx      # Order management
│       │   ├── Shops.jsx       # Shop approvals & management
│       │   ├── Disputes.jsx    # Dispute resolution
│       │   ├── Payouts.jsx     # Withdrawal/payout processing
│       │   └── Login.jsx       # Admin login
│       ├── App.jsx
│       └── main.jsx
│
├── repairbee-app/              # Customer mobile app (React Native + Expo SDK 57)
│   ├── app/
│   │   ├── (auth)/             # Login, register flows
│   │   ├── (tabs)/             # Home, orders, book, rewards, profile
│   │   ├── chat/[orderId].tsx  # Real-time workshop & runner chat
│   │   ├── order/[id].tsx      # 13-stage order tracking timeline
│   │   ├── quote/[orderId].tsx # Quote review & escrow payment
│   │   ├── rating/[orderId].tsx# Post-delivery dual rating
│   │   ├── shop/[id].tsx       # Verified workshop profile
│   │   ├── booking.tsx         # 5-step repair booking wizard
│   │   ├── diagnostics.tsx     # Hardware test & health scan
│   │   ├── addresses.tsx       # Saved pickup/delivery addresses
│   │   ├── warranties.tsx      # Tiered warranty shield & claims
│   │   ├── dispute/[orderId].tsx # 3-tier dispute escalation & escrow hold
│   │   └── notifications.tsx   # Notification center
│   └── src/
│       ├── api/                # Axios API client
│       ├── stores/             # Zustand auth & session store
│       └── theme/              # Warm Amber design tokens
│
└── PRD.md                      # This document
```

---

## 9. API Endpoints Reference

### Auth (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /register | Register with email/password |
| POST | /login | Login |
| POST | /google | Google OAuth |
| POST | /send-otp | Request phone OTP |
| POST | /verify-otp | Verify OTP |
| POST | /forgot-password | Request password reset |
| POST | /reset-password | Reset password |
| POST | /refresh-token | Refresh JWT |

### Users (`/api/v1/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /profile | Get profile |
| PUT | /profile | Update profile |
| GET/POST/PUT/DELETE | /addresses/* | Address management |

### Shops (`/api/v1/shops`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | Browse shops (proximity sort) |
| POST | /register | Register shop |
| GET | /dashboard | Shop dashboard |
| GET | /:id | Shop profile |

### Repairs (`/api/v1/repairs`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | / | Create repair request |
| GET | / | My orders |
| GET | /:id | Order details + timeline |
| PATCH | /:id/status | Update status |
| PATCH | /:id/cancel | Cancel order |
| POST | /:id/confirm-delivery | Confirm delivery |

### Quotes (`/api/v1/quotes`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /:orderId | Send quote (shop) |
| PATCH | /:orderId/approve | Approve quote |
| PATCH | /:orderId/reject | Reject quote |

### Payments (`/api/v1/payments`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /create-order | Create Razorpay order |
| POST | /verify | Verify payment |
| GET | /wallet | Wallet balance |
| POST | /wallet/topup | Top up wallet |
| POST | /wallet/pay | Pay from wallet |

### Additional Endpoints
- Deliveries, Chat, Notifications, Ratings, Disputes, Warranty, Earnings, Withdrawals, Promos, Referrals, Analytics, Rewards, Uploads

---

## 10. Environment Configuration

### Required Environment Variables
```env
# Server
NODE_ENV=development
PORT=3000

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Redis (OTP caching)
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Firebase (Google OAuth + Push)
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_CLIENT_EMAIL=<email>
FIREBASE_PRIVATE_KEY=<key>

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid (Email)
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@repairbee.com

# Google Maps
GOOGLE_MAPS_API_KEY=AIzaxxx

# Platform Settings
DEFAULT_COMMISSION_RATE=0.15
DELIVERY_RATE_PER_KM=10
REFERRAL_REWARD_AMOUNT=50
REFEREE_DISCOUNT_AMOUNT=100
```

### Default Admin Credentials
- **Email:** admin@repairbee.com
- **Password:** Admin@123

---

## 11. Current Implementation Status

### ✅ Completed

| Component | Status | Details |
|---|---|---|
| Backend API Server | ✅ Done | Express.js with 20 modular route groups |
| Database Schema | ✅ Done | 25 migrations covering all entities |
| Auth System | ✅ Done | Email/password, Google OAuth, OTP, JWT |
| Repair Order Lifecycle | ✅ Done | Full 15-stage status pipeline |
| Quote System | ✅ Done | Send/approve/reject quotes |
| Payment Integration | ✅ Done | Razorpay + wallet + escrow |
| Delivery Management | ✅ Done | Two-leg delivery with km-based earnings |
| Chat System | ✅ Done | Socket.io real-time messaging |
| Rating & Reviews | ✅ Done | Star ratings + written reviews |
| Dispute System | ✅ Done | 3-tier escalation with arbitration |
| Warranty System | ✅ Done | Tiered (Silver/Gold/Platinum) |
| Earnings & Withdrawals | ✅ Done | Dashboard + bank withdrawal |
| Promo Codes | ✅ Done | % and flat discounts |
| Referral Program | ✅ Done | Unique codes + rewards |
| Notifications | ✅ Done | Multi-channel (Push/SMS/Email) |
| Analytics | ✅ Done | Admin dashboard analytics |
| Customer Web App | ✅ Done | 15 pages including portals |
| Admin Dashboard | ✅ Done | 6 pages (Dashboard, Orders, Shops, Disputes, Payouts, Login) |
| Customer Mobile App (React Native) | ✅ Done | 19 screens & flows, Expo SDK 57, New Arch, full booking & escrow |
| Hardware Diagnostics | ✅ Done | Device health scanning (Web & Mobile) |
| Honeycomb Rewards | ✅ Done | Loyalty program |
| Invoice System | ✅ Done | Detailed invoices |
| Runner Pouch System | ✅ Done | Tamper-proof + telemetry |
| Video Proof Vault | ✅ Done | Condition documentation |
| Postman Collection | ✅ Done | Full API testing collection |
| Seed Data | ✅ Done | Products, issues, admin user |

### 🔲 Not Yet Started / Phase 2

| Feature | Priority |
|---|---|
| Delivery Partner (Runner) Mobile App | P1 — Next Phase |
| Real-time GPS tracking (like Swiggy/Zomato) | P1 |
| Multi-city expansion support | P2 |
| Multi-technician management under one shop | P2 |
| Multiple shop branches | P2 |
| AI-based auto shop assignment | P2 |
| Subscription listing plan for shops | P3 |
| B2B / Corporate repair accounts | P3 |
| Loyalty points program expansion | P3 |
| Dark mode | P3 |
| Multi-language support (Malayalam, Hindi) | P3 |

---

## 12. App Screens Reference

### Customer Web App (15 screens)
1. Home (Landing page with repair CTA)
2. Login (Email + Google)
3. Register
4. Booking Wizard (multi-step repair request)
5. Customer Dashboard (active orders, history)
6. Order Tracking (real-time status timeline)
7. Invoice Page
8. Hardware Diagnostic
9. Rewards Hub (Honeycomb points)
10. Workshop Login (for shop owners)
11. Workshop Portal (shop management dashboard)
12. Runner Login (for delivery partners)
13. Runner Portal (delivery job management)
14. Admin Login
15. Admin Portal (full admin dashboard)

### Customer Mobile App (`repairbee-app` — 19 Screens & Flows)
1. Splash & Init Router (`app/index.tsx`)
2. Customer Login with Email/Google/OTP (`app/(auth)/login.tsx`)
3. Customer Registration (`app/(auth)/register.tsx`)
4. Home Tab Dashboard with SOS, Categories & Top Shops (`app/(tabs)/index.tsx`)
5. Orders Tab with Active/Completed Filters (`app/(tabs)/orders.tsx`)
6. Quick Book Launcher (`app/(tabs)/book.tsx`)
7. Honeycomb Rewards Hub & Tier Status (`app/(tabs)/rewards.tsx`)
8. Profile & Wallet Dashboard (`app/(tabs)/profile.tsx`)
9. 5-Step Repair Request Wizard (`app/booking.tsx`)
10. Order Tracking with 13-Stage Timeline (`app/order/[id].tsx`)
11. Quote Review, Promo Code & Escrow Approval (`app/quote/[orderId].tsx`)
12. Real-Time Chat with Workshop & Runner (`app/chat/[orderId].tsx`)
13. Post-Delivery Dual Rating (`app/rating/[orderId].tsx`)
14. Verified Workshop Profile & Reviews (`app/shop/[id].tsx`)
15. Hardware Diagnostics Suite with OLED & Digitizer Grid (`app/diagnostics.tsx`)
16. Saved Addresses Management (`app/addresses.tsx`)
17. Tiered Warranties & Free Re-Repair Claims (`app/warranties.tsx`)
18. 3-Tier Dispute Resolution & Escrow Freeze (`app/dispute/[orderId].tsx`)
19. Notification Center (`app/notifications.tsx`)

### Admin Dashboard (6 screens)
1. Login
2. Dashboard (overview analytics, charts)
3. Orders (order management & status)
4. Shops (shop approval & management)
5. Disputes (dispute resolution queue)
6. Payouts (withdrawal processing)

### Delivery Partner App (Phase 2)
- Runner Mobile App: React Native (dedicated pickup/delivery job portal)

---

## 13. Key Design Decisions & Naming

| Concept | Name in App | Notes |
|---|---|---|
| Delivery Partner | **Runner** | Used in web app and portals |
| Repair Shop | **Workshop** | Used in web portal naming |
| Admin Panel | **Admin Portal** | Both in web app and standalone admin |
| Rewards System | **Honeycomb Rewards** | Bee-themed loyalty program |
| Warranty Tiers | Silver / Gold / Platinum | Tiered warranty structure |
| Escrow | Built-in | Payment held until delivery confirmed |

---

## 14. Running the Project

### Backend
```bash
cd repairbee-backend
cp .env.example .env  # Edit with your credentials
npm install
npm run db:seed       # Run migrations + seed data
npm run dev           # Start on port 3000
```

### Customer Web App
```bash
cd repairbee-web
npm install
npm run dev           # Start on port 5174
```

### Admin Dashboard
```bash
cd repairbee-admin
npm install
npm run dev           # Start on port 5173
```

### Customer Mobile App (Expo / React Native)
```bash
cd repairbee-app
npm install
npx expo start        # Start Metro bundler (press 'a' for Android, 'i' for iOS, 'w' for Web)
```

---

## 15. Notifications Reference

| Event | Push | SMS | Email |
|---|---|---|---|
| Quote received | ✅ | ✅ | ✅ |
| Quote approved/rejected | ✅ | ✅ | ✅ |
| Payment confirmed | ✅ | ✅ | ✅ |
| Partner assigned for pickup | ✅ | ✅ | — |
| Product picked up | ✅ | ✅ | — |
| Repair status change (each step) | ✅ | ✅ | — |
| Out for delivery | ✅ | ✅ | ✅ |
| Delivered | ✅ | ✅ | ✅ |
| Dispute raised / resolved | ✅ | ✅ | ✅ |
| Promo code applied | ✅ | — | — |
| Referral reward earned | ✅ | ✅ | ✅ |
| Withdrawal processed | ✅ | ✅ | ✅ |

---

*This PRD is the single source of truth for the RepairBee project. Read this document at the start of every session to maintain context.*
