import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
    return arr[randInt(0, arr.length - 1)];
}

function randFloat(min, max, decimals = 2) {
    const x = Math.random() * (max - min) + min;
    return Number(x.toFixed(decimals));
}

async function seedfirmalar(n = 15) {
    const firmalar = [
        "Hugo Boss ",
        "Sun Tekstil ",
        "Tena Tekstil",
        "Örünler Hazır Giyim ",
        "Les Benjamins",
        "İpekyol Tekstil",
        "LC Waikiki Üretim",

    ];

    const sertifikalar = ["GOTS", "OEKO-TEX", "GRS", "BCI", "ISO 14001", "SA8000", ""];

    for (let i = 0; i < n; i++) {
        const ad = i < firmalar.length ? firmalar[i] : `Random Tekstil ${i + 1}`;
        const karbon_ayak_izi = randFloat(50, 1200, 2);
        const geri_donusum_orani = randInt(0, 100);
        const kadin_calisan_orani = randInt(10, 80);
        const engelli_calisan_sayisi = randInt(0, 10);
        const cert = pick(sertifikalar);

        const exists = await sql`
  SELECT 1 FROM firmalar WHERE ad = ${ad} LIMIT 1
`;

        if (exists.length === 0) {
            await sql`
      INSERT INTO firmalar (
        ad,  karbon_ayak_izi, geri_donusum_orani,
        kadin_calisan_orani, engelli_calisan_sayisi,
        sertifikalar
      )
      VALUES (
        ${ad}, ${karbon_ayak_izi}, ${geri_donusum_orani},
        ${kadin_calisan_orani},  ${engelli_calisan_sayisi},
        ${cert}
      )
    `;
        }
    }
}

async function seedgirisimciler(n = 20) {
    const gadi = ["Re-Fabric TR", "HempModa Bio", "SuCo Dye Tech", "Atıksız Moda", "Hanım Eli Giyim", "Bio-Polyester"]

    for (let i = 0; i < n; i++) {
        const girisimci = `${pick(gadi)}`;
        const kurulusYili = randInt(2015, 2025);
        const kadinSay = randInt(1, 40);
        const engelliSay = randInt(0, 8);
        const talep = randInt(50000, 750000);

        const exists = await sql`
  SELECT 1 FROM girisimciler WHERE isletme_adi = ${girisimci} LIMIT 1
`;

        if (exists.length === 0) {

            await sql`
      INSERT INTO girisimciler (
        isletme_adi, kurulus_yili, kadin_calisan_orani,
        engelli_calisan_orani, talep_edilen_butce
      )
      VALUES (
        ${girisimci}, ${kurulusYili}, ${kadinSay},
        ${engelliSay}, ${talep}
      );
    `;
        }
    }
}

async function main() {
    try {
        await seedfirmalar(20);
        await seedgirisimciler(25);
        console.log("Seed tamamlandı.");
    } catch (e) {
        console.error("Seed hatası:", e);
        process.exitCode = 1;
    } finally {
        await sql.end({ timeout: 5 });
    }
}

main();
