import sql from '../db/db.js'

function calculateUyumlulukPuani(row) {
    const ciro = Number(row.yillik_ciro || row.ciro || 0);
    const revBillion = ciro / 1000000000;

    let recycle = Number(row.geri_donusum_orani || 0);
    if (recycle <= 1 && recycle > 0) recycle = recycle * 100;

    const water = Number(row.su_tuketimi || 0);

    let score = 50 + (revBillion * 20) + (recycle * 0.5) - (water / 10000);

    if (score > 100) score = 100;
    if (score < 10) score = 10;

    return Math.round(score);
}

export const getFirmalarPage = async (req, res) => {
    try {
        let firmalarRaw = [];
        try {
            // Try User Requested Case (Quoted)
            firmalarRaw = await sql`SELECT * FROM "Firmalar" ORDER BY id ASC`;
        } catch (e1) {
            console.warn('Query failed for "Firmalar", trying lowercase table name...');
            firmalarRaw = await sql`SELECT * FROM firmalar ORDER BY id ASC`;
        }

        const firmalar = firmalarRaw.map(f => ({
            id: f.id,
            ad: f.firma_adi || f.ad,
            sektor: f.sektor,
            ciro: Number(f.yillik_ciro || f.ciro || 0),
            karbon_ayak_izi: f.karbon_ayak_izi,
            su_tuketimi: f.su_tuketimi,
            atik_uretimi: f.atik_uretimi || f.atik_miktari,
            geri_donusum_orani: f.geri_donusum_orani,
            uyumluluk_puani_hesapli: calculateUyumlulukPuani(f)
        }))

        firmalar.sort((a, b) => b.uyumluluk_puani_hesapli - a.uyumluluk_puani_hesapli)

        res.render('layout', {
            body: 'firmalar',
            title: 'Firmalar (Tekstil)',
            activePage: 'firmalar',
            firmalar
        })
    } catch (error) {
        console.error('CRITICAL ERROR in FirmaController:', error)
        res.render('layout', {
            body: 'firmalar',
            title: 'Hata',
            activePage: 'firmalar',
            firmalar: []
        })
    }
}
