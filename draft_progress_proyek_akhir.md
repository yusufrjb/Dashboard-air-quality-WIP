# PROGRESS PROYEK AKHIR 

# PENGEMBANGAN DASHBOARD REAL-TIME UNTUK MONITORING DAN PREDIKSI KUALITAS UDARA DI KOTA SURABAYA



Muhammad Yusuf Rajabiyah
NRP. 3322600020

DOSEN PEMBIMBING:

Ronny Susetyoko, S.Si., M.Si.
NIP. 197112111995011001

Isbat Uzzin Nadhori, S.Kom., M.T.
NIP. 197405052003121002



PROGRAM STUDI SARJANA TERAPAN 
SAINS DATA TERAPAN
DEPARTEMEN TEKNIK INFORMATIKA DAN KOMPUTER
POLITEKNIK ELEKTRONIKA NEGERI SURABAYA
2025
















---

---

## ABSTRAK

Kualitas udara yang buruk telah menjadi permasalahan serius di berbagai wilayah Indonesia, terutama di kota-kota besar yang berdampak pada kesehatan masyarakat. Penelitian ini bertujuan mengembangkan sistem monitoring dan prediksi kualitas udara yang dapat memberikan informasi real-time dan prediksi konsentrasi PM2.5 untuk membantu masyarakat dalam mengambil keputusan terkait aktivitas outdoor dan kesehatan. Sistem ini mengintegrasikan hardware berbasis sensor PM2.5, PM10, suhu, dan kelembapan dengan platform dashboard berbasis web untuk monitoring dan analisis data. Penelitian ini mengevaluasi tiga model machine learning untuk prediksi konsentrasi PM2.5: XGBoost, LightGBM, dan Prophet. Hasil evaluasi menunjukkan bahwa XGBoost memberikan performa terbaik dengan MAE 3.02 μg/m³ dan MAPE 17.14%, mengungguli LightGBM (MAE: 3.03 μg/m³, MAPE: 17.09%) dan Prophet (MAE: 4.16 μg/m³, MAPE: 22.72%). Model XGBoost dikombinasikan dengan pola statistik harian (pola diurnal) untuk meningkatkan akurasi prediksi pada horizon waktu yang lebih panjang. Sistem yang dikembangkan berhasil mengintegrasikan monitoring real-time dengan prediksi yang akurat, menyediakan dashboard informatif yang menampilkan data PM2.5, PM10, ISPU, kondisi sensor, dan parameter meteorologi.

Kata Kunci: Kualitas Udara, PM2.5, Machine Learning, XGBoost, Pola Harian, Monitoring Real-time, Prediksi

---

## ABSTRACT

Poor air quality has become a serious problem in various regions of Indonesia, especially in major cities, impacting public health. This research aims to develop the air quality monitoring and prediction system that can provide real-time information and PM2.5 concentration predictions to assist the public in making decisions related to outdoor activities and health. The system integrates hardware based on PM2.5, PM10, temperature, and humidity sensors with a web-based dashboard platform for data monitoring and analysis. This research evaluates three machine learning models for PM2.5 concentration prediction: XGBoost, LightGBM, and Prophet. Evaluation results demonstrate that XGBoost delivers the best performance with MAE of 3.02 μg/m³ and MAPE of 17.14%, outperforming LightGBM (MAE: 3.03 μg/m³, MAPE: 17.09%) and Prophet (MAE: 4.16 μg/m³, MAPE: 22.72%). The XGBoost model is combined with daily statistical patterns (diurnal patterns) to improve prediction accuracy for longer time horizons. The developed system successfully integrates real-time monitoring with accurate predictions, providing an informative dashboard that displays PM2.5, PM10, ISPU, sensor conditions, and meteorological parameters.

Keywords: Air Quality, PM2.5, Machine Learning, XGBoost, Daily Pattern, Real-time Monitoring, Prediction

---

## DAFTAR ISI

DAFTAR GAMBAR

DAFTAR TABEL

BAB 1 - PENDAHULUAN

BAB 2 - KAJIAN PUSTAKA

BAB 3 - DESKRIPSI SISTEM

BAB 4 - HASIL PENELITIAN

BAB 5 - PENUTUP

---

## BAB 1 - PENDAHULUAN

