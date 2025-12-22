import postgres from 'postgres'

// SECURITY NOTE: In production, use process.env.DATABASE_URL.
const connectionString = "postgresql://postgres.nsgajaiblzuevodmqozm:sabancidb11@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

// VERCEL COMPATIBLE CONFIG
// 1. prepare: false (Critical for Supabase Transaction Mode)
// 2. ssl: 'require' (Critical for Cloud Connection)
const sql = postgres(connectionString, {
    prepare: false,
    ssl: 'require'
})

export default sql
