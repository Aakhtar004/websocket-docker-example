import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import WebSocket from 'ws'
import url from 'url'
import http from 'http'

import { Pool } from 'pg'

const connectionString = 'postgres://postgres:password@postgres:5432/chat'

// Connection Pool - OPTIMIZATION 1: Replace individual connections
const pool = new Pool({
  connectionString,
  max: 10, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

const PORT = 3000
const app = express()

app.use(bodyParser.json())
app.use(cors())

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const connections = {} // pair off connections by 2's {0,1}, {2,3}

// Database queries
const newMessageQuery = 'INSERT INTO messages(message, sender, createdAt) VALUES($1, $2, $3)'
const getMessagesQuery = 'SELECT * FROM messages WHERE sender = $1 OR sender = $2 ORDER BY createdAt ASC'

// OPTIMIZATION 2: Proper error handling for all async operations
const safeAsync = async (operation, errorMessage = 'Operation failed') => {
  try {
    return await operation()
  } catch (error) {
    console.error(`❌ ${errorMessage}:`, error.message)
    throw error
  }
}

wss.on('connection', async function connection(ws, req) {
  const id = url.parse(req.url, true).query.id

  connections[id] = {
    sender: id,
    ws
  }

  // OPTIMIZATION 3: Handle WebSocket errors properly
  ws.on('error', (error) => {
    console.error(`🚨 WebSocket error for user ${id}:`, error.message)
    delete connections[id]
  })

  ws.on('message', async function incoming(message) {
    await safeAsync(async () => {
      const parsedMessage = JSON.parse(message)

      // Use connection pool instead of creating new connection
      const client = await pool.connect()
      
      try {
        // Build the query to make a new message
        await client.query(newMessageQuery, [
          parsedMessage.message,
          parsedMessage.sender,
          parsedMessage.createdAt
        ])
        
        // calculate the receiver of the message
        const receiver = parsedMessage.sender % 2 === 0 ? parsedMessage.sender + 1 : parsedMessage.sender - 1

        // build query to get the new messages
        const result = await client.query(getMessagesQuery, [
          parsedMessage.sender,
          receiver
        ])

        // send new messages to sender
        if (connections[parsedMessage.sender]) {
          connections[parsedMessage.sender].ws.send(JSON.stringify({ data: result.rows }))
        }

        // find the "Other" person in the chat and send messages
        if (parsedMessage.sender % 2 === 0) {
          if (connections[parsedMessage.sender + 1]) {
            connections[parsedMessage.sender + 1].ws.send(JSON.stringify({ data: result.rows }))
          }
        } else {
          if (connections[parsedMessage.sender - 1]) {
            connections[parsedMessage.sender - 1].ws.send(JSON.stringify({ data: result.rows }))
          }
        }
      } finally {
        client.release() // Always release connection back to pool
      }
    }, `Failed to process message from user ${id}`)
  });

  // OPTIMIZATION 4: Handle initial message load with error handling
  if (id % 2 === 1) {
    await safeAsync(async () => {
      const client = await pool.connect()
      try {
        const result = await client.query(getMessagesQuery, [id, id - 1])
        
        if (connections[id]) {
          connections[id].ws.send(JSON.stringify({ data: result.rows }))
        }
      } finally {
        client.release()
      }
    }, `Failed to load initial messages for user ${id}`)
  }
});

// OPTIMIZATION 5: Handle WebSocket cleanup properly
wss.on('close', (ws) => {
  // Clean up connections
  Object.keys(connections).forEach(key => {
    if (connections[key].ws === ws) {
      delete connections[key]
    }
  })
})

let id = 0;
app.get('/id', (req, res) => res.status(200).send({ id: id++ }))

app.get('/', (req, res) => res.status(200).send('200 OK'))

// OPTIMIZATION 6: Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...')
  pool.end(() => {
    console.log('✅ Database pool closed')
    process.exit(0)
  })
})

server.listen(PORT, function listening() {
  console.log('🚀 Chat API listening on %d', server.address().port);
})
