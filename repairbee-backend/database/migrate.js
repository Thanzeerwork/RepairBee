/**
 * Database migration runner.
 * Reads and executes SQL migration files in order.
 * 
 * Usage:
 *   node database/migrate.js          # Run all migrations
 *   node database/migrate.js --seed   # Run seeds after migrations
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SEEDS_DIR = path.join(__dirname, 'seeds');

async function runMigrations() {
  console.log('🐝 RepairBee — Database Migration Runner\n');
  
  const client = await pool.connect();
  
  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get already-executed migrations
    const executed = await client.query('SELECT filename FROM _migrations ORDER BY filename');
    const executedFiles = new Set(executed.rows.map(r => r.filename));

    // Read migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let migrated = 0;

    for (const file of files) {
      if (executedFiles.has(file)) {
        console.log(`  ⏭️  Skipping: ${file} (already executed)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✅ Migrated: ${file}`);
        migrated++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ❌ Failed: ${file}`);
        console.error(`     Error: ${error.message}`);
        throw error;
      }
    }

    if (migrated === 0) {
      console.log('\n  All migrations are up to date.');
    } else {
      console.log(`\n  ✅ ${migrated} migration(s) executed successfully.`);
    }
  } finally {
    client.release();
  }
}

async function runSeeds() {
  console.log('\n🌱 Running seed files...\n');
  
  const client = await pool.connect();
  
  // Seed files must be run in order
  const seedOrder = ['products.sql', 'issue_types.sql', 'admin_user.sql'];

  try {
    for (const file of seedOrder) {
      const filePath = path.join(SEEDS_DIR, file);
      if (!fs.existsSync(filePath)) {
        console.log(`  ⏭️  Skipping: ${file} (not found)`);
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf-8');
      
      try {
        await client.query(sql);
        console.log(`  ✅ Seeded: ${file}`);
      } catch (error) {
        console.error(`  ❌ Seed failed: ${file}`);
        console.error(`     Error: ${error.message}`);
        // Continue with other seeds
      }
    }

    console.log('\n  ✅ Seeding complete.');
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await runMigrations();

    if (process.argv.includes('--seed')) {
      await runSeeds();
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
