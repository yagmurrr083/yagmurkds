import sql from '../db/db.js'

// PAGE RENDER
export const getAnalizPage = async (req, res) => {
    try {
        let settings = { karbon_esik: 5000, butce_yuzdesi: 0.72 }
        try {
            const result = await sql`SELECT * FROM ayarlar LIMIT 1`
            if (result.length > 0) settings = result[0]
        } catch (e) { }

        res.render('layout', {
            body: 'analiz',
            title: 'Analiz Paneli (Tekstil)',
            activePage: 'analiz',
            karbonEsik: settings.karbon_esik,
            butceYuzdesi: settings.butce_yuzdesi
        })
    } catch (error) {
        console.error(error)
        res.status(500).send('Sayfa yüklenemedi')
    }
}

// FIRM_LIST API (For Modal)
export const getFirmalarList = async (req, res) => {
    try {
        const firmalar = await sql`SELECT id, firma_adi as ad, yillik_ciro as ciro, karbon_ayak_izi FROM "Firmalar" ORDER BY firma_adi ASC`
        res.json(firmalar)
    } catch (error) {
        try {
            const fallback = await sql`SELECT id, ad, ciro, karbon_ayak_izi FROM firmalar ORDER BY ad ASC`
            res.json(fallback)
        } catch (e) {
            res.status(500).json({ error: error.message })
        }
    }
}

// MAIN DATA API
export const getAnalizData = async (req, res) => {
    try {
        const refId = req.query.refId
        const w1 = parseFloat(req.query.w1) || 50

        // 1. GET ACTIVE FIRM
        let activeFirm = null
        let firms = []
        try {
            if (refId) {
                firms = await sql`SELECT * FROM "Firmalar" WHERE id = ${refId}`
            } else {
                firms = await sql`SELECT * FROM "Firmalar" ORDER BY id ASC LIMIT 1`
            }
        } catch (e) {
            firms = await sql`SELECT * FROM firmalar ORDER BY id ASC LIMIT 1` // Fallback
        }

        activeFirm = firms[0]
        if (!activeFirm) return res.status(404).json({ error: 'Firma bulunamadı' })

        // 2. PARSE INPUT (Force Number type)
        // Handle postgres numeric type or schema variations
        const ciro = parseFloat(activeFirm.yillik_ciro || activeFirm.ciro || 0);
        const su = Number(activeFirm.su_tuketimi || 0)
        const karbon = Number(activeFirm.karbon_ayak_izi || 0)
        let recycle = Number(activeFirm.geri_donusum_orani || 0)
        if (recycle <= 1 && recycle > 0) recycle *= 100

        // 3. APPLY STRICT MATH (PROFIT & BUDGET)
        const profitMargin = 0.20; // %20 Kar Marjı
        const tahminiGetiri = ciro * profitMargin;

        // Budget is 72% of PROFIT (not Revenue)
        const budgetRate = 0.72; // %72 Bütçe Oranı
        const kadinButcesi = tahminiGetiri * budgetRate;

        // 4. DEBUG LOGS
        console.log(`------------------------------------------`);
        console.log(`Firma: ${activeFirm.firma_adi || activeFirm.ad}`);
        console.log(`Ciro (Raw): ${ciro}`);
        console.log(`Getiri (Ciro * 0.20): ${tahminiGetiri}`);
        console.log(`Bütçe (Getiri * 0.72): ${kadinButcesi}`);
        console.log(`------------------------------------------`);

        const firmData = {
            ad: activeFirm.firma_adi || activeFirm.ad,
            ciro,
            su,
            karbon,
            recycle,
            sertifikalar: activeFirm.sertifikalar
        }

        // 5. CHARTS LOGIC
        // Leaders Chart (Top 7)
        let allFirms = []
        try { allFirms = await sql`SELECT * FROM "Firmalar"` } catch (e) { allFirms = await sql`SELECT * FROM firmalar` }

        const leaders = allFirms.map(f => {
            const r = Number(f.yillik_ciro || f.ciro || 0) / 1000000000
            const w = Number(f.su_tuketimi || 0)
            let rec = Number(f.geri_donusum_orani || 0)
            if (rec <= 1 && rec > 0) rec *= 100

            let s = 50 + (r * 20) + (rec * 0.5) - (w / 10000)
            if (s > 100) s = 100; if (s < 10) s = 10;

            return { ad: f.firma_adi || f.ad, score: Math.round(s) }
        })
            .sort((a, b) => b.score - a.score)
            .slice(0, 7)

        // Entrepreneurs
        let entList = []
        try { entList = await sql`SELECT * FROM "Girisimciler"` } catch (e) { entList = await sql`SELECT * FROM girisimciler` }

        const entScores = entList.map(e => {
            // Mock or real calc
            return { ad: e.isletme_adi, score: Math.floor(Math.random() * 40) + 60 }
        }).sort((a, b) => b.score - a.score).slice(0, 7)


        res.json({
            firm: firmData,
            info: {
                tahminiGetiri,
                kadinButcesi,
                refFirmaAd: firmData.ad
            },
            charts: {
                leaders: { labels: leaders.map(l => l.ad), data: leaders.map(l => l.score) },
                carbon: {
                    labels: ['2020', '2021', '2022', '2023', '2024'],
                    data: [karbon * 1.1, karbon * 1.08, karbon * 1.05, karbon * 1.02, karbon],
                    threshold: 50000
                },
                entrepreneurs: { labels: entScores.map(e => e.ad), data: entScores.map(e => e.score) }
            }
        })

    } catch (error) {
        console.error('ANALIZ DATA ERROR:', error)
        res.status(500).json({ error: error.message })
    }
}

// UPDATE THRESHOLD
export const updateThreshold = async (req, res) => {
    try {
        const { threshold } = req.body
        await sql`UPDATE ayarlar SET karbon_esik = ${threshold}`
        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}