### 1.1 Latar Belakang
Peningkatan pesat urbanisasi dan industrialisasi telah menyebabkan degradasi kualitas udara parah, menjadi ancaman serius bagi kesehatan manusia dan ekosistem, serta mempercepat perubahan iklim global. Polusi udara ini, jika tidak ditangani, dapat menghambat kemajuan pencapaian Tujuan Pembangunan Berkelanjutan (SDGs). Kota Surabaya, sebagai pusat ekonomi dan industri terbesar kedua, menghadapi krisis masalah ini. Pertumbuhan pesat sektor otomotif dan industri secara signifikan meningkatkan Konsentrasi emisi polutan, di mana emisi transportasi terbukti menjadi penyumbang pencemaran udara tertinggi di perkotaan, mencapai sekitar 80%.

Kondisi ini diperparah oleh fenomena iklim yang makin tidak menentu. Dalam laporan resmi BMKG Juanda, periode 17–23 Maret 2025 diprediksi mengalami peningkatan intensitas cuaca ekstrem di wilayah Surabaya dan Jawa Timur, meliputi hujan lebat, angin kencang, hujan es, dan potensi puting beliung. Suhu dan kelembapan udara juga merupakan faktor meteorologis kunci yang memengaruhi konsentrasi serta perilaku polutan.

Untuk menjawab permasalahan tersebut dan mengatasi keterbatasan sistem pemantauan konvensional yang umumnya bersifat historis serta tidak prediktif, proyek akhir ini mengusulkan pengembangan Dashboard Pemantauan dan Prediksi Kualitas Udara Berbasis Web Real-Time yang dirancang khusus untuk Kota Surabaya. Sistem ini mengintegrasikan data dari sensor IoT lokal dan data sekunder resmi dari BMKG untuk menyediakan informasi kualitas udara secara dinamis. Selain itu, dashboard ini akan dilengkapi dengan kemampuan klasifikasi otomatis menggunakan algoritma machine learning serta model prediksi untuk memperkirakan kondisi kualitas udara di masa mendatang.

### 1.2 Permasalahan
Berdasarkan latar belakang yang diuraikan dan fokus proyek, permasalahan utama yang ingin diatasi dalam proyek ini adalah sebagai berikut:
1. Minimnya sistem monitoring kualitas udara yang menyediakan informasi real-time dan kemampuan prediksi akurat secara lokal, khususnya di area padat aktivitas Kota Surabaya.
2. Belum optimalnya pemanfaatan algoritma machine learning untuk klasifikasi serta prediksi kualitas udara berbasis data lokal Surabaya.
3. Kurangnya platform terpadu yang dapat menyajikan data dan hasil analisis secara interaktif sebagai alat bantu pengambilan keputusan kebijakan lingkungan.

### 1.3 Tujuan
> Adapun tujuan yang ingin dicapai melalui proyek akhir ini adalah sebagai berikut:
> 1. Mengembangkan antarmuka web yang interaktif untuk eksplorasi dan visualisasi data kualitas udara real-time.
> 2. Mengimplementasikan algoritma XGBoost dengan kombinasi pola harian untuk prediksi kualitas udara 60 menit ke depan.
> 3. Mengimplementasikan algoritma Random Forest untuk klasifikasi kualitas udara berdasarkan standar ISPU.
> 4. Mengembangkan dashboard untuk membantu pengambilan keputusan kebijakan lingkungan.

### 1.4 Manfaat
Proyek akhir ini diharapkan dapat memberikan beberapa manfaat signifikan bagi berbagai pihak:
- **Bagi Masyarakat Umum:** Meningkatkan akses informasi kualitas udara yang teragregasi secara real-time dan prediktif.
- **Bagi Pemerintah Kota Surabaya:** Menyediakan dasar data yang kuat untuk perumusan kebijakan lingkungan yang lebih tepat sasaran.
- **Bagi Komunitas dan Akademisi:** Menjadi sumber data teragregasi dan model prediksi yang valid untuk penelitian lebih lanjut.
- **Bagi Sektor Industri dan Transportasi:** Menyediakan data objektif mengenai kontribusi dan dampak operasional mereka terhadap kualitas udara.

---

## BAB 2 - KAJIAN PUSTAKA

