# 🐝 RepairBee Backend API

Two-sided repair marketplace API — connects customers who need electronics/appliance repairs with verified local repair shops, handling the full journey: pickup → repair → delivery.

## Quick Start

### 1. Set up environment
```bash
# Copy and edit the env file with your Supabase credentials
cp .env.example .env
# Edit .env with your DATABASE_URL from Supabase
```

### 2. Run database migrations
```bash
npm run db:seed    # Runs migrations + seed data (products, issues, admin user)
```

### 3. Start the server
```bash
npm run dev        # Development with auto-reload
npm start          # Production
```

### 4. Test the API
```
GET  http://localhost:3000/health
POST http://localhost:3000/api/v1/auth/register
POST http://localhost:3000/api/v1/auth/login
```

## Default Admin Account
- **Email:** admin@repairbee.com
- **Password:** Admin@123

## Tech Stack
- **Runtime:** Node.js + Express.js
- **Database:** PostgreSQL (Supabase)
- **Auth:** JWT + Firebase (Google OAuth)
- **Payments:** Razorpay (UPI, Card, Wallet)
- **Real-time Chat:** Socket.io
- **File Uploads:** Multer (local disk)

## API Endpoints

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

### + Deliveries, Chat, Notifications, Ratings, Disputes, Warranty, Earnings, Withdrawals, Promos, Referrals, Analytics

## Project Structure
```
src/
├── config/          # Database, env, Redis config
├── middleware/       # Auth, validation, upload, rate limiting, errors
├── modules/         # 17 domain modules (routes/controller/service/validators)
│   ├── auth/
│   ├── users/
│   ├── shops/
│   ├── products/
│   ├── repairs/     # Core repair order lifecycle
│   ├── quotes/
│   ├── payments/    # Razorpay integration + escrow
│   ├── deliveries/
│   ├── chat/        # Socket.io real-time messaging
│   ├── notifications/
│   ├── ratings/
│   ├── disputes/
│   ├── warranty/
│   ├── earnings/
│   ├── withdrawals/
│   ├── promos/
│   ├── referrals/
│   └── analytics/   # Admin dashboard
├── utils/           # Logger, constants, helpers, error classes
├── app.js           # Express app setup
└── server.js        # Entry point + Socket.io
```

## License
ISC
