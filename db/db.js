import postgres from 'postgres'

// VERCEL CONFIGURATION CRITICAL UPDATE:
// Switched port 5432 -> 6543 (Supabase Transaction Pooler)
// This is required for Serverless Functions to prevent connection exhaustion/500 errors.
const connectionString = "postgresql://postgres.nsgajaiblzuevodmqozm:sabancidb11@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"

const sql = postgres(connectionString, {
    prepare: false, // Required for Transaction Mode
    ssl: {
        rejectUnauthorized: false // Fixes SSL handshake issues
    }
})

export default sql