### 2.1 Deskripsi Permasalahan
Kualitas udara merupakan isu lingkungan global yang semakin mendesak, terutama di area perkotaan yang padat akibat pesatnya urbanisasi dan industrialisasi. Permasalahan pada sistem pemantauan kualitas udara saat ini adalah keterbatasannya dalam menyediakan informasi yang bersifat prediktif dan real-time secara terpadu.

### 2.2 Teori Penunjang

### 2.2.1 Kualitas Udara dan Indikatornya
Kualitas udara merujuk pada kondisi udara yang dinilai dari parameter fisik, kimia, dan biologisnya. Di Indonesia, kondisi mutu udara ambien digambarkan melalui Indeks Standar Pencemar Udara (ISPU).

**Tabel 2.1 Kategori Indeks Pencemaran Udara**
| Rentang | Kategori | Penjelasan |
|---------|----------|-----------|
| 1-50 | Baik | Tingkat mutu udara yang sangat baik |
| 51-100 | Sedang | Tingkat mutu udara masih dapat diterima |
| 101-200 | Tidak Sehat | Tingkat mutu udara yang bersifat merugikan |
| 201-300 | Sangat Tidak Sehat | Tingkat mutu udara yang dapat meningkatkan risiko kesehatan |
| 301+ | Berbahaya | Tingkat mutu udara yang dapat merugikan kesehatan serius |

### 2.2.2 Internet of Things (IoT) untuk Pemantauan Lingkungan
Internet of Things (IoT) memungkinkan pengumpulan data dari sensor yang tersebar secara real-time dan otomatis, mengatasi batasan geografis dan biaya pemantauan tradisional.

### 2.2.3 Algoritma Machine Learning untuk Prediksi Kualitas Udara
Prediksi kualitas udara telah menjadi area penelitian yang aktif dengan penerapan berbagai algoritma machine learning.

### 2.2.4 XGBoost (eXtreme Gradient Boosting)
XGBoost adalah algoritma gradient boosting yang dikembangkan oleh Chen dan Guestrin pada tahun 2016. XGBoost membangun ensemble dari decision trees secara sekuensial, di mana setiap tree baru dilatih untuk memperbaiki error dari model sebelumnya.

XGBoost mengimplementasikan dua jenis regularization untuk mencegah overfitting:
- **Regularisasi L1 (Lasso)** dengan parameter alpha mendorong sparsity pada weights
- **Regularisasi L2 (Ridge)** dengan parameter lambda mencegah weights yang terlalu besar

**Dalam penelitian ini, XGBoost digunakan sebagai model utama untuk prediksi kualitas udara** karena kemampuannya menangani hubungan non-linear yang kompleks antara variabel polutan dan faktor meteorologi, serta regularisasi eksplisit yang efektif mencegah overfitting. Hasil evaluasi menunjukkan bahwa XGBoost mencapai MAE sebesar 3.02 μg/m³ dan MAPE 17.14%.

### 2.2.5 LightGBM (Light Gradient Boosting Machine)
LightGBM adalah framework gradient boosting yang dikembangkan oleh Microsoft pada tahun 2017, dirancang khusus untuk efisiensi dan performa tinggi pada dataset berskala besar.

LightGBM memiliki beberapa karakteristik unggulan:
- **Histogram-based splitting** untuk mengurangi waktu komputasi
- **Leaf-wise growth** yang memilih leaf dengan loss maksimum untuk diperluas
- **Gradient-based One-Side Sampling (GOSS)** untuk meningkatkan efisiensi tanpa mengorbankan akurasi

**Dalam penelitian ini, LightGBM digunakan sebagai model pembanding** untuk mengevaluasi performa model utama XGBoost dalam memprediksi konsentrasi polutan udara.

### 2.2.6 Prophet
Prophet adalah tool forecasting time series yang dikembangkan oleh Facebook (Meta) pada tahun 2017, dirancang khusus untuk menangani data dengan seasonality kuat dan efek holiday. Prophet menggunakan pendekatan decomposable additive model.

**Dalam penelitian ini, Prophet digunakan sebagai model pembanding** untuk memberikan perspektif peramalan berbasis pendekatan statistik-additive.

### 2.2.7 Random Forest
Random Forest adalah algoritma ensemble learning yang dikembangkan oleh Leo Breiman pada tahun 2001, yang membangun banyak decision trees secara paralel dan menggabungkan hasil voting untuk menghasilkan prediksi final.

