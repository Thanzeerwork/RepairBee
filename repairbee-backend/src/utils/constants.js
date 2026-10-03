/**
 * Constants and enums used across the RepairBee backend.
 */

// User roles
const ROLES = {
  CUSTOMER: 'customer',
  SHOP_OWNER: 'shop_owner',
  DELIVERY_PARTNER: 'delivery_partner',
  ADMIN: 'admin',
};

// Auth providers
const AUTH_PROVIDERS = {
  EMAIL: 'email',
  GOOGLE: 'google',
};

// Product categories
const PRODUCT_CATEGORIES = {
  ELECTRONICS: 'electronics',
  APPLIANCES: 'appliances',
};

// Order types
const ORDER_TYPES = {
  SOS: 'sos',
  SCHEDULED: 'scheduled',
};

// Repair order statuses (in lifecycle order)
const ORDER_STATUS = {
  REPAIR_REQUESTED: 'repair_requested',
  QUOTE_SENT: 'quote_sent',
  QUOTE_APPROVED: 'quote_approved',
  QUOTE_REJECTED: 'quote_rejected',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  PICKUP_REQUESTED: 'pickup_requested',
  PARTNER_ASSIGNED: 'partner_assigned',
  OUT_FOR_PICKUP: 'out_for_pickup',
  PICKED_UP: 'picked_up',
  RECEIVED_AT_SHOP: 'received_at_shop',
  DIAGNOSIS_IN_PROGRESS: 'diagnosis_in_progress',
  REPAIR_IN_PROGRESS: 'repair_in_progress',
  REPAIR_COMPLETED: 'repair_completed',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  DELIVERY_CONFIRMED: 'delivery_confirmed',
  CANCELLED: 'cancelled',
};

// Valid status transitions (state machine)
const STATUS_TRANSITIONS = {
  [ORDER_STATUS.REPAIR_REQUESTED]: [ORDER_STATUS.QUOTE_SENT, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.QUOTE_SENT]: [ORDER_STATUS.QUOTE_APPROVED, ORDER_STATUS.QUOTE_REJECTED],
  [ORDER_STATUS.QUOTE_APPROVED]: [ORDER_STATUS.PAYMENT_CONFIRMED, ORDER_STATUS.REPAIR_IN_PROGRESS, 'in_repair'],
  [ORDER_STATUS.QUOTE_REJECTED]: [ORDER_STATUS.REPAIR_REQUESTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PAYMENT_CONFIRMED]: [ORDER_STATUS.PICKUP_REQUESTED],
  [ORDER_STATUS.PICKUP_REQUESTED]: [ORDER_STATUS.PARTNER_ASSIGNED],
  [ORDER_STATUS.PARTNER_ASSIGNED]: [ORDER_STATUS.OUT_FOR_PICKUP, ORDER_STATUS.PICKED_UP],
  [ORDER_STATUS.OUT_FOR_PICKUP]: [ORDER_STATUS.PICKED_UP],
  [ORDER_STATUS.PICKED_UP]: [ORDER_STATUS.RECEIVED_AT_SHOP],
  [ORDER_STATUS.RECEIVED_AT_SHOP]: [ORDER_STATUS.DIAGNOSIS_IN_PROGRESS, ORDER_STATUS.REPAIR_IN_PROGRESS, 'in_repair', 'diagnosing'],
  [ORDER_STATUS.DIAGNOSIS_IN_PROGRESS]: [ORDER_STATUS.REPAIR_IN_PROGRESS, 'in_repair'],
  'diagnosing': [ORDER_STATUS.REPAIR_IN_PROGRESS, 'in_repair', ORDER_STATUS.QUOTE_SENT],
  [ORDER_STATUS.REPAIR_IN_PROGRESS]: [ORDER_STATUS.REPAIR_COMPLETED, 'quality_check'],
  'in_repair': [ORDER_STATUS.REPAIR_COMPLETED, 'quality_check'],
  'quality_check': [ORDER_STATUS.REPAIR_COMPLETED, ORDER_STATUS.OUT_FOR_DELIVERY, 'assigned_delivery'],
  [ORDER_STATUS.REPAIR_COMPLETED]: [ORDER_STATUS.OUT_FOR_DELIVERY, 'assigned_delivery'],
  'assigned_delivery': [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.DELIVERY_CONFIRMED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.DELIVERY_CONFIRMED],
  [ORDER_STATUS.DELIVERY_CONFIRMED]: [], // Terminal state
  [ORDER_STATUS.CANCELLED]: [], // Terminal state
};

// Escrow statuses
const ESCROW_STATUS = {
  PENDING: 'pending',
  HELD: 'held',
  RELEASED: 'released',
  REFUNDED: 'refunded',
};

// Payment methods
const PAYMENT_METHODS = {
  WALLET: 'wallet',
  UPI: 'upi',
  CARD: 'card',
  NET_BANKING: 'net_banking',
};

// Delivery leg types
const DELIVERY_LEG = {
  PICKUP: 'pickup',
  RETURN: 'return',
};

// Delivery statuses
const DELIVERY_STATUS = {
  ASSIGNED: 'assigned',
  OUT_FOR_PICKUP: 'out_for_pickup',
  PICKED_UP: 'picked_up',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
};

// Chat types
const CHAT_TYPES = {
  CUSTOMER_SHOP: 'customer_shop',
  CUSTOMER_PARTNER: 'customer_partner',
  CUSTOMER_SUPPORT: 'customer_support',
};

// Dispute statuses
const DISPUTE_STATUS = {
  OPEN: 'open',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
};

// Dispute resolution types
const RESOLUTION_TYPES = {
  REFUND: 'refund',
  RE_REPAIR: 're_repair',
  REJECTED: 'rejected',
};

// Withdrawal statuses
const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  FAILED: 'failed',
};

// Promo discount types
const DISCOUNT_TYPES = {
  PERCENT: 'percent',
  FLAT: 'flat',
};

// Shop categories
const SHOP_CATEGORIES = {
  ELECTRONICS: 'electronics',
  APPLIANCES: 'appliances',
  BOTH: 'both',
};

// Notification types
const NOTIFICATION_TYPES = {
  QUOTE_RECEIVED: 'quote_received',
  QUOTE_APPROVED: 'quote_approved',
  QUOTE_REJECTED: 'quote_rejected',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  PARTNER_ASSIGNED: 'partner_assigned',
  PICKUP_STATUS: 'pickup_status',
  REPAIR_STATUS: 'repair_status',
  DELIVERY_STATUS: 'delivery_status',
  DISPUTE: 'dispute',
  PROMO: 'promo',
  REFERRAL: 'referral',
  WITHDRAWAL: 'withdrawal',
  GENERAL: 'general',
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

module.exports = {
  ROLES,
  AUTH_PROVIDERS,
  PRODUCT_CATEGORIES,
  ORDER_TYPES,
  ORDER_STATUS,
  STATUS_TRANSITIONS,
  ESCROW_STATUS,
  PAYMENT_METHODS,
  DELIVERY_LEG,
  DELIVERY_STATUS,
  CHAT_TYPES,
  DISPUTE_STATUS,
  RESOLUTION_TYPES,
  WITHDRAWAL_STATUS,
  DISCOUNT_TYPES,
  SHOP_CATEGORIES,
  NOTIFICATION_TYPES,
  PAGINATION,
};
