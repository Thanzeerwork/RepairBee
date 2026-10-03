const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import route modules
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/users.routes');
const shopRoutes = require('./modules/shops/shops.routes');
const productRoutes = require('./modules/products/products.routes');
const repairRoutes = require('./modules/repairs/repairs.routes');
const quoteRoutes = require('./modules/quotes/quotes.routes');
const paymentRoutes = require('./modules/payments/payments.routes');
const deliveryRoutes = require('./modules/deliveries/deliveries.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const notificationRoutes = require('./modules/notifications/notifications.routes');
const ratingRoutes = require('./modules/ratings/ratings.routes');
const disputeRoutes = require('./modules/disputes/disputes.routes');
const warrantyRoutes = require('./modules/warranty/warranty.routes');
const earningsRoutes = require('./modules/earnings/earnings.routes');
const withdrawalRoutes = require('./modules/withdrawals/withdrawals.routes');
const promoRoutes = require('./modules/promos/promos.routes');
const referralRoutes = require('./modules/referrals/referrals.routes');
const rewardsRoutes = require('./modules/rewards/rewards.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const uploadsRoutes = require('./modules/uploads/uploads.routes');

const app = express();

// ─── Universal CORS & Preflight Handling ─────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  }
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

app.use(cors(corsOptions));

// ─── Security ───────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

// ─── Body Parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Compression ────────────────────────────────────────────────
app.use(compression());

// ─── Logging ────────────────────────────────────────────────────
if (env.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Rate Limiting ──────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ─── Static Files (uploaded media) ──────────────────────────────
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// ─── Health Check ───────────────────────────────────────────────
const API_PREFIX = `/api/${env.API_VERSION}`;

app.get(['/health', `${API_PREFIX}/health`], (req, res) => {
  res.json({
    status: 'ok',
    service: 'repairbee-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ─── API Routes ─────────────────────────────────────────────────

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/shops`, shopRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/repairs`, repairRoutes);
app.use(`${API_PREFIX}/quotes`, quoteRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/deliveries`, deliveryRoutes);
app.use(`${API_PREFIX}/chat`, chatRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/ratings`, ratingRoutes);
app.use(`${API_PREFIX}/disputes`, disputeRoutes);
app.use(`${API_PREFIX}/warranty`, warrantyRoutes);
app.use(`${API_PREFIX}/earnings`, earningsRoutes);
app.use(`${API_PREFIX}/withdrawals`, withdrawalRoutes);
app.use(`${API_PREFIX}/promos`, promoRoutes);
app.use(`${API_PREFIX}/referrals`, referralRoutes);
app.use(`${API_PREFIX}/rewards`, rewardsRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/uploads`, uploadsRoutes);

// ─── 404 & Error Handling ───────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
