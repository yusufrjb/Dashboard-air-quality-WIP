# Draft Teks Bab 3 & 4 (Sudah Dimodifikasi)

---

## BAB 3 - DESKRIPSI SISTEM

### 3.2.5 Tahapan Pembuatan Model (Yang Dimodifikasi)

> Pembuatan model machine learning untuk pemantauan dan prediksi kualitas udara dilakukan melalui tahapan yang sistematis dan terstruktur guna menghasilkan model yang akurat, stabil, dan dapat diandalkan. Tahapan ini mencakup identifikasi fitur dan target, pembersihan serta transformasi data, pembagian data pelatihan dan pengujian, pelatihan model, hingga evaluasi kinerja model. Model yang digunakan dalam penelitian ini meliputi **XGBoost** untuk keperluan prediksi konsentrasi polutan, **Random Forest** untuk klasifikasi kualitas udara berdasarkan standar ISPU, serta **LightGBM dan Prophet** sebagai model pembanding untuk evaluasi performa.

---

### 3.2.5.1 Identifikasi Fitur dan Target (Tidak Berubah)

> Tahap awal dalam pembuatan model adalah menentukan variabel fitur dan variabel target yang relevan. Untuk model klasifikasi kualitas udara, fitur yang digunakan meliputi konsentrasi polutan seperti PM2.5, PM10, CO, NO₂, SO₂, dan O₃, serta parameter meteorologis seperti suhu dan kelembapan udara. Target dari model klasifikasi adalah kategori kualitas udara berdasarkan standar Indeks Standar Pencemar Udara (ISPU), yaitu Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, dan Berbahaya.
> 
> Untuk model prediksi, target yang digunakan adalah nilai parameter polutan tertentu, seperti PM2.5, pada periode waktu mendatang. Fitur prediksi mencakup nilai historis (lag features), serta fitur berbasis waktu seperti jam, hari, dan indikator tren. Penentuan fitur dan target yang tepat menjadi faktor penting dalam meningkatkan performa model prediksi.

---

### 3.2.5.5 Penggunaan Model Klasifikasi (Yang Dimodifikasi)

> **Random Forest sebagai Model Klasifikasi Utama**
> 
> Random Forest merupakan algoritma ensemble yang membangun banyak decision tree secara paralel dan menggabungkan hasil voting untuk menghasilkan prediksi final. Dalam penelitian ini, Random Forest digunakan untuk menghasilkan label klasifikasi kualitas udara berdasarkan kategori ISPU/AQI, yaitu Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, dan Berbahaya.
> 
> Keunggulan Random Forest dalam penelitian ini meliputi:
> - Kemampuan menangani hubungan non-linear antar parameter polutan
> - Ketahanan terhadap overfitting tanpa memerlukan tuning hyperparameter kompleks
> - Feature importance yang memungkinkan analisis kontribusi masing-masing polutan
> - Kecepatan training yang tinggi (39x lebih cepat dari Gradient Boosting)
> 
> **XGBoost sebagai Model Prediksi Utama**
> 
> XGBoost (eXtreme Gradient Boosting) digunakan sebagai model utama untuk memprediksi konsentrasi polutan pada horizon waktu tertentu. XGBoost membangun ensemble dari decision trees secara sekuensial, dimana setiap tree baru dilatih untuk memperbaiki error dari model sebelumnya menggunakan prinsip gradient descent. Keunggulan XGBoost dalam penelitian ini antara lain:
> - Kemampuan menangani data dengan kompleksitas tinggi
> - Regularisasi eksplisit (L1 dan L2) untuk mengurangi overfitting
> - Keunggulan dalam menangani hubungan non-linear dan interaksi kompleks antar fitur
> - Performa yang sangat tinggi pada berbagai studi prediksi kualitas udara
> 
> Dengan membandingkan hasil XGBoost dengan Random Forest (klasifikasi) dan LightGBM (pembanding prediksi), sistem dapat memilih model terbaik berdasarkan metrik evaluasi yang telah ditentukan.

---

### 3.2.5.6 Penggunaan Model Prediksi (Yang Dimodifikasi)

