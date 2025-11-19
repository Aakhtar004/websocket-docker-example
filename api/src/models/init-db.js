const { Client } = require('pg');
const connectionString = 'postgres://postgres:password@postgres:5432/chat';

const initDatabase = async () => {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    // Create table with error handling
    const createTableQuery = `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      CREATE TABLE IF NOT EXISTS messages(
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
        message TEXT NOT NULL, 
        sender INTEGER NOT NULL, 
        createdAt BIGSERIAL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
      CREATE INDEX IF NOT EXISTS idx_messages_createdAt ON messages(createdAt);
    `;
    
    await client.query(createTableQuery);
    console.log('✅ Messages table created successfully');
    
    // Verify table exists
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'messages'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Table verification successful');
    } else {
      throw new Error('Table creation failed');
    }
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
};

// Run if called directly
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('🎉 Database initialized successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to initialize database:', error);
      process.exit(1);
    });
}

module.exports = initDatabase;