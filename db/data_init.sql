-- CLEAN SLATE
TRUNCATE TABLE "Firmalar", "Girisimciler", "Teklifler", "tahsis" RESTART IDENTITY CASCADE;

-- INSERT FIRMALAR (Textile Focus)
-- Values: (firma_adi, sektor, yillik_ciro, su_tuketimi, atik_uretimi, karbon_ayak_izi, geri_donusum_orani, sertifikalar)
INSERT INTO "Firmalar" (firma_adi, sektor, yillik_ciro, su_tuketimi, atik_uretimi, karbon_ayak_izi, geri_donusum_orani, sertifikalar) VALUES
('Bursa İpek Dokuma', 'Tekstil', 12000000, 150000, 500, 8500, 0.45, '["OEKO-TEX"]'),
('Denizli Havlu Sanayi', 'Tekstil', 8500000, 180000, 600, 9200, 0.60, '["GOTS", "ISO 14001"]'),
('Gaziantep İplik', 'Tekstil', 25000000, 200000, 800, 12000, 0.30, '[]'),
('Ege Organik Kumaş', 'Tekstil', 5000000, 40000, 100, 1500, 0.95, '["GOTS", "Fair Trade", "Organik 100"]'),
('İstanbul Boyahane', 'Tekstil', 15000000, 220000, 1200, 15000, 0.20, '["ISO 9001"]'),
('Anadolu Yün İplik', 'Tekstil', 7000000, 60000, 200, 3000, 0.80, '["Woolmark"]'),
('Kayseri Denim', 'Tekstil', 18000000, 190000, 750, 11000, 0.50, '["Better Cotton"]'),
('Adana Pamuklu', 'Tekstil', 22000000, 210000, 900, 13000, 0.40, '[]'),
('Trakya Sentetik', 'Tekstil', 30000000, 160000, 400, 14000, 0.70, '["ISO 14001", "Recycled Claim"]'),
('Mavi Yeşil Tekstil', 'Tekstil', 4500000, 35000, 80, 1200, 0.90, '["GOTS", "Zero Waste"]');

-- INSERT GIRISIMCILER (Sustainable Fashion) with Linkage
-- Assuming 'firma_id' links to Firmalar. Assigning randomly.
INSERT INTO "Girisimciler" (firma_id, isletme_adi, girisimci_adi, talep_butcesi, kadin_calisan_orani, engelli_calisan_orani, kurulus_yili, durum, oncelik_puani) VALUES
((SELECT id FROM "Firmalar" WHERE firma_adi = 'Bursa İpek Dokuma'), 'Susuz Boyama Teknolojisi', 'Ayşe Yılmaz', 500000, 0.60, 0.10, 2023, 'Aktif', 85),
((SELECT id FROM "Firmalar" WHERE firma_adi = 'Denizli Havlu Sanayi'), 'Kenevir Elyafı Üretimi', 'Mehmet Demir', 300000, 0.40, 0.05, 2022, 'Aktif', 75),
((SELECT id FROM "Firmalar" WHERE firma_adi = 'Gaziantep İplik'), 'Geri Dönüştürülmüş Polyester', 'Selin Kara', 450000, 0.80, 0.15, 2024, 'Aktif', 90),
((SELECT id FROM "Firmalar" WHERE firma_adi = 'Ege Organik Kumaş'), 'Akıllı Tekstil Atık Ayrıştırma', 'Caner Erkin', 250000, 0.50, 0.00, 2021, 'Tamamlandı', 65),
((SELECT id FROM "Firmalar" WHERE firma_adi = 'İstanbul Boyahane'), 'Biyobozunur Ambalaj', 'Elif Yıldız', 150000, 0.90, 0.20, 2023, 'Aktif', 95),
((SELECT id FROM "Firmalar" WHERE firma_adi = 'Kayseri Denim'), 'Lazerle Eskitme Teknolojisi', 'Burak Yılmaz', 600000, 0.30, 0.05, 2020, 'Aktif', 70),
((SELECT id FROM "Firmalar" WHERE firma_adi = 'Adana Pamuklu'), 'Organik Pamuk Tohumu', 'Hande Erçel', 200000, 0.75, 0.10, 2022, 'Aktif', 80),
((SELECT id FROM "Firmalar" WHERE firma_adi = 'Trakya Sentetik'), 'Denizden İpliğe', 'Zeynep Çelik', 800000, 0.55, 0.05, 2024, 'Aktif', 88);

-- LINKED TABLES: TEKLIFLER
INSERT INTO "Teklifler" (firma_id, baslik, durum) VALUES
((SELECT id FROM "Firmalar" WHERE firma_adi = 'Bursa İpek Dokuma'), 'Su Arıtma Tesisi Revizyonu', 'Beklemede'),
((SELECT id FROM "Firmalar" WHERE firma_adi = 'Denizli Havlu Sanayi'), 'Güneş Enerjisi Paneli', 'Onaylandı'),
((SELECT id FROM "Firmalar" WHERE firma_adi = 'Gaziantep İplik'), 'Atık Isı Geri Kazanımı', 'Reddedildi'),
((SELECT id FROM "Firmalar" WHERE firma_adi = 'Ege Organik Kumaş'), 'Organik Sertifikasyon Desteği', 'Onaylandı'),
((SELECT id FROM "Firmalar" WHERE firma_adi = 'İstanbul Boyahane'), 'Filtre Sistemi Modernizasyonu', 'Beklemede');

-- LINKED TABLES: TAHSIS
INSERT INTO "tahsis" (girisimci_id, miktar) VALUES
((SELECT id FROM "Girisimciler" WHERE isletme_adi = 'Susuz Boyama Teknolojisi'), 100000),
((SELECT id FROM "Girisimciler" WHERE isletme_adi = 'Kenevir Elyafı Üretimi'), 50000),
((SELECT id FROM "Girisimciler" WHERE isletme_adi = 'Geri Dönüştürülmüş Polyester'), 200000),
((SELECT id FROM "Girisimciler" WHERE isletme_adi = 'Biyobozunur Ambalaj'), 75000),
((SELECT id FROM "Girisimciler" WHERE isletme_adi = 'Denizden İpliğe'), 400000);
