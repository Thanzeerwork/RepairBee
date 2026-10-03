const db = require('../../src/config/database');
const bcrypt = require('bcryptjs');

async function seedShops() {
  const hash = await bcrypt.hash('Shop@123', 10);
  const shopsData = [
    {
      userEmail: 'icare@repairbee.com',
      userName: 'Sanjay Hegde',
      shopName: 'iCare Apple Master Lab',
      desc: 'Certified Apple Specialists • Genuine OEM Retina Displays, Logic Board & Battery Care',
      cat: 'electronics',
      addr: '448, 12th Main Road, Indiranagar',
      city: 'Bangalore',
      pincode: '560038',
      lat: 12.9784,
      lng: 77.6408,
      rating: 4.92,
      ratingsCount: 184,
      jobs: 320,
    },
    {
      userEmail: 'chiplevel@repairbee.com',
      userName: 'Vikas Sharma',
      shopName: 'ChipLevel Laptop Hospital',
      desc: 'Expert Motherboard BGA Rework, Gaming Laptop Cooling & Liquid Damage Recovery',
      cat: 'electronics',
      addr: '80 Feet Road, 4th Block, Koramangala',
      city: 'Bangalore',
      pincode: '560034',
      lat: 12.9345,
      lng: 77.6265,
      rating: 4.85,
      ratingsCount: 142,
      jobs: 245,
    },
    {
      userEmail: 'coolbreeze@repairbee.com',
      userName: 'Ramesh Babu',
      shopName: 'CoolBreeze Appliance Care',
      desc: 'Inverter AC Jet Cleaning, Compressor Overhauls & Refrigerator PCB Diagnosis',
      cat: 'appliances',
      addr: '19th Main, Sector 1, HSR Layout',
      city: 'Bangalore',
      pincode: '560102',
      lat: 12.9116,
      lng: 77.6446,
      rating: 4.75,
      ratingsCount: 98,
      jobs: 160,
    },
    {
      userEmail: 'oledtv@repairbee.com',
      userName: 'Anand Kumar',
      shopName: 'OLED Vision & Smart TV Clinic',
      desc: '4K/8K OLED Panel Bonding, Motherboard Replacement & Home Audio Tuning',
      cat: 'both',
      addr: '33, 4th T Block, Jayanagar',
      city: 'Bangalore',
      pincode: '560041',
      lat: 12.9250,
      lng: 77.5938,
      rating: 4.90,
      ratingsCount: 110,
      jobs: 190,
    },
    {
      userEmail: 'quickfix@repairbee.com',
      userName: 'Praveen Das',
      shopName: 'QuickFix Android Express',
      desc: 'OnePlus, Samsung, Xiaomi & Pixel Same-Day Screen Replacements & Port Cleaning',
      cat: 'electronics',
      addr: 'Prestige Ozone Main Gate, Whitefield',
      city: 'Bangalore',
      pincode: '560066',
      lat: 12.9698,
      lng: 77.7499,
      rating: 4.68,
      ratingsCount: 130,
      jobs: 215,
    }
  ];

  for (const s of shopsData) {
    let userRes = await db.query('SELECT id FROM users WHERE email = $1', [s.userEmail]);
    let uid;
    if (userRes.rows.length === 0) {
      const u = await db.query(
        "INSERT INTO users (name, email, phone, password_hash, role, is_active, referral_code) VALUES ($1, $2, $3, $4, 'shop_owner', true, $5) RETURNING id",
        [s.userName, s.userEmail, '+919876' + Math.floor(100000 + Math.random()*900000), hash, 'SHOP' + Math.floor(100 + Math.random()*900)]
      );
      uid = u.rows[0].id;
    } else {
      uid = userRes.rows[0].id;
    }

    const shopCheck = await db.query('SELECT id FROM shops WHERE user_id = $1', [uid]);
    if (shopCheck.rows.length === 0) {
      await db.query(
        "INSERT INTO shops (user_id, shop_name, description, category, address, city, pincode, lat, lng, avg_rating, total_ratings, total_jobs, is_approved, is_active, opening_time, closing_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, true, '09:00:00', '21:00:00')",
        [uid, s.shopName, s.desc, s.cat, s.addr, s.city, s.pincode, s.lat, s.lng, s.rating, s.ratingsCount, s.jobs]
      );
    }
  }
  console.log('Seeded workshops successfully!');
  process.exit(0);
}

seedShops().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