**Dalam penelitian ini, Random Forest digunakan sebagai model utama untuk klasifikasi kategori ISPU**, dipilih karena memberikan keseimbangan optimal antara akurasi tinggi (99.70%) dan kecepatan komputasi.

---

## BAB 3 - DESKRIPSI SISTEM

### 3.1 Deskripsi Solusi
Solusi yang ditawarkan adalah sistem Dashboard Pemantauan dan Prediksi Kualitas Udara Berbasis Web Real-Time yang menyajikan informasi kualitas udara terkini, data historis, serta hasil prediksi melalui visualisasi yang mudah dipahami.

### 3.2 Desain Sistem
Arsitektur sistem terdiri atas empat proses utama:
1. **Data Acquisition** - Pengambilan data dari sensor IoT
2. **Backend Storage** - Penyimpanan data di Supabase
3. **Data Processing & Forecasting** - Pengolahan dan prediksi data
4. **Visualization** - Visualisasi informasi melalui dashboard

### 3.2.5 Tahapan Pembuatan Model
Pembuatan model machine learning dilakukan melalui tahapan yang sistematis:
- **XGBoost dengan Pola Harian** untuk prediksi konsentrasi polutan 60 menit ke depan (pendekatan hybrid yang menggabungkan XGBoost dengan pola statistik harian)
- **Random Forest** untuk klasifikasi kualitas udara berdasarkan standar ISPU
- **LightGBM dan Prophet** sebagai model pembanding untuk evaluasi performa

---

## BAB 4 - HASIL PENELITIAN

### 4.7.4.1 Implementasi Model XGBoost

#### Pendekatan Hybrid: XGBoost dengan Pola Harian

Dalam implementasi sistem prediksi real-time, XGBoost dikombinasikan dengan pola statistik harian untuk meningkatkan akurasi prediksi pada horizon waktu yang lebih panjang. Pendekatan ini didasarkan pada temuan analisis pola harian yang menunjukkan bahwa konsentrasi PM2.5 memiliki fluktuasi yang konsisten setiap jam (puncak pada jam 9-11 pagi, terendah pada malam hari).

Kombinasi XGBoost dengan pola harian dilakukan dengan formula blend berikut:

1. **Komponen XGBoost:** Memperhitungkan autokorelasi melalui lag features (1, 3, 5, 10, 15, 30 menit) dan trend terkini
2. **Komponen Pola Harian:** Rata-rata historis per jam yang menangkap pola diurnal yang konsisten
3. **Blend Weight Adaptif:** Bobot kombinasi berubah berdasarkan horizon prediksi:
   - Prediksi 1-5 menit: XGBoost (70%) + Pola Harian (30%)
   - Prediksi 6-30 menit: XGBoost (50%) + Pola Harian (50%)
   - Prediksi 31-60 menit: XGBoost (40%) + Pola Harian (60%)

Formula blend:
```
prediction = w_xgb × XGBoost_pred + w_pattern × hourly_pattern + noise
```

Dengan `w_xgb` dan `w_pattern` adalah bobot yang berubah secara adaptif berdasarkan horizon waktu. Pendekatan ini menggabungkan kemampuan XGBoost dalam menangkap pola jangka pendek dengan kemampuan pola harian dalam memperkirakan nilai rata-rata pada jam tertentu.

**Tabel 4.6 Parameter XGBoost (Tuned)**
| Parameter | Nilai | Deskripsi |
|-----------|-------|-----------|
| n_estimators | 300 | Jumlah iterasi boosting |
| max_depth | 5 | Kedalaman maksimum pohon |
| learning_rate | 0.05 | Laju pembelajaran |
| random_state | 42 | Seed untuk reproduktibilitas |

### 4.7.4.2 Implementasi Model LightGBM

**Tabel 4.7 Parameter LightGBM**
| Parameter | Nilai | Deskripsi |
|-----------|-------|-----------|
| n_estimators | 100 | Jumlah pohon dalam ensemble |
| max_depth | 5 | Kedalaman maksimum pohon |
| learning_rate | 0.1 | Laju pembelajaran model |
| random_state | 42 | Seed untuk reproduktibilitas |

### 4.7.4.3 Implementasi Model Prophet

