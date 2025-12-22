import postgres from 'postgres'

// SECURITY NOTE: In production, use process.env.DATABASE_URL.
const connectionString = "postgresql://postgres.nsgajaiblzuevodmqozm:sabancidb11@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

const sql = postgres(connectionString)

export default sql
