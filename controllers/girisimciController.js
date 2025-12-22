import sql from '../db/db.js'

function calculateOncelikPuani(girisimci) {
    // Logic: (Kadin * 40) + (Engelli * 30) + (Yenilik * 30)
    // Yenilik: Daha yeni olan daha yüksek puan (Start-up desteği gibi)

    const currentYear = new Date().getFullYear()
    const age = currentYear - (girisimci.kurulus_yili || currentYear)
    // Age 0 => 100% of 30. Age 10 => small.
    // Factor: 1 / (age + 1)

    const kadinPuan = (girisimci.kadin_calisan_orani || 0) * 40
    const engelliPuan = (girisimci.engelli_calisan_orani || 0) * 30
    const yenilikPuan = (1 / (age + 1)) * 30

    const puan = kadinPuan + engelliPuan + yenilikPuan
    return Math.min(Math.max(Math.round(puan), 0), 100)
}

export const getGirisimcilerPage = async (req, res) => {
    try {
        const girisimcilerRaw = await sql`SELECT * FROM girisimciler`

        const girisimciler = girisimcilerRaw.map(g => ({
            ...g,
            oncelik_puani_hesapli: calculateOncelikPuani(g)
        }))

        // Sort by Score
        girisimciler.sort((a, b) => b.oncelik_puani_hesapli - a.oncelik_puani_hesapli)

        res.render('layout', {
            body: 'girisimciler',
            title: 'Girişimciler',
            activePage: 'girisimciler',
            girisimciler
        })
    } catch (error) {
        console.error('Girişimciler hatası:', error)
        res.status(500).send('Veri çekilemedi')
    }
}