**Tabel 4.8 Parameter Model Prophet**
| Parameter | Nilai | Deskripsi |
|-----------|-------|-----------|
| daily_seasonality | TRUE | Mengaktifkan pola musiman harian |
| weekly_seasonality | TRUE | Mengaktifkan pola musiman mingguan |
| yearly_seasonality | FALSE | Tidak diaktifkan |
| changepoint_prior_scale | 0.05 | Fleksibilitas deteksi perubahan trend |

### 4.7.4.4 Perbandingan Performa Ketiga Model Prediksi

Untuk memastikan pemilihan model yang optimal, dilakukan perbandingan komprehensif dengan tiga model forecasting: XGBoost, LightGBM, dan Prophet.

#### Pemilihan Metrik Evaluasi untuk Time Series Forecasting

Dalam evaluasi model forecasting, pemilihan metrik yang tepat sangat penting untuk mendapatkan gambaran akurat tentang performa model. Berbeda dengan metrik evaluasi machine learning umum seperti R² (coefficient of determination), metrik forecasting yang baik seharusnya:

1. **Bersifat interpretif** - memberikan informasi tentang besar error dalam unit yang sama dengan data
2. **Tahan terhadap skala data** - dapat dibandingkan antar dataset dengan skala berbeda
3. **Relevan secara praktis** - mencerminkan dampak error dalam konteks aplikasi

Dalam penelitian ini, digunakan tiga metrik utama:
- **MAE (Mean Absolute Error)** - rata-rata error absolut, mudah diinterpretasi karena satuannya sama dengan target
- **RMSE (Root Mean Squared Error)** - menalti error besar lebih berat, berguna ketika error besar sangat tidak diinginkan
- **MAPE (Mean Absolute Percentage Error)** - error dalam persentase, memungkinkan perbandingan relatif antar dataset

**Catatan:** Metrik R² (coefficient of determination) tidak digunakan sebagai metrik utama karena mengukur proporsi varians yang dijelaskan, bukan akurasi prediksi aktual. R² dapat menyesatkan dalam evaluasi forecasting karena tidak memperhitungkan karakteristik temporal data.

**Tabel 4.9 Perbandingan Metrik Evaluasi Model Prediksi**
| Model | MAE (μg/m³) | RMSE (μg/m³) | MAPE (%) | Ranking |
|-------|-------------|---------------|---------|---------|
| **XGBoost** | 3.02 | 3.77 | 17.14% | **1** |
| **LightGBM** | 3.03 | 3.78 | 17.09% | 2 |
| Prophet | 4.16 | 5.21 | 22.72% | 3 |

#### Analisis Perbandingan:

1. **XGBoost vs LightGBM:** XGBoost menunjukkan performa sedikit lebih baik dengan MAE 3.02 μg/m³ dibandingkan LightGBM dengan MAE 3.03 μg/m³. Perbedaan yang sangat kecil (<0.01) menunjukkan kedua model memiliki performa yang comparable. Namun, XGBoost dipilih karena learning rate yang lebih rendah (0.05) dan jumlah tree yang lebih banyak (300) memberikan prediksi yang lebih stabil.

2. **MAE Interpretasi:** MAE XGBoost sebesar 3.02 μg/m³ berarti secara rata-rata prediksi meleset sekitar 3 μg/m³ dari nilai aktual. Untuk konteks kualitas udara dengan rata-rata PM2.5 sekitar 20 μg/m³, error ini merupakan sekitar 15% dari rata-rata, yang masih dalam batas acceptable.

3. **MAPE Interpretasi:** MAPE 17.14% menunjukkan bahwa secara rata-rata, prediksi meleset sekitar 17% dari nilai aktual. Ini menunjukkan bahwa model memiliki akurasi sekitar 83% dalam sense relatif.

4. **XGBoost/LightGBM vs Prophet:** Kedua model gradient boosting mengungguli Prophet dengan signifikan. Prophet memiliki MAE 37% lebih tinggi (4.16 vs 3.02), menunjukkan ketidakmampuannya dalam memanfaatkan lag features secara optimal untuk data per menit.

#### Kesimpulan:
**XGBoost dengan Pola Harian dipilih sebagai model utama untuk prediksi kualitas udara** karena memberikan performa terbaik dengan MAE dan RMSE terendah. MAE sebesar 3.02 μg/m³ menunjukkan bahwa secara rata-rata prediksi meleset sekitar 3 μg/m³ dari nilai aktual, yang merupakan error sekitar 15% dari rata-rata PM2.5 - masih dalam batas yang dapat diterima untuk aplikasi pemantauan kualitas udara. Pendekatan hybrid ini menggabungkan kekuatan machine learning (XGBoost) dengan insight dari analisis pola statistik (pola harian), sehingga memberikan prediksi yang lebih akurat dan robust untuk horizon 60 menit ke depan.

