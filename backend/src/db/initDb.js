const fs = require('fs');
const path = require('path');
const db = require('./index');

const initDatabase = async () => {
  try {
    const schemaPath = path.join(__dirname, '../../schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.log('schema.sql file not found. Skipping auto-initialization.');
      return;
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('⏳ Connecting to Neon PostgreSQL cloud database and initializing tables...');
    
    await db.query(schemaSql);
    await db.query(`
      ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
      ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'MISSED', 'NO_SHOW'));
    `);
    console.log('✅ Database tables and pre-seeded doctors created successfully on Neon DB!');
  } catch (error) {

    console.error('⚠️ Database initialization notice:', error.message);
  }
};

module.exports = initDatabase;
