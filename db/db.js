import postgres from 'postgres'

// VERCEL CONFIGURATION CRITICAL UPDATE:
// Switched port 5432 -> 6543 (Supabase Transaction Pooler)
// This is required for Serverless Functions to prevent connection exhaustion/500 errors.
const connectionString = process.env.DATABASE_URL


import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

export default sql;

