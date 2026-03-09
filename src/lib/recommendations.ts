export interface AirQualityRecommendation {
    level: "good" | "moderate" | "unhealthy-sensitive" | "unhealthy" | "very-unhealthy" | "hazardous";
    title: string;
    color: string;
    health: string;
    activity: string;
    ventilation: string;
}

export function getRecommendations(pm25Score: number): AirQualityRecommendation {
    if (pm25Score <= 50) {
        return {
            level: "good",
            title: "Kualitas Udara Baik",
            color: "bg-emerald-50 text-emerald-700 border-emerald-200",
            health: "Udara bersih dan sehat untuk semua orang. Sempurna untuk beraktivitas.",
            activity: "Sangat direkomendasikan untuk olahraga dan aktivitas luar ruangan keluarga.",
            ventilation: "Waktu yang tepat untuk membuka jendela lebar-lebar dan membersihkan sirkulasi udara di dalam rumah.",
        };
    }

    if (pm25Score <= 100) {
        return {
            level: "moderate",
            title: "Kualitas Udara Sedang",
            color: "bg-yellow-50 text-yellow-700 border-yellow-200",
            health: "Kualitas udara dapat diterima. Namun bagi sebagian kecil orang yang sangat sensitif, polutan bisa menjadi masalah.",
            activity: "Boleh beraktivitas seperti biasa di luar, tetapi pantau gejala batuk jika Anda penderita asma.",
            ventilation: "Jendela bisa dibuka secukupnya untuk sirkulasi sesekali.",
        };
    }

    if (pm25Score <= 150) {
        return {
            level: "unhealthy-sensitive",
            title: "Tidak Sehat (Kelompok Sensitif)",
            color: "bg-orange-50 text-orange-700 border-orange-200",
            health: "Orang dewasa sehat tidak terdampak, tetapi anak-anak, lansia, atau penderita penyakit paru-paru harus waspada.",
            activity: "Kelompok rentan sangat disarankan mengurangi aktivitas berat atau olahraga berat di luar ruangan.",
            ventilation: "Tutup jendela yang menghadap jalan raya utama/sumber polusi langsung. Pertimbangkan menyalakan kipas/purifier.",
        };
    }

    if (pm25Score <= 200) {
        return {
            level: "unhealthy",
            title: "Tidak Sehat",
            color: "bg-red-50 text-red-700 border-red-200",
            health: "Setiap orang mungkin mulai mengalami dampak kesehatan. Wajib menggunakan Masker N95 di luar.",
            activity: "Batasi eksposur di luar. Tunda agenda olahraga lari atau bersepeda jarak jauh (luar ruangan).",
            ventilation: "Tutup semua jendela. Nyalakan Air Purifier atau sistem filtrasi AC untuk menjaga pernapasan.",
        };
    }

    if (pm25Score <= 300) {
        return {
            level: "very-unhealthy",
            title: "Sangat Tidak Sehat",
            color: "bg-purple-50 text-purple-700 border-purple-200",
            health: "Peringatan darurat kesehatan. Resiko efek pada kesehatan meningkat secara fatal untuk semua rentang usia.",
            activity: "Hindari keluar rumah sepenuhnya. Lakukan semua olahraga (gym) dan kegiatan di area dalam (indoor) sepenuhnya.",
            ventilation: "Jangan menukar sirkulasi dari luar sama sekali. Tutup rapat semua celah pintu. Purifier maksimum menyala terus.",
        };
    }

    // Hazardous (301+)
    return {
        level: "hazardous",
        title: "Berbahaya",
        color: "bg-rose-50 text-rose-800 border-rose-300",
        health: "Siaga Darurat Kesehatan Publik! Seluruh umat manusia akan terdampak secara serius walau dalam waktu singkat.",
        activity: "DILARANG keluar rumah. Jika terpaksa mengevakuasi diri, pakailah masker N95 ganda / filter PM profesional.",
        ventilation: "Segel titik udara dari bingkai jendela. Gunakan purifier HEPA tingkat medis secara nonstop. Gunakan Humidifier.",
    };
}