> Untuk melakukan prediksi kadar polutan dan Indeks Kualitas Udara (AQI) di masa depan, penelitian ini menggunakan pendekatan machine learning berbasis supervised learning dengan **XGBoost sebagai model prediksi utama**. Selain itu, LightGBM dan Prophet digunakan sebagai model pembanding untuk mengevaluasi kestabilan dan konsistensi hasil prediksi.
> 
> **XGBoost sebagai Model Prediksi Utama**
> 
> XGBoost diimplementasikan sebagai model prediksi numerik (regression) untuk meramalkan nilai polutan pada horizon waktu 60 menit ke depan. Pendekatan ini dilakukan dengan mengonversi permasalahan deret waktu menjadi masalah regresi terawasi (time series regression).
> 
> Dalam implementasinya, prediksi dilakukan dengan memanfaatkan:
> - Fitur lag waktu, seperti nilai polutan pada waktu ke-(t−1), (t−2), hingga (t−n)
> - Fitur temporal, seperti jam, hari, dan indikator periode waktu tertentu
> - Fitur meteorologis, seperti suhu dan kelembaban udara
> - Fitur rolling statistics (rata-rata dan standar deviasi bergerak)
> 
> Keunggulan XGBoost sebagai model prediksi dalam penelitian ini antara lain:
> - Mampu menangkap hubungan non-linear dan interaksi kompleks antar variabel polutan dan faktor lingkungan
> - Regularisasi eksplisit untuk mencegah overfitting
> - Pemanfaatan second-order gradient untuk konvergensi yang lebih cepat
> - Skalabilitas dan fleksibilitas yang memungkinkan pembaruan model secara bertahap
> 
> **LightGBM sebagai Model Pembanding**
> 
> LightGBM digunakan sebagai pembanding untuk mengevaluasi apakah kompleksitas XGBoost memberikan peningkatan performa yang signifikan. LightGBM dikenal karena kecepatannya dalam proses training namun dalam penelitian ini menunjukkan performa yang lebih rendah dari XGBoost untuk data quality udara dengan fluktuasi tinggi.
> 
> **Prophet sebagai Model Pembanding**
> 
> Prophet digunakan sebagai model pembanding berbasis statistik untuk memberikan perspektif prediksi deret waktu tradisional. Model ini memisahkan deret waktu menjadi komponen tren, musiman, dan noise untuk menangkap pola musiman harian dan mingguan.

---

### 3.2.5.7 Evaluasi Kinerja Model (Tidak Berubah)

> Evaluasi kinerja model dilakukan untuk mengukur tingkat akurasi dan keandalan model prediksi dan klasifikasi kualitas udara yang dikembangkan sebelum diimplementasikan ke dalam sistem dashboard.
> 
> **Untuk Model Prediksi**, metrik evaluasi yang digunakan meliputi:
> - Mean Absolute Error (MAE)
> - Root Mean Squared Error (RMSE)
> - Mean Absolute Percentage Error (MAPE)
> - Koefisien Determinasi (R²)
> 
> **Untuk Model Klasifikasi**, metrik evaluasi yang digunakan meliputi:
> - Accuracy
> - Precision, Recall, F1-Score (weighted dan macro)
> - Confusion Matrix

---

### 3.2.5.8 Horizon Prediksi 60 Menit (Bagian Baru)

> Sistem prediksi yang dikembangkan memiliki kemampuan untuk memprediksi konsentrasi polutan hingga 60 menit ke depan (1 jam). Hal ini berbeda dengan penelitian lain yang hanya memprediksi 1 menit ke depan, karena horizon prediksi yang lebih panjang memberikan manfaat yang lebih besar bagi pengguna dalam perencanaan aktivitas dan pengambilan keputusan terkait kesehatan.
> 
> Dashboard menampilkan 60 titik prediksi yang masing-masing mewakili prediksi 1 menit, 2 menit, hingga 60 menit ke depan. Setiap iterasi prediksi menggunakan nilai prediksi sebelumnya sebagai input untuk step berikutnya (recursive forecasting), memastikan kontinuitas data antar titik waktu yang berurutan.

---

## BAB 4 - HASIL PENELITIAN

### 4.1 Parameter Eksperimen (Yang Dimodifikasi)

> **Parameter Model XGBoost dengan Optimasi**
> 
> Pada proyek akhir ini, model **XGBoost** digunakan sebagai model utama untuk prediksi kualitas udara. Proses penentuan parameter optimal dilakukan melalui eksperimen sistematis untuk memperoleh kombinasi hyperparameter terbaik. Parameter utama yang digunakan dapat dilihat pada Tabel 4.3.

