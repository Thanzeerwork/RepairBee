-- Seed: Default admin user
-- Password: Admin@123 (bcrypt hash)

INSERT INTO users (name, email, phone, password_hash, auth_provider, role, is_active, referral_code)
VALUES (
  'RepairBee Admin',
  'admin@repairbee.com',
  '+919999999999',
  '$2b$12$x3KZP8M5.8yQtFNytD/PReoVKtUymVzKc.a0fBMbdoCCqFbpqbenK',
  'email',
  'admin',
  true,
  'RBADMIN'
)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