### 4.7.5 Implementasi Model Klasifikasi ISPU

### 4.7.5.1 Implementasi Model Random Forest

**Tabel 4.13 Spesifikasi Model Klasifikasi**
| Parameter | Nilai |
|-----------|-------|
| Algoritma | Random Forest Classifier |
| n_estimators | 100 |
| Fitur Input | PM2.5, PM10, CO, NO2, O3, Suhu, Kelembaban |
| Target | Kategori ISPU (Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, Berbahaya) |
| Strategi Kelas | Balanced |

**Tabel 4.14 Hasil Klasifikasi Random Forest**
| Kategori ISPU | Precision | Recall | F1-Score | Support |
|---------------|-----------|--------|----------|---------|
| Baik | 0.98 | 1.00 | 0.99 | 309 |
| Sedang | 1.00 | 1.00 | 1.00 | 2160 |
| Tidak Sehat | 1.00 | 1.00 | 1.00 | 239 |
| Sangat Tidak Sehat | 1.00 | 1.00 | 1.00 | 1945 |
| Berbahaya | 1.00 | 0.97 | 0.99 | 335 |
| **Accuracy** | | | **99.70%** | 4988 |
| Macro Avg | 1.00 | 0.99 | 0.99 | 4988 |
| Weighted Avg | 1.00 | 1.00 | 1.00 | 4988 |

### 4.7.5.2 Perbandingan Model Klasifikasi

**Tabel 4.15 Perbandingan Model Klasifikasi**
| Model | Accuracy | Precision (W) | Recall (W) | F1 (W) | F1 (M) | Training Time |
|-------|----------|----------------|------------|---------|---------|--------------|
| **Random Forest** | **99.70%** | **99.70%** | **99.70%** | **99.70%** | **99.46%** | **0.317s** |
| Gradient Boosting | 99.74% | 99.74% | 99.74% | 99.74% | 99.48% | 12.267s |
| LightGBM | 99.64% | 99.64% | 99.64% | 99.64% | 99.32% | 0.668s |

### 4.7.5.3 Alasan Pemilihan Random Forest
Meskipun Gradient Boosting menunjukkan akurasi tertinggi (99.74%), Random Forest dipilih sebagai model klasifikasi karena:
- Selisih akurasi hanya 0.04% (99.70% vs 99.74%), perbedaan yang tidak signifikan secara statistik maupun praktis
- Random Forest **39x lebih cepat** (0.317s vs 12.267 detik)
- Lebih mudah di-maintain tanpa tuning hyperparameter kompleks
- Feature importance yang jelas untuk analisis kontribusi polutan

---

## BAB 5 - PENUTUP

### 5.1 Kesimpulan
Berdasarkan hasil penelitian dan pengembangan sistem monitoring dan prediksi kualitas udara Dashboard Web yang telah dilakukan, dapat disimpulkan beberapa hal sebagai berikut:

1. **Keberhasilan Implementasi Sistem Monitoring**
   Dashboard Web telah berhasil diimplementasikan dengan kemampuan monitoring kualitas udara secara real-time menggunakan sensor PM2.5, PM10, suhu, dan kelembapan.

2. **Performa Model Prediksi**
   Dari tiga model machine learning yang diuji (XGBoost, LightGBM, dan Prophet):
   - **XGBoost dengan Pola Harian** menunjukkan performa terbaik dengan MAE 3.02 μg/m³ dan MAPE 17.14%. MAE sebesar 3.02 μg/m³ berarti secara rata-rata prediksi meleset sekitar 3 μg/m³ dari nilai aktual, yang merupakan error sekitar 15% dari rata-rata PM2.5 - masih dalam batas yang dapat diterima untuk aplikasi pemantauan kualitas udara.
   - LightGBM berada di posisi kedua dengan MAE 3.03 μg/m³, MAPE 17.09%.
   - Prophet menempati posisi ketiga dengan MAE 4.16 μg/m³, MAPE 22.72%.
   
   Perbedaan performa yang cukup signifikan antara model boosting (XGBoost, LightGBM) dengan Prophet menunjukkan bahwa model ensemble boosting lebih cocok untuk data kualitas udara dibandingkan model time series tradisional.

