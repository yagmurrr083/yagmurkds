import sql from './db.js'

async function inspect() {
    try {
        console.log('--- INSPECTING SCHEMA ---')

        // Helper to log columns
        const logTable = async (name) => {
            try {
                // Try selecting 0 rows just to get column info (postgres.js returns columns property on result if enabled, or we just select * limit 0)
                // Actually, best way with postgres.js to see keys is to select * limit 1, or query information_schema
                const cols = await sql`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = ${name}
                `
                console.log(`\nTABLE: ${name}`)
                cols.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`))
            } catch (e) {
                console.log(`Errors accessing ${name}: ${e.message}`)
            }
        }

        // The user mentioned Case Sensitivity ("Firmalar"). 
        // In Postgres information_schema, table_name stores as is? 
        // Usually if created with quotes "Firmalar", it is stored as 'Firmalar'. 
        // If created without quotes, it is 'firmalar'.
        // I'll check both just in case.

        await logTable('Firmalar')
        await logTable('Girisimciler')
        await logTable('Teklifler')
        await logTable('tahsis')


    } catch (e) {
        console.error(e)
    }
    process.exit()
}

inspect()
