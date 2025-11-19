import { Client } from 'pg'
const connectionString = 'postgres://postgres:password@postgres:5432/chat'

const initClient = async () => {
  const client = new Client({
    connectionString: connectionString,
  })

  try {
    await client.connect()
    console.log('Database connected successfully')
    
    const table = `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS messages(
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        message TEXT,
        sender INTEGER,
        createdAt BIGSERIAL
      )
    `

    await client.query(table)
    console.log('Messages table created successfully')
    return client
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  }
}

export default initClient