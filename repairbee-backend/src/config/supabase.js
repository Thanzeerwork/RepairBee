const { createClient } = require('@supabase/supabase-js');
const env = require('./env');
const db = require('./database');
const logger = require('../utils/logger');

let supabase = null;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

if (env.SUPABASE_URL && supabaseKey) {
  try {
    supabase = createClient(env.SUPABASE_URL, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    logger.info('⚡ Supabase Client initialized successfully');
  } catch (err) {
    logger.error('Failed to initialize Supabase client:', err.message);
  }
} else {
  logger.warn('Supabase URL or Key missing. Supabase auth verification disabled.');
}

/**
 * Verify a Supabase JWT token.
 * @param {string} token - The Bearer token
 * @returns {Promise<object|null>} - The Supabase user object or null
 */
async function verifySupabaseToken(token) {
  if (!supabase) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user;
  } catch (err) {
    logger.debug('Supabase token verification failed:', err.message);
    return null;
  }
}

/**
 * Sync or upsert a Supabase user into the local PostgreSQL users table.
 * @param {object} supabaseUser
 * @returns {Promise<object>} Local database user row
 */
async function syncSupabaseUserToDb(supabaseUser) {
  const email = supabaseUser.email?.toLowerCase();
  const supabaseId = supabaseUser.id;

  // 1. Check if user already exists by email or id
  const existing = await db.query(
    'SELECT id, name, email, phone, role, is_active, profile_pic_url, wallet_balance FROM users WHERE email = $1 OR id::text = $2',
    [email, supabaseId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // 2. Prepare defaults for newly registered Supabase user
  const metadata = supabaseUser.user_metadata || {};
  const rawRole = metadata.role || 'customer';
  // Map frontend role terminology to DB user_role enum
  let role = 'customer';
  if (['shop_owner', 'workshop', 'technician'].includes(rawRole)) role = 'shop_owner';
  else if (['delivery_partner', 'runner'].includes(rawRole)) role = 'delivery_partner';
  else if (rawRole === 'admin') role = 'admin';

  const name = metadata.full_name || metadata.name || email.split('@')[0] || 'RepairBee User';
  const profilePic = metadata.avatar_url || metadata.picture || null;
  const phone = metadata.phone || supabaseUser.phone || null;
  const referralCode = 'RB' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const authProvider = supabaseUser.app_metadata?.provider === 'google' ? 'google' : 'email';

  // 3. Insert into users table
  const insertResult = await db.query(
    `INSERT INTO users (id, name, email, phone, auth_provider, role, profile_pic_url, referral_code, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       profile_pic_url = COALESCE(users.profile_pic_url, EXCLUDED.profile_pic_url)
     RETURNING id, name, email, phone, role, is_active, profile_pic_url, wallet_balance`,
    [supabaseId, name, email, phone, authProvider, role, profilePic, referralCode]
  );

  logger.info(`✨ Synced new Supabase user to PostgreSQL: ${email} (${role})`);
  return insertResult.rows[0];
}

module.exports = {
  supabase,
  verifySupabaseToken,
  syncSupabaseUserToDb,
};
