
import sql from '../db/db.js';

async function inspect() {
    try {
        console.log('--- Firma Tahminleme Columns ---');
        const ftObj = await sql`SELECT * FROM firma_tahminleme LIMIT 1`;
        if (ftObj && ftObj.length > 0) console.log(Object.keys(ftObj[0]));
        else console.log('Table empty or not found');

        console.log('--- Girisimci Tahminleme Columns ---');
        const gtObj = await sql`SELECT * FROM girisimci_tahminleme LIMIT 1`;
        if (gtObj && gtObj.length > 0) console.log(Object.keys(gtObj[0]));
        else console.log('Table empty or not found');

        console.log('--- Firmalar Columns ---');
        const fObj = await sql`SELECT * FROM firmalar LIMIT 1`;
        if (fObj && fObj.length > 0) console.log(Object.keys(fObj[0]));

        console.log('--- Girisimciler Columns ---');
        const gObj = await sql`SELECT * FROM girisimciler LIMIT 1`;
        if (gObj && gObj.length > 0) console.log(Object.keys(gObj[0]));

    } catch (err) {
        console.error(err);
    }
    process.exit();
}

inspect();
