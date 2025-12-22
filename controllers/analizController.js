import sql from '../db/db.js'

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

export const getFirmalarList = async (req, res) => {
    try {
        let firmalar;
        try {
            firmalar = await sql`SELECT id, firma_adi as ad, yillik_ciro as ciro, karbon_ayak_izi FROM "Firmalar" ORDER BY firma_adi ASC`;
        } catch (e) {
            firmalar = await sql`SELECT id, ad, ciro, karbon_ayak_izi FROM firmalar ORDER BY ad ASC`;
        }
        res.json(firmalar)
    } catch (error) {
        console.error("List API Error:", error)
        res.status(500).json({ error: error.message })
    }
}

export const getAnalizData = async (req, res) => {
    try {
        const refId = req.query.refId
        // Weights for Entrepreneurs
        const w1 = parseFloat(req.query.w1) || 50 // Women
        const w2 = parseFloat(req.query.w2) || 30 // Disabled
        const w3 = parseFloat(req.query.w3) || 20 // Innovation (Year)

        // 1. SELECT ACTIVE FIRM
        let firms = []
        try {
            if (refId) {
                firms = await sql`SELECT * FROM "Firmalar" WHERE id = ${refId}`;
            } else {
                firms = await sql`SELECT * FROM "Firmalar" ORDER BY id ASC LIMIT 1`;
            }
        } catch (e) {
            if (refId) {
                firms = await sql`SELECT * FROM firmalar WHERE id = ${refId}`;
            } else {
                firms = await sql`SELECT * FROM firmalar ORDER BY id ASC LIMIT 1`;
            }
        }

        const activeFirm = firms[0]
        if (!activeFirm) return res.status(404).json({ error: 'Firma bulunamadı' })

        // 2. PROCESS FIRM DATA
        const ciro = parseFloat(activeFirm.yillik_ciro || activeFirm.ciro || 0);
        const su = Number(activeFirm.su_tuketimi || 0)
        const karbon = Number(activeFirm.karbon_ayak_izi || 0)
        let recycle = Number(activeFirm.geri_donusum_orani || 0)
        if (recycle <= 1 && recycle > 0) recycle *= 100

        const profitMargin = 0.20;
        const tahminiGetiri = ciro * profitMargin;
        const budgetRate = 0.72;
        const kadinButcesi = tahminiGetiri * budgetRate;

        const firmData = {
            ad: activeFirm.firma_adi || activeFirm.ad,
            ciro,
            su,
            karbon,
            recycle,
            sertifikalar: activeFirm.sertifikalar
        }

        // 3. LEADERS CHART (Stable)
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
        }).sort((a, b) => b.score - a.score).slice(0, 7)

        // 4. ENTREPRENEURS CHART (DETERMINISTIC)
        let entList = []
        try { entList = await sql`SELECT * FROM "Girisimciler"` } catch (e) { entList = await sql`SELECT * FROM girisimciler` }

        const entScores = entList.map(e => {
            // Normalized Values (0-100)
            const valKadin = (Number(e.kadin_calisan_orani || 0)) * 100;
            const valEngelli = (Number(e.engelli_calisan_orani || 0)) * 100;

            // Year Score: 2024=100, 2020=0. (25 pts per year)
            // Clamp between 0 and 100
            let valYil = (Number(e.kurulus_yili || 2020) - 2020) * 25;
            if (valYil < 0) valYil = 0;
            if (valYil > 100) valYil = 100;

            // Weighted Average
            // Total Weight Sum can be 0, guard against NaN
            const sumW = w1 + w2 + w3;
            let score = 0;
            if (sumW > 0) {
                score = ((valKadin * w1) + (valEngelli * w2) + (valYil * w3)) / sumW;
            }

            return { ad: e.isletme_adi, score: Math.round(score) }
        }).sort((a, b) => b.score - a.score).slice(0, 7)

        // 5. THRESHOLD SETTING
        let settings = { karbon_esik: 5000 }
        try {
            const s = await sql`SELECT karbon_esik FROM ayarlar LIMIT 1`
            if (s.length > 0) settings = s[0]
        } catch (e) { }

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
                    threshold: Number(settings.karbon_esik)
                },
                entrepreneurs: { labels: entScores.map(e => e.ad), data: entScores.map(e => e.score) }
            }
        })
    } catch (error) {
        console.error('ANALIZ DATA ERROR:', error)
        res.status(500).json({ error: error.message })
    }
}

export const updateThreshold = async (req, res) => {
    try {
        const { threshold } = req.body
        await sql`UPDATE ayarlar SET karbon_esik = ${threshold}`
        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}
