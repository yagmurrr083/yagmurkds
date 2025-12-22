import postgres from 'postgres'

// SECURITY NOTE: In production, use process.env.DATABASE_URL.
const connectionString = "postgresql://postgres.nsgajaiblzuevodmqozm:sabancidb11@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

// REVERTED FIX: Removed strict 'ssl' object which breaks local Windows connection.
// Kept 'prepare: false' as it is critical for Supabase Transaction Mode on Vercel.
// Postgres.js usually negotiates SSL automatically with Supabase.
const sql = postgres(connectionString, {
    prepare: false
})

export default sql
