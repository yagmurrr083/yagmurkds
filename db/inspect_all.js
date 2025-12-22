import sql from './db.js'

async function listTables() {
    try {
        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `
        console.log('Tables found:', tables.map(t => t.table_name))

        // Also check columns for whatever we find
        for (const t of tables) {
            const cols = await sql`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = ${t.table_name}
            `
            console.log(`\nColumns for ${t.table_name}:`)
            cols.forEach(c => console.log(` - ${c.column_name}`))
        }

    } catch (e) { console.error(e) }
    process.exit()
}
listTables()
