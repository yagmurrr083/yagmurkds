import sql from '../db/db.js'

// Helper: ML Simulation for Dynamic Profit Margin
function calculateDynamicMargin(firm) {
    // 1. Base Sector Margin: 15%
    let predictedMargin = 0.15;

    const ciro = parseFloat(firm.yillik_ciro || firm.ciro || 0);
    const su = parseFloat(firm.su_tuketimi || 0);
    const atik = parseFloat(firm.atik_uretimi || firm.atik_miktari || 0);
    const recycle = parseFloat(firm.geri_donusum_orani || 0);
    const sertifikalar = JSON.stringify(firm.sertifikalar || "").toLowerCase();

    // Feature 1: Water Efficiency (Less water per revenue = better tech)
    if (ciro > 0) {
        const waterIntensity = su / ciro;
        if (waterIntensity < 0.0005) predictedMargin += 0.05;
        else if (waterIntensity < 0.001) predictedMargin += 0.03;
    }

    // Feature 2: Certificates (Premium Pricing Power)
    if (sertifikalar.includes('gots') || sertifikalar.includes('oeko')) {
        predictedMargin += 0.04;
    }

    // Feature 3: Waste Penalty (Inefficiency)
    if (atik > 5000) predictedMargin -= 0.02;

    // Feature 4: Recycle Bonus
    let recycleRate = recycle;
    if (recycleRate <= 1 && recycleRate > 0) recycleRate *= 100;

    if (recycleRate > 85) predictedMargin += 0.02;

    // Clamp Margin (Min 10%, Max 35%)
    return Math.min(Math.max(predictedMargin, 0.10), 0.35);
}

export const getAnalizPage = async (req, res) => {
    try {
        // 1. Fetch Settings
        let settings = { karbon_esik: 5000, butce_yuzdesi: 0.72 }
        try {
            const s = await sql`SELECT * FROM ayarlar LIMIT 1`
            if (s.length > 0) settings = s[0]
        } catch (e) { }

        // 2. Fetch Default Firm (for initial server-side render)
        let activeFirm = null;
        try {
            const firms = await sql`SELECT * FROM "Firmalar" ORDER BY id ASC LIMIT 1`
            if (firms.length > 0) activeFirm = firms[0];
            else {
                // Fallback if table name is lowercase
                const firmsLow = await sql`SELECT * FROM firmalar ORDER BY id ASC LIMIT 1`
                if (firmsLow.length > 0) activeFirm = firmsLow[0];
            }
        } catch (e) {
            // Try lowercase fallback if first query threw error
            try {
                const firmsLow = await sql`SELECT * FROM firmalar ORDER BY id ASC LIMIT 1`
                if (firmsLow.length > 0) activeFirm = firmsLow[0];
            } catch (e2) { }
        }

        // 3. Calculate Initial Metrics (Avoids "getiri is not defined" error)
        let getiri = 0;
        let butce = 0;
        let marginRate = 20;

        if (activeFirm) {
            const margin = calculateDynamicMargin(activeFirm);
            const ciro = parseFloat(activeFirm.yillik_ciro || activeFirm.ciro || 0);
            getiri = ciro * margin;
            butce = getiri * 0.72; // settings.butce_yuzdesi normally, but simple logic here
            marginRate = Math.round(margin * 100);
        }

        // 4. Render
        res.render('layout', {
            body: 'analiz',
            title: 'Analiz Paneli (Tekstil)',
            activePage: 'analiz',
            karbonEsik: settings.karbon_esik,
            butceYuzdesi: settings.butce_yuzdesi,

            // Pass the calculated variables to EJS
            activeFirm: activeFirm || {},
            getiri: getiri,
            butce: butce,
            marginRate: marginRate
        })

    } catch (error) {
        console.error("ANALIZ PAGE ERROR:", error)
        res.status(500).send('Sayfa yüklenemedi: ' + error.message)
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
        const w1 = parseFloat(req.query.w1) || 50
        const w2 = parseFloat(req.query.w2) || 30
        const w3 = parseFloat(req.query.w3) || 20

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

        // PROCESS FIRM DATA
        const ciro = parseFloat(activeFirm.yillik_ciro || activeFirm.ciro || 0);
        const su = Number(activeFirm.su_tuketimi || 0)
        const karbon = Number(activeFirm.karbon_ayak_izi || 0)
        let recycle = Number(activeFirm.geri_donusum_orani || 0)
        if (recycle <= 1 && recycle > 0) recycle *= 100

        // --- NEW DYNAMIC ML ALGORITHM ---
        const predictedMargin = calculateDynamicMargin(activeFirm);
        // --------------------------------

        const tahminiGetiri = ciro * predictedMargin;
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

        let entList = []
        try { entList = await sql`SELECT * FROM "Girisimciler"` } catch (e) { entList = await sql`SELECT * FROM girisimciler` }

        const entScores = entList.map(e => {
            const valKadin = (Number(e.kadin_calisan_orani || 0)) * 100;
            const valEngelli = (Number(e.engelli_calisan_orani || 0)) * 100;
            let valYil = (Number(e.kurulus_yili || 2020) - 2020) * 25;
            if (valYil < 0) valYil = 0; if (valYil > 100) valYil = 100;

            const sumW = w1 + w2 + w3;
            let score = 0;
            if (sumW > 0) {
                score = ((valKadin * w1) + (valEngelli * w2) + (valYil * w3)) / sumW;
            }
            return { ad: e.isletme_adi, score: Math.round(score) }
        }).sort((a, b) => b.score - a.score).slice(0, 7)

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
                refFirmaAd: firmData.ad,
                marginRate: Math.round(predictedMargin * 100) // Send to UI
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