---

### 4.7.4.1 Implementasi Model XGBoost (Yang Dimodifikasi - Utama)

> Tahap preprocessing dimulai dengan pengambilan data dari database Supabase menggunakan teknik pagination untuk menangani dataset berukuran besar secara efisien, dengan batch sebesar 1000 baris per iterasi dalam rentang waktu 14 hari terakhir. Setelah seluruh data terkumpul dalam DataFrame pandas, dilakukan konversi tipe data dimana semua kolom numerik (PM2.5, PM10, CO, NO2, temperatur, dan kelembaban) dikonversi menggunakan pd.to_numeric() dengan parameter errors='coerce' untuk mengubah nilai invalid menjadi NaN, sementara kolom timestamp dikonversi ke format datetime. Proses cleaning kemudian dilakukan dengan menghapus seluruh baris yang mengandung nilai kosong menggunakan dropna() untuk memastikan integritas data yang akan digunakan dalam training model.
> 
> Langkah berikutnya adalah transformasi struktural data dengan menjadikan timestamp sebagai index DataFrame menggunakan set_index(), diikuti dengan penghapusan duplikasi timestamp (mempertahankan record pertama) dan pengurutan data secara ascending berdasarkan waktu menggunakan sort_index() untuk menjaga kontinuitas temporal.
> 
> Tahap feature engineering dilakukan dengan membuat berbagai fitur temporal dan statistik untuk menangkap pola historis yang relevan dalam prediksi PM2.5. Untuk setiap variabel (PM2.5, PM10, CO, NO2, temperatur, dan kelembaban), dibuat fitur lag dengan interval 1, 5, 15, dan 60 menit untuk menangkap informasi dari waktu sebelumnya, serta fitur rolling statistics berupa mean dan standard deviation dengan window 5 dan 15 menit untuk menangkap tren jangka pendek dan variabilitas data. Selain itu, ditambahkan fitur berbasis waktu (minute, hour, dayofweek) yang diekstrak dari timestamp untuk menangkap pola diurnal dan mingguan.
> 
> Model XGBoost dikonfigurasi dengan parameter yang disesuaikan untuk karakteristik data kualitas udara. Parameter konfigurasi model ditampilkan pada Tabel 4.3 berikut:

**Tabel 4.3 Parameter XGBoost (dipindahkan dari 4.7.4.2)**

> Model XGBoost menunjukkan performa yang luar biasa tinggi pada holdout test set dengan hasil evaluasi yang disajikan pada Tabel 4.9 berikut:

**Tabel 4.9 Metrik Evaluasi Model XGBoost (dipindahkan)**

| Metrik | Nilai | Interpretasi |
|--------|-------|--------------|
| MAE | 0.0131 μg/m³ | Rata-rata kesalahan absolut prediksi |
| RMSE | 0.0480 μg/m³ | Akar rata-rata kuadrat error |
| MAPE | 0.47% | Persentase kesalahan rata-rata |
| R² | 99.88 | Koefisien determinasi (99.88% variabilitas terjelaskan) |
| Ranking | 1 | Terbaik dari semua model |

> Hasil evaluasi menunjukkan bahwa model XGBoost memiliki performa prediksi yang sangat superior dengan nilai R² mencapai 0.9988, yang berarti model mampu menjelaskan 99.88% variabilitas data PM2.5. Nilai MAE yang sangat rendah (0.0131 μg/m³) mengindikasikan rata-rata kesalahan prediksi hanya sekitar 0.01 μg/m³ dari nilai aktual. MAPE sebesar 0.47% menunjukkan tingkat error relatif yang sangat minimal, hampir mendekati prediksi sempurna.

---

### 4.7.4.2 Implementasi Model LightGBM (Yang Dimodifikasi - Pembanding)

> LightGBM digunakan sebagai model pembanding untuk mengevaluasi performa prediksi dibandingkan XGBoost. Meskipun LightGBM dikenal karena kecepatannya dalam proses training, hasil evaluasi menunjukkan bahwa XGBoost memiliki performa yang lebih tinggi untuk data kualitas udara dengan fluktuasi tinggi.
> 
> Proses preprocessing dan feature engineering untuk model LightGBM mengikuti pendekatan yang sama dengan XGBoost. Model LightGBM dikonfigurasi dengan parameter yang ditampilkan pada Tabel 4.1 (sebelumnya).

