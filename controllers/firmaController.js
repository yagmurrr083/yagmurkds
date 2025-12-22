import sql from '../db/db.js'

function calculateUyumlulukPuani(row) {
    // SCORING LOGIC (Textile)
    // Formula: 50 + (Revenue_Billions * 20) + (Recycle_Rate * 0.5) - (Water_Usage / 10000)
    // Clamp 10 - 100

    // Handle potential column name differences (ciro vs yillik_ciro) by checking both
    const ciro = Number(row.yillik_ciro || row.ciro || 0);
    // Revenue in Billions (e.g. 1.5B -> 1.5)
    const revBillion = ciro / 1000000000;

    // Recycle Rate: Assumed 0-100 or 0-1. 
    // If < 1, treat as percent (0.65 -> 65). If > 1, treat as is.
    let recycle = Number(row.geri_donusum_orani || 0);
    if (recycle <= 1 && recycle > 0) recycle = recycle * 100;

    const water = Number(row.su_tuketimi || 0);

    let score = 50 + (revBillion * 20) + (recycle * 0.5) - (water / 10000);

    // Clamp
    if (score > 100) score = 100;
    if (score < 10) score = 10;

    return Math.round(score);
}

export const getFirmalarPage = async (req, res) => {
    try {
        // STRICT: Use double quotes for case-sensitive table name
        const firmalarRaw = await sql`SELECT * FROM "Firmalar" ORDER BY id ASC`

        const firmalar = firmalarRaw.map(f => ({
            id: f.id,
            // Handle schema variations (User schema vs Seed schema)
            ad: f.firma_adi || f.ad,
            sektor: f.sektor,
            ciro: Number(f.yillik_ciro || f.ciro || 0),
            karbon_ayak_izi: f.karbon_ayak_izi,
            su_tuketimi: f.su_tuketimi,
            atik_miktari: f.atik_uretimi || f.atik_miktari,
            geri_donusum_orani: f.geri_donusum_orani,
            uyumluluk_puani_hesapli: calculateUyumlulukPuani(f)
        }))

        // Sort by Score (Highest First)
        firmalar.sort((a, b) => b.uyumluluk_puani_hesapli - a.uyumluluk_puani_hesapli)

        res.render('layout', {
            body: 'firmalar',
            title: 'Firmalar (Tekstil)',
            activePage: 'firmalar',
            firmalar
        })
    } catch (error) {
        console.error('Firmalar Error:', error)
        res.render('layout', {
            body: 'firmalar',
            title: 'Hata',
            activePage: 'firmalar',
            firmalar: []
        })
    }
}
