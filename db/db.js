import postgres from 'postgres'

// SECURITY NOTE: In production, use process.env.DATABASE_URL.
const connectionString = "postgresql://postgres.nsgajaiblzuevodmqozm:sabancidb11@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

// ULTIMATE COMPATIBILITY CONFIG
// 1. prepare: false (Required for Transaction Pooler)
// 2. ssl: object with rejectUnauthorized: false (Fixes self-signed/proxy cert issues on specific environments)
const sql = postgres(connectionString, {
    prepare: false,
    ssl: {
        rejectUnauthorized: false
    }
})

export default sql