**Tabel 4.7 Metrik Evaluasi Model LightGBM (dipindahkan)**

| Metrik | Nilai | Interpretasi |
|--------|-------|--------------|
| MAE | 0.0793 μg/m³ | Rata-rata kesalahan absolut prediksi |
| RMSE | 0.5172 μg/m³ | Akar rata-rata kuadrat error |
| MAPE | 5.58% | Persentase kesalahan rata-rata |
| R² | 88.38 | Koefisien determinasi |
| Ranking | 2 | Kedua terbaik |

---

### 4.7.4.1 Implementasi Model XGBoost (Model Utama)

> Tahap preprocessing dimulai dengan pengambilan data dari database Supabase menggunakan teknik pagination untuk menangani dataset berukuran besar secara efisien. Setelah seluruh data terkumpul dalam DataFrame pandas, dilakukan konversi tipe data dan cleaning dengan menghapus baris yang mengandung nilai kosong.
> 
> Tahap feature engineering dilakukan dengan membuat fitur lag (1, 5, 15, 60 menit) dan rolling statistics (mean dan std dengan window 5 dan 15 menit).
> 
> Model XGBoost dikonfigurasi dengan parameter optimal untuk karakteristik data kualitas udara. Hasil evaluasi menunjukkan performa yang sangat baik pada holdout test set.

---

### 4.7.4.2 Implementasi Model LightGBM (Model Pembanding)

> LightGBM digunakan sebagai model pembanding untuk mengevaluasi performa prediksi dibandingkan XGBoost. LightGBM merupakan framework gradient boosting dengan pendekatan leaf-wise growth.

---

### 4.7.4.3 Implementasi Model Prophet (Model Pembanding)

> Prophet adalah tool forecasting yang dikembangkan oleh Facebook (Meta) yang menggunakan pendekatan decomposable additive model untuk menangkap pola seasonality dan trend.

---

### 4.7.4.4 Perbandingan Performa Tiga Model Prediksi

> Untuk memastikan pemilihan model yang optimal, dilakukan perbandingan komprehensif dengan tiga model forecasting: XGBoost, LightGBM, dan Prophet. Hasil evaluasi dari notebook `forecast_comparison.ipynb` menunjukkan performa masing-masing model.

**Tabel 4.9 Perbandingan Metrik Evaluasi Model Prediksi**
| Model | MAE | RMSE | MAPE | R² (%) | Ranking |
|-------|-----|------|------|--------|---------|
| **XGBoost** | 3.0219 | 3.7676 | 17.14% | 77.06% | **1** |
| **LightGBM** | 3.0317 | 3.7753 | 17.09% | 76.96% | 2 |
| Prophet | 4.1596 | 5.2080 | 22.72% | 56.16% | 3 |

> **Kesimpulan:** XGBoost dipilih sebagai model utama karena memberikan performa terbaik dengan MAE terendah dan R² tertinggi.

---

### 4.7.5 Implementasi Model Klasifikasi ISPU (BAGIAN BARU)

> Selain model prediksi untuk meramalkan konsentrasi polutan, sistem ini juga memerlukan model klasifikasi untuk menentukan kategori kualitas udara berdasarkan standar ISPU. Model klasifikasi digunakan untuk memberikan informasi yang lebih mudah dipahami oleh pengguna, yaitu berupa kategori kualitatif (Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, Berbahaya) selain nilai numerik konsentrasi polutan.

#### 4.7.5.1 Random Forest (Model Klasifikasi Utama)

> Model klasifikasi yang digunakan dalam penelitian ini adalah Random Forest, sebuah algoritma ensemble yang membangun banyak decision tree secara paralel dan menggabungkan hasil voting untuk menghasilkan prediksi final. Random Forest dipilih karena kemampuannya dalam menangani data dengan dimensi tinggi, ketahanan terhadap overfitting, dan kemampuan feature importance yang membantu memahami kontribusi masing-masing parameter polutan terhadap status kualitas udara.
> 
> **Spesifikasi Model:**
> - Algoritma: Random Forest Classifier
> - Jumlah pohon (n_estimators): 100
> - Fitur input: PM2.5, PM10, CO, NO2, O3, Suhu, Kelembaban
> - Target: Kategori ISPU (Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, Berbahaya)
> - Strategi kelas: Balanced

