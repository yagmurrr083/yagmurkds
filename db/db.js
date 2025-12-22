import postgres from 'postgres'

// SECURITY NOTE: In production, use process.env.DATABASE_URL.
const connectionString = "postgresql://postgres.nsgajaiblzuevodmqozm:sabancidb11@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

// VERCEL/SUPABASE FIX: Disable prepared statements for Transaction Poolers
// Supabase poolers often reject prepared statements, causing 500 errors.
const sql = postgres(connectionString, {
    prepare: false,
    ssl: 'require'
})

export default sql
