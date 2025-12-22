import sql from './db.js'

async function setup() {
    console.log('Veritabanı kurulumu başlıyor...')

    try {
        // Drop existing tables
        await sql`DROP TABLE IF EXISTS girisimciler`
        await sql`DROP TABLE IF EXISTS firmalar`
        await sql`DROP TABLE IF EXISTS ayarlar`

        console.log('Eski tablolar silindi.')

        // Create Tables
        await sql`
            CREATE TABLE ayarlar (
                id SERIAL PRIMARY KEY,
                karbon_esik NUMERIC DEFAULT 5000,
                butce_yuzdesi NUMERIC DEFAULT 0.72
            )
        `

        // Insert Default Settings
        await sql`insert into ayarlar (karbon_esik, butce_yuzdesi) values (5000, 0.72)`

        await sql`
            CREATE TABLE firmalar (
                id SERIAL PRIMARY KEY,
                ad TEXT NOT NULL,
                sektor TEXT,
                ciro NUMERIC,
                karbon_ayak_izi NUMERIC,
                su_tuketimi NUMERIC,
                atik_miktari NUMERIC,
                geri_donusum_orani NUMERIC,
                sertifikalar JSONB DEFAULT '[]',
                uyumluluk_puani NUMERIC
            )
        `

        await sql`
            CREATE TABLE girisimciler (
                id SERIAL PRIMARY KEY,
                isletme_adi TEXT NOT NULL,
                girisimci_adi TEXT,
                talep_butcesi NUMERIC,
                kadin_calisan_orani NUMERIC,
                engelli_calisan_orani NUMERIC,
                kurulus_yili INTEGER,
                durum TEXT DEFAULT 'Aktif',
                oncelik_puani NUMERIC
            )
        `

        console.log('Tablolar oluşturuldu.')

        // Seed Data - Firmalar
        const firmalar = [
            { ad: 'Akçansa Çimento', sektor: 'Sanayi', ciro: 5000000, karbon_ayak_izi: 4500, su_tuketimi: 1200, atik_miktari: 300, geri_donusum_orani: 0.85, sertifikalar: JSON.stringify(['ISO 14001', 'LEED']) },
            { ad: 'Brisa Lastik', sektor: 'Otomotiv', ciro: 6200000, karbon_ayak_izi: 3800, su_tuketimi: 900, atik_miktari: 250, geri_donusum_orani: 0.90, sertifikalar: JSON.stringify(['ISO 50001', 'Sıfır Atık']) },
            { ad: 'Kordsa Teknik', sektor: 'Tekstil', ciro: 4800000, karbon_ayak_izi: 2100, su_tuketimi: 600, atik_miktari: 150, geri_donusum_orani: 0.95, sertifikalar: JSON.stringify(['ISO 14001', 'ISO 9001']) },
            { ad: 'Enerjisa Üretim', sektor: 'Enerji', ciro: 8500000, karbon_ayak_izi: 5200, su_tuketimi: 1500, atik_miktari: 400, geri_donusum_orani: 0.75, sertifikalar: JSON.stringify(['ISO 45001']) },
            { ad: 'Teknosa', sektor: 'Perakende', ciro: 3200000, karbon_ayak_izi: 1200, su_tuketimi: 200, atik_miktari: 80, geri_donusum_orani: 0.60, sertifikalar: JSON.stringify(['LEED Gold']) },
            { ad: 'CarrefourSA', sektor: 'Perakende', ciro: 4100000, karbon_ayak_izi: 1800, su_tuketimi: 350, atik_miktari: 500, geri_donusum_orani: 0.55, sertifikalar: JSON.stringify(['ISO 22000']) },
            { ad: 'Çimsa', sektor: 'Sanayi', ciro: 5500000, karbon_ayak_izi: 4800, su_tuketimi: 1100, atik_miktari: 320, geri_donusum_orani: 0.80, sertifikalar: JSON.stringify(['ISO 14001']) },
            { ad: 'Temsa Ulaşım', sektor: 'Otomotiv', ciro: 3900000, karbon_ayak_izi: 2500, su_tuketimi: 700, atik_miktari: 180, geri_donusum_orani: 0.88, sertifikalar: JSON.stringify(['ISO 9001', 'Sıfır Atık']) },
            { ad: 'Sabancı Holding', sektor: 'Holding', ciro: 12000000, karbon_ayak_izi: 6000, su_tuketimi: 2000, atik_miktari: 600, geri_donusum_orani: 0.70, sertifikalar: JSON.stringify(['B Corp']) },
            { ad: 'AvivaSA', sektor: 'Finans', ciro: 2800000, karbon_ayak_izi: 800, su_tuketimi: 100, atik_miktari: 50, geri_donusum_orani: 0.92, sertifikalar: JSON.stringify(['Karbon Nötr']) }
        ]

        for (const firma of firmalar) {
            await sql`
                INSERT INTO firmalar (ad, sektor, ciro, karbon_ayak_izi, su_tuketimi, atik_miktari, geri_donusum_orani, sertifikalar)
                VALUES (${firma.ad}, ${firma.sektor}, ${firma.ciro}, ${firma.karbon_ayak_izi}, ${firma.su_tuketimi}, ${firma.atik_miktari}, ${firma.geri_donusum_orani}, ${firma.sertifikalar})
            `
        }
        console.log('Firmalar eklendi.')

        // Seed Data - Girisimciler
        const girisimciler = [
            { isletme_adi: 'Yeşil Dönüşüm Atölyesi', girisimci_adi: 'Ayşe Yılmaz', talep_butcesi: 150000, kadin_calisan_orani: 0.80, engelli_calisan_orani: 0.10, kurulus_yili: 2021 },
            { isletme_adi: 'Güneş Enerjisi Sistemleri', girisimci_adi: 'Mehmet Demir', talep_butcesi: 300000, kadin_calisan_orani: 0.40, engelli_calisan_orani: 0.05, kurulus_yili: 2022 },
            { isletme_adi: 'Organik Tarım A.Ş.', girisimci_adi: 'Fatma Kaya', talep_butcesi: 120000, kadin_calisan_orani: 0.90, engelli_calisan_orani: 0.00, kurulus_yili: 2020 },
            { isletme_adi: 'Engelsiz Yazılım', girisimci_adi: 'Ali Öztürk', talep_butcesi: 200000, kadin_calisan_orani: 0.30, engelli_calisan_orani: 0.60, kurulus_yili: 2023 },
            { isletme_adi: 'Sıfır Atık Market', girisimci_adi: 'Zeynep Çelik', talep_butcesi: 80000, kadin_calisan_orani: 1.00, engelli_calisan_orani: 0.15, kurulus_yili: 2024 },
            { isletme_adi: 'Temiz Su Teknolojileri', girisimci_adi: 'Caner Erkin', talep_butcesi: 250000, kadin_calisan_orani: 0.50, engelli_calisan_orani: 0.05, kurulus_yili: 2019 },
            { isletme_adi: 'Biyoplastik Üretim', girisimci_adi: 'Elif Yıldız', talep_butcesi: 180000, kadin_calisan_orani: 0.75, engelli_calisan_orani: 0.10, kurulus_yili: 2021 },
            { isletme_adi: 'Yerel Gıda Ağı', girisimci_adi: 'Burak Yılmaz', talep_butcesi: 90000, kadin_calisan_orani: 0.45, engelli_calisan_orani: 0.00, kurulus_yili: 2022 },
            { isletme_adi: 'Akıllı Tarım Sensörleri', girisimci_adi: 'Selin Arslan', talep_butcesi: 220000, kadin_calisan_orani: 0.60, engelli_calisan_orani: 0.05, kurulus_yili: 2023 },
            { isletme_adi: 'Eko Tekstil', girisimci_adi: 'Hande Erçel', talep_butcesi: 160000, kadin_calisan_orani: 0.85, engelli_calisan_orani: 0.20, kurulus_yili: 2020 }
        ]

        for (const girisimci of girisimciler) {
            await sql`
                INSERT INTO girisimciler (isletme_adi, girisimci_adi, talep_butcesi, kadin_calisan_orani, engelli_calisan_orani, kurulus_yili)
                VALUES (${girisimci.isletme_adi}, ${girisimci.girisimci_adi}, ${girisimci.talep_butcesi}, ${girisimci.kadin_calisan_orani}, ${girisimci.engelli_calisan_orani}, ${girisimci.kurulus_yili})
            `
        }
        console.log('Girişimciler eklendi.')

        console.log('Kurulum başarıyla tamamlandı!')
        process.exit(0)
    } catch (error) {
        console.error('Kurulum hatası:', error)
        process.exit(1)
    }
}

setup()