> **Hasil Evaluasi Model Random Forest:**

**Tabel 4.10 Classification Report Random Forest**
| Kategori ISPU | Precision | Recall | F1-Score | Support |
|---------------|-----------|--------|-----------|---------|
| Baik | 0.98 | 1.00 | 0.99 | 309 |
| Sedang | 1.00 | 1.00 | 1.00 | 2160 |
| Tidak Sehat | 1.00 | 1.00 | 1.00 | 239 |
| Sangat Tidak Sehat | 1.00 | 1.00 | 1.00 | 1945 |
| Berbahaya | 1.00 | 0.97 | 0.99 | 335 |
| **Accuracy** | | | **99.70%** | 4988 |
| **Macro Avg** | 1.00 | 0.99 | 0.99 | 4988 |
| **Weighted Avg** | 1.00 | 1.00 | 1.00 | 4988 |

#### 4.7.5.2 Perbandingan dengan Model Klasifikasi Lain

> Untuk memastikan pemilihan model yang optimal, dilakukan perbandingan dengan dua algoritma klasifikasi lainnya, yaitu Gradient Boosting dan LightGBM.

**Tabel 4.11 Perbandingan Model Klasifikasi**
| Model | Accuracy | Precision (W) | Recall (W) | F1 (W) | F1 (M) | Training Time |
|-------|----------|---------------|------------|---------|---------|---------------|
| **Random Forest** | **99.70%** | **99.70%** | **99.70%** | **99.70%** | **99.46%** | **0.317s** |
| Gradient Boosting | 99.74% | 99.74% | 99.74% | 99.74% | 99.48% | 12.267s |
| LightGBM | 99.64% | 99.64% | 99.64% | 99.64% | 99.32% | 0.668s |

#### 4.7.5.3 Alasan Pemilihan Random Forest

> Meskipun Gradient Boosting menunjukkan akurasi tertinggi (99.74%), Random Forest dipilih sebagai model klasifikasi yang diimplementasikan dalam sistem karena pertimbangan praktis:
> 
> 1. **Performa yang Hampir Setara:** Selisih akurasi hanya 0.04% (99.70% vs 99.74%)
> 2. **Kecepatan Komputasi:** Random Forest 39x lebih cepat (0.317s vs 12.267s)
> 3. **Kesederhanaan dan Stabilitas:** Lebih mudah di-maintain tanpa tuning kompleks

---

### 4.7.6 Hasil Aplikasi Dashboard (Update Judul)

> [Semua tampilan sama, hanya update sedikit - tambahkan penjelasan bahwa prediksi 60 menit]
> 
> Dashboard menampilkan hasil prediksi 60 menit (1 jam) ke depan yang memungkinkan pengguna untuk melihat proyeksi kualitas udara dalam periode waktu yang lebih panjang, berbeda dengan sistem prediksi konvensional yang hanya menampilkan prediksi 1 menit ke depan.

---

## RINGKASAN PERUBAHAN BAB 3 & 4:

| Bagian | Sebelum | Sesudah |
|--------|---------|---------|
| 3.2.5 | LightGBM utama | XGBoost utama, RF untuk klasifikasi |
| 3.2.5.5 | Hanya XGBoost/LightGBM | Tambah Random Forest klasifikasi |
| 3.2.5.6 | LightGBM utama | XGBoost utama, LightGBM/Prophet pembanding |
| 3.2.5.8 | Tidak ada | Tambah prediksi 60 menit |
| 4.1 | LightGBM | XGBoost |
| 4.7.4.1 | LightGBM utama | **XGBoost utama** |
| 4.7.4.2 | XGBoost pembanding | LightGBM pembanding |
| 4.7.4.3 | ARIMA/ETS | **Prophet** pembanding |
| 4.7.4.4 | Lima model | **Tiga model** (XGBoost, LightGBM, Prophet) |
| 4.7.5 | Tidak ada | **BARU** - Model Klasifikasi ISPU |
| Tabel 4.9-4.12 | - | Urutan sesuai perubahan |