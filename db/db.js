import postgres from 'postgres'

// VERCEL CONFIGURATION CRITICAL UPDATE:
// Switched port 5432 -> 6543 (Supabase Transaction Pooler)
// This is required for Serverless Functions to prevent connection exhaustion/500 errors.
const connectionString = process.env.DATABASE_URL

const sql = postgres(connectionString, {
    prepare: false, // Required for Transaction Mode
    ssl: {
        rejectUnauthorized: false // Fixes SSL handshake issues
    }
})

export default sql
