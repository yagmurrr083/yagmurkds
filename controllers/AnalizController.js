import sql from '../db/db.js'

export const getAnalizPage = async (req, res) => {
    try {
        // --- 1. Top Cards Data ---
        // Fetch all firms with their estimated return for the dropdown and initial selection
        const firmsRaw = await sql`
            SELECT 
                f.id, 
                f.ad, 
                ft.tahmini_getiri
            FROM firmalar f
            LEFT JOIN firma_tahminleme ft ON f.id = ft.firma_id
            WHERE ft.tahmini_getiri IS NOT NULL
            ORDER BY ft.tahmini_getiri DESC
        `;

        // --- 2. Pie Chart: Top 7 Sustainability Data ---
        const pieData = await sql`
            SELECT 
                f.ad, 
                ft.surdurulebilirlik_uyum_puani
            FROM firmalar f
            JOIN firma_tahminleme ft ON f.id = ft.firma_id
            ORDER BY ft.surdurulebilirlik_uyum_puani DESC
            LIMIT 7
        `;

        // --- 3. Line Chart: Top 10 Recycling Rate ---
        const lineData = await sql`
            SELECT 
                ad, 
                geri_donusum_orani
            FROM firmalar
            ORDER BY geri_donusum_orani DESC
            LIMIT 10
        `;

        // --- 4. Bar Chart: Top 7 Entrepreneur Compatibility ---
        // We need reference values: Women Employee Rate, Disabled Employee Rate, Establishment Year
        const barData = await sql`
            SELECT 
                g.isletme_adi, 
                gt.kriter_uyumluluk_puani,
                g.kadin_calisan_orani,
                g.engelli_calisan_orani,
                g.kurulus_yili
            FROM girisimciler g
            JOIN girisimci_tahminleme gt ON g.id = gt.girisimci_id
            ORDER BY gt.kriter_uyumluluk_puani DESC
            LIMIT 7
        `;

        res.render('layout', {
            body: 'analiz',
            title: 'Analiz Paneli',
            activePage: 'analiz',
            data: {
                firms: firmsRaw,
                charts: {
                    pie: pieData,
                    line: lineData,
                    bar: barData
                }
            }
        });

    } catch (error) {
        console.error('Error in getAnalizPage:', error);
        res.render('layout', {
            body: 'analiz',
            title: 'Analiz Hatası',
            activePage: 'analiz',
            data: { firms: [], charts: { pie: [], line: [], bar: [] } },
            error: error.message
        });
    }
}

export const getFirmalarList = async (req, res) => {
    try {
        const firmalar = await sql`SELECT * FROM firmalar ORDER BY ad ASC`;
        res.json(firmalar);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const getAnalizData = async (req, res) => {
    // API endpoint if needed for dynamic updates, currently most data is passed to view directly
    try {
        const barData = await sql`
        SELECT 
            g.isletme_adi, 
            gt.kriter_uyumluluk_puani,
            g.kadin_calisan_orani,
            g.engelli_calisan_orani,
            g.kurulus_yili
        FROM girisimciler g
        JOIN girisimci_tahminleme gt ON g.id = gt.girisimci_id
        ORDER BY gt.kriter_uyumluluk_puani DESC
        LIMIT 7
    `;
        res.json(barData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const updateThreshold = async (req, res) => {
    // Placeholder for server-side persistence of adjustments
    res.json({ success: true });
}