3. **Performa Model Klasifikasi**
   Model Random Forest berhasil mengklasifikasikan 5 kategori ISPU dengan akurasi keseluruhan 99.70%, menjadikannya pilihan optimal dengan keseimbangan antara akurasi tinggi dan kecepatan komputasi (39x lebih cepat dari Gradient Boosting).

4. **Arsitektur Sistem yang Terintegrasi**
   Dashboard Web menggunakan arsitektur yang terintegrasi dengan baik, menggabungkan hardware sensor, backend Supabase, dan frontend dashboard untuk visualisasi real-time.

### 5.2 Rencana Pengembangan Kedepan
Untuk meningkatkan kualitas dan fungsionalitas sistem, beberapa pengembangan yang direncanakan:
- Penambahan fitur data temporal untuk menangkap pola musiman
- Pengembangan sistem alert dan rekomendasi berbasis prediksi untuk pemangku kebijakan
- Eksplorasi model prediksi lanjutan dengan hyperparameter tuning menggunakan Optuna
- Implementasi sistem notifikasi dini untuk kelompok rentan

---

## DAFTAR PUSTAKA

[1] Ismiyati, D. Marlita, and D. Saidah, "Pencemaran Udara Akibat Emisi Gas Buang," J. Manajeen Transp. Logistik, vol. 1, no. 3, pp. 241–248, 2014.

[2] L. Hurek, "BMKG Juanda Peringatkan Cuaca Ekstrem di Surabaya dan Jawa Timur," radarsurabaya, 2025.

[3] IQAir, "World Air Quality Report 2024," 2024.

[4] A. Bekkar et al., "Real-time AIoT platform for monitoring and prediction of air quality in Southwestern Morocco," PLoS One, vol. 19, no. 8, 2024.

[5] P. Dey, S. Dev, and B. S. Phelan, "BiLSTM-BiGRU: A Fusion Deep Neural Network For Predicting Air Pollutant Concentration," IGARSS, 2023.

[6] I. S. R. Dasrul Chaniago, "INDEKS STANDAR PENCEMAR UDARA (ISPU) SEBAGAI INFORMASI MUTU UDARA AMBIEN DI INDONESIA."

[7] M. Kusnandar, "Permen LHK Nomor 14 Tahun 2020 tentang Indeks Standar Pencemar Udara."

[8] J. Pebralia, H. Akhsan, and I. Amri, "Implementasi Internet of Things (IoT) Dalam Monitoring Kualitas Udara Pada Ruang Terbuka," J. Kumparan Fis., vol. 7, no. 1, 2024.

[9] A. Octaviano et al., "Pemantauan Kualitas Udara Berbasis Internet of Things," J. Klik, vol. 3, no. 2, 2022.

[10] Y. Özüpak and F. Alpsalaz, "Air Quality Forecasting Using Machine Learning: Comparative Analysis and Ensemble Strategies," Water, Air, Soil Pollut., vol. 236, 2025.

[11] G. Ke et al., "LightGBM: A Highly Efficient Gradient Boosting Decision Tree," NIPS, 2017.

[12] S. Tırınk, "Machine learning-based forecasting of air quality index under long-term environmental patterns," PLoS One, 2025.

[13] Z. Zhang et al., "A systematic survey of air quality prediction based on deep learning," Alexandria Eng. J., vol. 93, 2024.

[14] L. Mampitiya et al., "Performance of machine learning models to forecast PM10 levels," MethodsX, 2024.

[15] T. Chen and C. Guestrin, "XGBoost: A scalable tree boosting system," KDD, 2016.

[16] J. Andrés and O. Mantilla, "Prediction of PM2.5 and PM10 Concentrations Using XGBoost and LightGBM Algorithms," 2024.

[17] U. M. Superiorities, "Decoding PM2.5 Prediction in Nanning Urban Area, China," 2025.

[18] S. Algorithm, "PM2.5 Concentration Prediction Based on LightGBM Optimized by Adaptive Multi-Strategy Enhanced Sparrow Search Algorithm," 2023.

[19] S. I. Purwaningrum, PEMANTAUAN KUALITAS UDARA. Widina Media Utama, 2024.
