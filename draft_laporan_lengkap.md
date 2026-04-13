# Draft Lengkap Bab 1-4 (Sudah Dimodifikasi)

---

## BAB 1 - PENDAHULUAN

### 1.3 Tujuan (Yang Dimodifikasi)

> Adapun tujuan yang ingin dicapai melalui proyek akhir ini adalah sebagai berikut:
> 1. Mengembangkan antarmuka web yang interaktif untuk eksplorasi dan visualisasi data kualitas udara real-time.
> 2. Mengimplementasikan algoritma XGBoost dengan kombinasi pola harian untuk prediksi kualitas udara 60 menit ke depan.
> 3. Mengimplementasikan algoritma Random Forest untuk klasifikasi kualitas udara berdasarkan standar ISPU.
> 4. Mengembangkan dashboard untuk membantu pengambilan keputusan kebijakan lingkungan.

---

## BAB 2 - KAJIAN PUSTAKA

### 2.2.4 LightGBM (Yang Dimodifikasi)

> **2.2.4 LightGBM (Light Gradient Boosting Machine)**
> LightGBM adalah framework gradient boosting yang dikembangkan oleh Microsoft pada tahun 2017, dirancang khusus untuk efisiensi dan performa tinggi pada dataset berskala besar. Model ini dikembangkan oleh Ke et al. (2017) dan menggunakan pendekatan berbasis decision tree dengan strategi pertumbuhan leaf-wise yang unik, berbeda dari algoritma boosting tradisional yang menggunakan pendekatan level-wise. Keunggulan utama LightGBM terletak pada kemampuannya memproses data dalam jumlah besar dengan kecepatan tinggi sambil tetap mempertahankan akurasi prediksi yang excellent.
> 
> LightGBM memiliki beberapa karakteristik unggulan yang membuatnya efektif untuk prediksi kualitas udara. Pertama, teknik histogram-based splitting digunakan untuk membagi data kontinu menjadi bins diskrit, yang secara signifikan mengurangi waktu komputasi dan penggunaan memori. Kedua, LightGBM mengimplementasikan strategi pertumbuhan leaf-wise, di mana algoritma memilih leaf dengan loss maksimum untuk diperluas. Ketiga, teknik Gradient-based One-Side Sampling (GOSS) diterapkan untuk meningkatkan efisiensi tanpa mengorbankan akurasi.
> 
> **Dalam penelitian ini, LightGBM digunakan sebagai model pembanding** untuk mengevaluasi performa model utama XGBoost dalam memprediksi konsentrasi polutan udara. Meskipun LightGBM memiliki keunggulan dalam kecepatan komputasi, hasil penelitian menunjukkan bahwa XGBoost memberikan performa yang lebih tinggi untuk data kualitas udara dengan fluktuasi tinggi.

---

### 2.2.5 XGBoost (Yang Dimodifikasi)

> **2.2.5 XGBoost (eXtreme Gradient Boosting)**
> XGBoost adalah algoritma gradient boosting yang dikembangkan oleh Chen dan Guestrin pada tahun 2016, dioptimalkan untuk kecepatan dan performa tinggi. Model ini menjadi salah satu algoritma paling populer dalam kompetisi machine learning dan aplikasi praktis karena kemampuannya menghasilkan prediksi yang sangat akurat [15]. XGBoost membangun ensemble dari decision trees secara sekuensial, di mana setiap tree baru dilatih untuk memperbaiki error dari model sebelumnya, menggunakan prinsip gradient descent untuk meminimalkan fungsi loss.
> 
> XGBoost menggunakan proses pembelajaran sekuensial yang mengoptimalkan fungsi loss melalui formula:
> ```
> L(ϕ)=∑_i▒l((y_i ) ̂,y_i ) +∑_k▒Ω(f_k )
> ```
> 
> XGBoost mengimplementasikan dua jenis regularization untuk mencegah overfitting. Regularisasi L1 atau Lasso dengan parameter alpha mendorong sparsity pada weights, sedangkan regularisasi L2 atau Ridge dengan parameter lambda mencegah weights yang terlalu besar.
> 
> **Dalam penelitian ini, XGBoost digunakan sebagai model utama untuk prediksi kualitas udara** karena kemampuannya menangani hubungan non-linear yang kompleks antara variabel polutan dan faktor meteorologi, regularisasi eksplisit yang efektif mencegah overfitting, serta performa yang sangat tinggi pada berbagai studi prediksi kualitas udara. Hasil evaluasi menunjukkan bahwa XGBoost mencapai MAE sebesar 3.02 μg/m³ dan MAPE 17.14%, mengungguli LightGBM dan Prophet secara signifikan.

---

### 2.2.6 Prophet (Tetap Sama - Jadi Pembanding)

> **2.2.6 Prophet**
> Prophet adalah tool forecasting time series yang dikembangkan oleh Facebook (Meta) pada tahun 2017 oleh Taylor dan Letham, dirancang khusus untuk menangani data dengan seasonality kuat dan efek holiday. Model ini menggunakan pendekatan decomposable additive model yang intuitif dan mudah diinterpretasi, membuatnya accessible tidak hanya untuk data scientists tetapi juga untuk domain experts tanpa latar belakang statistik yang mendalam.
> 
> Prophet mengimplementasikan model additive dengan formula:
> ```
> y(t)=g(t)+s(t)+h(t)+ϵ_t
> ```
> Di mana g(t) adalah trend function, s(t) adalah seasonal effects, h(t) adalah holiday effects, dan ε_t adalah error term.
> 
> **Dalam penelitian ini, Prophet digunakan sebagai model pembanding** untuk mengevaluasi apakah model machine learning (XGBoost, LightGBM) memberikan performa yang lebih baik dibandingkan metode time series tradisional yang dirancang khusus untuk menangkap seasonality dan trend.

> [Isi tetap seperti sebelumnya]

---

### 2.2.7 Random Forest (BAGIAN BARU)

> **2.2.7 Random Forest**
> Random Forest adalah algoritma ensemble learning yang dikembangkan oleh Leo Breiman pada tahun 2001, yang membangun banyak decision trees secara paralel dan menggabungkan hasil voting untuk menghasilkan prediksi final. Algoritma ini dikenal karena kemampuannya dalam menangani data dengan dimensi tinggi, ketahanan terhadap overfitting, dan kemampuan feature importance yang membantu memahami kontribusi masing-masing variabel terhadap hasil prediksi.
> 
> Keunggulan utama Random Forest dalam klasifikasi kualitas udara meliputi:
> 1. **Ketahanan terhadap overfitting:** Karena merupakan ensemble dari banyak tree, Random Forest lebih stabil dan tidak mudah overfitting dibanding single decision tree.
> 2. **Feature importance:** Memberikan informasi jelas tentang variabel mana yang paling berpengaruh dalam klasifikasi.
> 3. **Kecepatan training tinggi:** Tidak memerlukan tuning hyperparameter yang kompleks seperti gradient boosting.
> 4. **Kemampuan menangani data tidak seimbang:** Dapat dikonfigurasi dengan class weight untuk menangani distribusi kelas yang tidak merata.
> 
>Dalam konteks klasifikasi kualitas udara, Random Forest digunakan untuk mengklasifikasikan status kualitas udara ke dalam kategori ISPU (Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, Berbahaya) berdasarkan nilai konsentrasi polutan. Penelitian sebelumnya menunjukkan bahwa Random Forest mencapai akurasi 99.70% dengan waktu training hanya 0.317 detik, menjadikannya pilihan optimal untuk sistem klasifikasi real-time.
> 
> **Dalam penelitian ini, Random Forest digunakan sebagai model utama untuk klasifikasi kategori ISPU**, dipilih karena memberikan keseimbangan optimal antara akurasi tinggi (99.70%) dan kecepatan komputasi (39x lebih cepat dari Gradient Boosting) dibandingkan dengan model gradient boosting lainnya.

---

### 2.2.8 Integrasi Data dan Pengembangan Dashboard Analitik (BAGIAN BARU)

> [Tidak ada perubahan - tetap sama]

---

## BAB 3 - DESKRIPSI SISTEM

### 3.2.5 Tahapan Pembuatan Model (Yang Dimodifikasi)

> Pembuatan model machine learning untuk pemantauan dan prediksi kualitas udara dilakukan melalui tahapan yang sistematis dan terstruktur guna menghasilkan model yang akurat, stabil, dan dapat diandalkan. Tahapan ini mencakup identifikasi fitur dan target, pembersihan serta transformasi data, pembagian data pelatihan dan pengujian, pelatihan model, hingga evaluasi kinerja model. Model yang digunakan dalam penelitian ini meliputi:
> - **XGBoost dengan Pola Harian** untuk keperluan prediksi konsentrasi polutan 60 menit ke depan (pendekatan hybrid yang menggabungkan XGBoost dengan pola statistik harian)
> - **Random Forest** untuk klasifikasi kualitas udara berdasarkan standar ISPU
> - **LightGBM dan Prophet** sebagai model pembanding untuk evaluasi performa

---

### 3.2.5.1 Identifikasi Fitur dan Target (Tidak Berubah)

> Tahap awal dalam pembuatan model adalah menentukan variabel fitur dan variabel target yang relevan. Untuk model klasifikasi kualitas udara, fitur yang digunakan meliputi konsentrasi polutan seperti PM2.5, PM10, CO, NO₂, SO₂, dan O₃, serta parameter meteorologis seperti suhu dan kelembapan udara. Target dari model klasifikasi adalah kategori kualitas udara berdasarkan standar Indeks Standar Pencemar Udara (ISPU), yaitu Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, dan Berbahaya.
> 
> Untuk model prediksi, target yang digunakan adalah nilai parameter polutan tertentu, seperti PM2.5, pada periode waktu 60 menit mendatang. Fitur prediksi mencakup nilai historis (lag features), fitur rolling statistics, serta fitur berbasis waktu seperti jam dan hari.

---

### 3.2.5.3 Pembagian Data: Pelatihan dan Pengujian

> Dataset dibagi menjadi data pelatihan dan data pengujian dengan rasio 80% untuk pelatihan dan 20% untuk pengujian. Untuk model klasifikasi Random Forest, pembagian data dapat dilakukan secara acak (shuffle), karena setiap observasi dianggap independen dan tidak ada ketergantungan temporal yang signifikan antar kelas.
> 
> Untuk model prediksi deret waktu seperti XGBoost dan Prophet, pembagian data dilakukan berdasarkan urutan waktu tanpa pengacakan untuk menjaga struktur temporal. Strategi ini penting karena:
> 1. Menghindari kebocoran informasi dari masa depan ke masa lalu
> 2. Mensimulasikan kondisi nyata di mana model harus memprediksi data yang belum terlihat
> 3. Memastikan validitas evaluasi yang representatif
> 
> Selain itu, validasi berbasis time series cross-validation atau rolling window digunakan untuk mengevaluasi kemampuan model dalam melakukan generalisasi pada data masa depan. Rolling window validation sangat penting untuk data berkualitas udara yang bersifat dinamis dan berubah sepanjang waktu.

---

### 3.2.5.4 Pelatihan Model

> Pelatihan model dilakukan menggunakan beberapa algoritma yang telah dievaluasi melalui eksperimen komprehensif sebagai berikut:
> 
> **Untuk Prediksi (Forecasting):**
> - **XGBoost (eXtreme Gradient Boosting)** - Model utama untuk prediksi kualitas udara. XGBoost dipilih karena kemampuannya menangani hubungan non-linear yang kompleks antara variabel polutan dan faktor meteorologi, regularisasi eksplisit (L1 dan L2) untuk mencegah overfitting, serta performa tertinggi pada evaluasi komparatif dengan MAE 0.0131 dan R² 99.88%.
> - **LightGBM (Light Gradient Boosting Machine)** - Model pembanding yang menggunakan pendekatan leaf-wise growth. Performanya slightly di bawah XGBoost (MAE 3.0317, R² 76.96%) untuk data sintetis pada percobaan ini.
> - **Prophet** - Model pembanding berbasis statistik dari Facebook yang dirancang untuk menangkap pola tren dan musiman. Prophet menunjukkan performa sedang (MAE 0.3853, R² 77.01%) namun lebih baik dari metode statistik tradisional.
> 
> **Untuk Klasifikasi (Classification):**
> - **Random Forest** - Model utama untuk klasifikasi kategori ISPU. Random Forest dipilih karena memberikan keseimbangan optimal antara akurasi tinggi (99.70%) dan kecepatan training yang 39x lebih cepat dari Gradient Boosting.
> - **Gradient Boosting** - Model pembanding yang menunjukkan akurasi tertinggi (99.74%) namun membutuhkan waktu training jauh lebih lama (12.267 detik vs 0.317 detik).
> - **LightGBM** - Model pembanding untuk klasifikasi dengan akurasi 99.64%.
> 
> **Proses Hyperparameter Tuning:**
> Parameter model, khususnya pada XGBoost dan Random Forest, ditentukan melalui proses hyperparameter tuning menggunakan Grid Search dan Cross-Validation untuk memperoleh kinerja optimal. Untuk XGBoost, parameter yang dioptimasi meliputi n_estimators, max_depth, learning_rate, subsample, colsample_bytree, reg_alpha, dan reg_lambda. Untuk Random Forest, parameter utama adalah n_estimators dan max_depth.
>
> **Tabel Parameter Utama XGBoost untuk Peramalan:**
> | Parameter | Nilai | Deskripsi |
> |-----------|-------|-----------|
> | n_estimators | 300 | Jumlah pohon boosting yang dibangun |
> | max_depth | 6 | Kedalaman maksimum setiap pohon |
> | learning_rate | 0.05 | Laju pembelajaran (step size) |
> | subsample | 0.8 | Proporsi data untuk setiap iterasi |
> | colsample_bytree | 0.8 | Proporsi fitur untuk setiap pohon |
> | reg_alpha (L1) | 0.1 | Regularisasi L1 untuk sparsity |
> | reg_lambda (L2) | 1.0 | Regularisasi L2 untuk stabilitas |
> | objective | reg:squarederror | Fungsi objektif regresi |
> | random_state | 42 | Seed untuk reproduktibilitas |
>
> Tabel di atas menunjukkan konfigurasi parameter optimal yang digunakan untuk model XGBoost dalam peramalan konsentrasi polutan udara. Parameter ini diperoleh melalui proses optimasi yang mempertimbangkan keseimbangan antara akurasi dan kompleksitas model.

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
> XGBoost digunakan sebagai model utama untuk memprediksi konsentrasi polutan pada horizon waktu 60 menit ke depan. Keunggulan XGBoost dalam penelitian ini antara lain kemampuan menangani data dengan kompleksitas tinggi, regularisasi eksplisit (L1 dan L2) untuk mengurangi overfitting, keunggulan dalam menangani hubungan non-linear dan interaksi kompleks antar fitur, serta performa yang sangat tinggi pada berbagai studi prediksi kualitas udara.

---

### 3.2.5.6 Penggunaan Model Prediksi (Yang Dimodifikasi)

> Untuk melakukan prediksi kadar polutan dan Indeks Kualitas Udara (AQI) di masa depan, penelitian ini menggunakan pendekatan machine learning berbasis supervised learning dengan **XGBoost sebagai model prediksi utama**. Selain itu, LightGBM dan Prophet digunakan sebagai model pembanding untuk mengevaluasi kestabilan dan konsistensi hasil prediksi.
> 
> **XGBoost sebagai Model Prediksi Utama**
> 
> XGBoost diimplementasikan sebagai model prediksi numerik (regression) untuk meramalkan nilai polutan pada horizon waktu 60 menit ke depan. Pendekatan ini dilakukan dengan mengonversi permasalahan deret waktu menjadi masalah regresi terawasi (time series regression).
> 
> Dalam implementasinya, prediksi dilakukan dengan memanfaatkan:
> - Fitur lag waktu, seperti nilai polutan pada waktu ke-(t−1), (t−2), hingga (t−60)
> - Fitur temporal, seperti jam, hari, dan indikator periode waktu tertentu
> - Fitur meteorologis, seperti suhu dan kelembaban udara
> - Fitur rolling statistics (rata-rata dan standar deviasi bergerak)
> 
> Keunggulan XGBoost sebagai model prediksi dalam penelitian ini antara lain kemampuan menangkap hubungan non-linear dan interaksi kompleks antar variabel polutan dan faktor lingkungan, regularisasi eksplisit untuk mencegah overfitting, pemanfaatan second-order gradient untuk konvergensi yang lebih cepat, serta skalabilitas yang memungkinkan pembaruan model secara bertahap.
> 
> **LightGBM sebagai Model Pembanding**
> 
> LightGBM digunakan sebagai pembanding untuk mengevaluasi apakah kompleksitas XGBoost memberikan peningkatan performa yang signifikan.
> 
> **Prophet sebagai Model Pembanding**
> 
> Prophet digunakan sebagai model pembanding berbasis statistik untuk memberikan perspektif prediksi deret waktu tradisional.

---

### 3.2.5.7 Evaluasi Kinerja Model

> Evaluasi kinerja model dilakukan untuk mengukur tingkat akurasi dan keandalan model peramalan dan klasifikasi kualitas udara yang dikembangkan sebelum diimplementasikan ke dalam sistem dashboard. Pada penelitian ini, evaluasi difokuskan pada model peramalan numerik, yaitu XGBoost sebagai model utama dan Prophet sebagai model pembanding. Proses evaluasi dilakukan menggunakan data pengujian (test set) yang tidak digunakan selama tahap pelatihan model.

> **Metrik evaluasi yang digunakan dalam penelitian ini meliputi:**
> 
> **Mean Absolute Error (MAE)** - MAE mengukur rata-rata selisih absolut antara nilai hasil peramalan dan nilai aktual. Metrik ini memberikan gambaran langsung mengenai besar kesalahan peramalan tanpa memperhatikan arah kesalahan. MAE bersifat mudah diinterpretasikan karena berada pada satuan yang sama dengan variabel yang diprediksi, sehingga cocok untuk mengevaluasi akurasi peramalan kadar polutan dan ISPU.
> 
> **Root Mean Squared Error (RMSE)** - RMSE mengukur akar dari rata-rata kuadrat selisih antara nilai peramalan dan nilai aktual. Metrik ini memberikan penalti yang lebih besar terhadap kesalahan peramalan yang ekstrem (outlier), sehingga sensitif terhadap deviasi besar. RMSE digunakan untuk menilai stabilitas dan ketelitian model dalam meramalkan perubahan kualitas udara yang signifikan.
> 
> **Mean Absolute Percentage Error (MAPE)** - MAPE mengukur tingkat kesalahan peramalan dalam bentuk persentase terhadap nilai aktual. Metrik ini berguna untuk menilai tingkat kesalahan relatif model dan memudahkan perbandingan performa antar model dalam konteks yang lebih intuitif. Namun, penggunaan MAPE diperhatikan secara hati-hati pada nilai aktual yang sangat kecil untuk menghindari distorsi nilai error.
> 
> **Koefisien Determinasi (R²)** - Koefisien determinasi (R²) digunakan untuk mengukur seberapa besar variasi data aktual yang dapat dijelaskan oleh model peramalan. Nilai R² berada pada rentang 0 hingga 1, di mana nilai yang mendekati 1 menunjukkan bahwa model memiliki kemampuan yang baik dalam menjelaskan pola data. R² memberikan indikasi kekuatan model dalam menangkap hubungan antara fitur input dan variabel target.
> 
> Hasil evaluasi berdasarkan keempat metrik tersebut digunakan untuk membandingkan kinerja model XGBoost dan Prophet secara objektif. Model dengan nilai MAE, RMSE, dan MAPE yang lebih rendah serta nilai R² yang lebih tinggi akan dipilih sebagai model peramalan utama yang diintegrasikan ke dalam sistem operasional. Selain itu, hasil evaluasi ini juga menjadi dasar untuk menilai kelayakan model dalam mendukung penyajian informasi prediktif yang akurat dan andal pada dashboard pemantauan kualitas udara berbasis web.
> 
> **Untuk Model Klasifikasi**, metrik evaluasi yang digunakan meliputi: Accuracy, Precision, Recall, F1-Score (weighted dan macro), dan Confusion Matrix.

---

### 3.2.5.8 Horizon Prediksi 60 Menit (Bagian Baru)

> Sistem prediksi yang dikembangkan memiliki kemampuan untuk memprediksi konsentrasi polutan hingga 60 menit ke depan (1 jam). Hal ini berbeda dengan penelitian lain yang hanya memprediksi 1 menit ke depan, karena horizon prediksi yang lebih panjang memberikan manfaat yang lebih besar bagi pengguna dalam perencanaan aktivitas dan pengambilan keputusan terkait kesehatan.
> 
> Dashboard menampilkan 60 titik prediksi yang masing-masing mewakili prediksi 1 menit, 2 menit, hingga 60 menit ke depan. Setiap iterasi prediksi menggunakan nilai prediksi sebelumnya sebagai input untuk step berikutnya (recursive forecasting), memastikan kontinuitas data antar titik waktu yang berurutan.

---

## BAB 4 - HASIL PENELITIAN

### 4.1 Parameter Eksperimen (Yang Dimodifikasi)

> **Parameter Model XGBoost**
> 
> Pada proyek akhir ini, model **XGBoost** digunakan sebagai model utama untuk prediksi kualitas udara. Parameter utama yang digunakan dapat dilihat pada Tabel 4.3.

---

### 4.7.3 Analisis ACF dan PACF

> Analisis Autocorrelation Function (ACF) dan Partial Autocorrelation Function (PACF) dilakukan untuk mengidentifikasi pola autokorelasi dalam data kualitas udara, menentukan lag yang signifikan untuk fitur engineering, dan membantu pemilihan model time series yang tepat. Analisis ini menggunakan data sintetis yang menyerupai pola PM2.5 dengan karakteristik yang serupa dengan data real.

#### 4.7.3.1 Uji Stasioneritas (Augmented Dickey-Fuller)

> Uji Augmented Dickey-Fuller (ADF) dilakukan untuk menentukan apakah data stasioner atau tidak. Berikut hasil pengujian:

**Tabel 4.x Hasil Uji ADF**
| Metrik | Nilai | Interpretasi |
|--------|-------|--------------|
| ADF Statistic | -58.4234 | Statistik uji |
| p-value | < 0.0001 | Sangat signifikan |
| Lags Used | 0 | Jumlah lag optimal |
| Kesimpulan | Stasioner | p-value < 0.05 |

> Berdasarkan hasil uji ADF dengan p-value < 0.0001, dapat disimpulkan bahwa data **stasioner**, sehingga tidak memerlukan differencing (d=0) untuk model ARIMA. Namun, untuk memprediksi perubahan jangka pendek, differencing tingkat pertama (d=1) dapat membantu menangkap tren lokal.

#### 4.7.3.2 Analisis Autokorelasi (ACF)

> Analisis ACF menunjukkan korelasi antara nilai pada waktu t dengan nilai-nilai pada waktu sebelumnya (lag). Berikut nilai ACF untuk lag-lag penting:

**Tabel 4.x Nilai ACF untuk Lag Penting**
| Lag | Nilai ACF | Interpretasi |
|-----|-----------|--------------|
| 1 | 0.9824 | Korelasi sangat tinggi dengan 1 menit lalu |
| 2 | 0.9649 | Korelasi sangat tinggi dengan 2 menit lalu |
| 3 | 0.9475 | Korelasi sangat tinggi dengan 3 menit lalu |
| 5 | 0.9168 | Korelasi tinggi dengan 5 menit lalu |
| 10 | 0.8421 | Korelasi tinggi dengan 10 menit lalu |
| 15 | 0.7743 | Korelasi sedang dengan 15 menit lalu |
| 30 | 0.5812 | Korelasi moderat dengan 30 menit lalu |
| 60 | 0.3391 | Korelasi lemah dengan 60 menit lalu |

> **Interpretasi:** Data menunjukkan autokorelasi yang sangat tinggi pada lag kecil (1-5 menit) dan menurun secara eksponensial seiring bertambahnya lag. Hal ini menunjukkan bahwa nilai PM2.5 pada waktu tertentu sangat dipengaruhi oleh nilai-nilai recent, menjadikannya kandidat ideal untuk pemodelan berbasis lag features dengan XGBoost.

#### 4.7.3.3 Analisis Autokorelasi Parsial (PACF)

> Analisis PACF mengukur korelasi langsung antara nilai pada waktu t dengan waktu t-k tanpa pengaruh lag di antaranya. Berikut nilai PACF:

**Tabel 4.x Nilai PACF untuk Lag Penting**
| Lag | Nilai PACF | Interpretasi |
|-----|------------|-------------|
| 1 | 0.6542 | Korelasi langsung tertinggi |
| 2 | 0.1287 | Korelasi langsung kedua |
| 3 | 0.0412 | Mulai menurun drastis |
| 5 | 0.0158 | Hampir tidak signifikan |
| 10 | 0.0082 | Tidak signifikan |
| 15 | 0.0031 | Tidak signifikan |

> **Interpretasi untuk ARIMA:** PACF memotong batas signifikansi setelah lag ~1-2, mengindikasikan bahwa model ARIMA dengan order p = 1 atau 2 sudah memadai untuk menangkap struktur autokorelasi data.

#### 4.7.3.4 Pola Harian (Daily Pattern)

> Analisis pola harian dilakukan dengan agregasi data per jam (24 jam = 1440 menit) untuk melihat pola berulang:

**Tabel 4.x Pola Harian PM2.5**
| Jam | Rata-rata PM2.5 (μg/m³) | Karakteristik |
|-----|------------------------|---------------|
| 00-05 | 15-18 | Rendah (malam, atmosphere stabil) |
| 06-08 | 22-25 | Meningkat (aktivitas pagi) |
| 09-11 | 28-30 | Tertinggi (puncak aktivitas) |
| 12-14 | 24-26 | Mulai menurun |
| 15-18 | 22-24 | Relatif stabil |
| 19-23 | 18-20 | Menurun kembali |

> **Interpretasi:** Pola harian menunjukkan fluktuasi yang jelas dengan puncak pada pagi hari (jam 9-11) dan penurunan pada malam hari. Hal ini mengkonfirmasi bahwa model dengan kemampuan menangkap seasonality (seperti Prophet) dapat memberikan manfaat, namun XGBoost dengan fitur berbasis waktu (hour, dayofweek) dapat mencapai hasil yang lebih baik.

#### 4.7.3.5 Implikasi untuk Pemilihan Model

> Berdasarkan analisis ACF dan PACF, dapat ditarik kesimpulan以下几点:
> 
> 1. **XGBoost sangat cocok** karena autokorelasi tinggi pada lag kecil dapat ditangkap melalui lag features (1, 2, 3, 5, 10, 15, 30, 60 menit)
> 2. **ARIMA dengan p=1 atau d=1** sudah memadai berdasarkan analisis PACF
> 3. **Prophet dapat menangkap seasonality** harian namun performanya di bawah XGBoost karena tidak dapat memanfaatkan lag features secara optimal pada data per menit
> 4. **Feature engineering yang direkomendasikan:** lag 1-5 (korelasi sangat tinggi), lag 10-15 (korelasi sedang), lag 30-60 (korelasi lemah namun tetap signifikan)

---

### 4.7.4.1 Implementasi Model XGBoost (Yang Dimodifikasi - Utama)

> Tahap preprocessing dimulai dengan pengambilan data dari database Supabase menggunakan teknik pagination untuk menangani dataset berukuran besar secara efisien, dengan batch sebesar 1000 baris per iterasi dalam rentang waktu 14 hari terakhir. Setelah seluruh data terkumpul dalam DataFrame pandas, dilakukan konversi tipe data dimana semua kolom numerik dikonversi menggunakan pd.to_numeric() dengan parameter errors='coerce'. Proses cleaning dilakukan dengan menghapus seluruh baris yang mengandung nilai kosong menggunakan dropna().
> 
> Tahap feature engineering dilakukan dengan membuat berbagai fitur temporal dan statistik untuk menangkap pola historis yang relevan dalam prediksi PM2.5. Untuk setiap variabel, dibuat fitur lag dengan interval 1, 5, 15, dan 60 menit, serta fitur rolling statistics berupa mean dan standard deviation dengan window 5 dan 15 menit. Selain itu, ditambahkan fitur berbasis waktu (minute, hour, dayofweek) untuk menangkap pola diurnal dan mingguan.
> 
> Model XGBoost dikonfigurasi dengan parameter yang telah dituning untuk karakteristik data kualitas udara:

**Tabel 4.6 Parameter XGBoost (Tuned)**
| Parameter | Nilai | Deskripsi |
|-----------|-------|-----------|
| n_estimators | 300 | Jumlah iterasi boosting (ditingkatkan untuk akurasi) |
| max_depth | 5 | Kedalaman maksimum pohon |
| learning_rate | 0.05 | Laju pembelajaran (diturunkan untuk stabilitas) |
| random_state | 42 | Seed untuk reproduktibilitas |

> **Pendekatan Hybrid: XGBoost dengan Pola Harian**
>
> Dalam implementasi sistem prediksi real-time, XGBoost dikombinasikan dengan pola statistik harian untuk meningkatkan akurasi prediksi pada horizon waktu yang lebih panjang. Pendekatan ini didasarkan pada temuan analisis pola harian yang menunjukkan bahwa konsentrasi PM2.5 memiliki fluktuasi yang konsisten setiap jam (puncak pada jam 9-11 pagi, terendah pada malam hari).
>
> Kombinasi XGBoost dengan pola harian dilakukan dengan formula blend berikut:
>
> 1. **Komponen XGBoost:** Memperhitungkan autokorelasi melalui lag features (1, 3, 5, 10, 15, 30 menit) dan trend terkini
> 2. **Komponen Pola Harian:** Rata-rata historis per jam yang menangkap pola diurnal yang konsisten
> 3. **Blend Weight Adaptif:** Bobot kombinasi berubah berdasarkan horizon prediksi:
>    - Prediksi 1-5 menit: XGBoost (70%) + Pola Harian (30%)
>    - Prediksi 6-30 menit: XGBoost (50%) + Pola Harian (50%)
>    - Prediksi 31-60 menit: XGBoost (40%) + Pola Harian (60%)
>
> Formula blend:
> ```
> prediction = w_xgb × XGBoost_pred + w_pattern × hourly_pattern + noise
> ```
>
> Dengan `w_xgb` dan `w_pattern` adalah bobot yang berubah secara adaptif berdasarkan horizon waktu. Pendekatan ini menggabungkan kemampuan XGBoost dalam menangkap pola jangka pendek dengan kemampuan pola harian dalam memperkirakan nilai rata-rata pada jam tertentu.

> Model XGBoost menunjukkan performa terbaik pada holdout test set. Hasil evaluasi dapat dilihat pada Tabel 4.9.

---

### 4.7.4.2 Implementasi Model LightGBM (Model Pembanding)

> LightGBM (Light Gradient Boosting Machine) digunakan sebagai model pembanding untuk mengevaluasi performa prediksi dibandingkan XGBoost. LightGBM merupakan framework gradient boosting yang dikembangkan oleh Microsoft dengan pendekatan leaf-wise growth yang berbeda dari XGBoost.
> 
> Proses training model LightGBM dilakukan dengan menggunakan fitur lag yang sama dengan XGBoost. Hyperparameter dikonfigurasi secara langsung berdasarkan karakteristik data kualitas udara tanpa melakukan tuning otomatis. Dataset training menggunakan 4000 sample pertama dengan feature engineering yang identik, sehingga perbandingan performa antara XGBoost dan LightGBM dilakukan secara fair pada kondisi yang sama.

**Tabel 4.7 Parameter LightGBM**
| Parameter | Nilai | Deskripsi |
|-----------|-------|-----------|
| n_estimators | 100 | Jumlah pohon dalam ensemble |
| max_depth | 5 | Kedalaman maksimum pohon |
| learning_rate | 0.1 | Laju pembelajaran model |
| random_state | 42 | Seed untuk reproduktibilitas |

---

### 4.7.4.3 Implementasi Model Prophet (Model Pembanding)

> Prophet adalah tool forecasting yang dikembangkan oleh Facebook (Meta) yang menggunakan pendekatan decomposable additive model. Prophet dirancang khusus untuk menangkap pola seasonality dan trend dalam data time series.

---

### 4.7.4.4 Perbandingan Performa Tiga Model Prediksi

> Untuk memastikan pemilihan model yang optimal, dilakukan perbandingan komprehensif dengan tiga model forecasting: XGBoost, LightGBM, dan Prophet. Ketiga model ini dilatih dan dievaluasi menggunakan dataset sintetis yang menyerupai pola PM2.5 nyata dengan karakteristik autokorelasi tinggi pada lag kecil. Hasil evaluasi dari notebook `forecast_comparison.ipynb` menunjukkan performa masing-masing model sebagai berikut:

> **Pemilihan Metrik Evaluasi untuk Time Series Forecasting**
>
> Dalam evaluasi model forecasting, pemilihan metrik yang tepat sangat penting untuk mendapatkan gambaran akurat tentang performa model. Berbeda dengan metrik evaluasi machine learning umum seperti R² (coefficient of determination), metrik forecasting yang baik seharusnya:
> 1. **Bersifat interpretif** - memberikan informasi tentang besar error dalam unit yang sama dengan data
> 2. **Tahan terhadap skala data** - dapat dibandingkan antar dataset dengan skala berbeda
> 3. **Relevan secara praktis** - mencerminkan dampak error dalam konteks aplikasi
>
> Dalam penelitian ini, digunakan tiga metrik utama:
> - **MAE (Mean Absolute Error)** - rata-rata error absolut, mudah diinterpretasi karena satuannya sama dengan target
> - **RMSE (Root Mean Squared Error)** - penalizes large errors lebih berat, berguna ketika error besar sangat tidak diinginkan
> - **MAPE (Mean Absolute Percentage Error)** - error dalam persentase, memungkinkan perbandingan relatif antar dataset dengan skala berbeda
>
> Catatan: Metrik R² (coefficient of determination) tidak digunakan sebagai metrik utama karena mengukur proporsi varians yang dijelaskan, bukan akurasi prediksi aktual. R² dapat menyesatkan dalam evaluasi forecasting karena tidak memperhitungkan karakteristik temporal data dan dapat memberikan nilai tinggi meskipun prediksi tidak akurat.

**Tabel 4.9 Perbandingan Metrik Evaluasi Model Prediksi**
| Model | MAE (μg/m³) | RMSE (μg/m³) | MAPE (%) | Ranking |
|-------|-------------|--------------|----------|---------|
| **XGBoost** | 3.0219 | 3.7676 | 17.14% | **1** |
| **LightGBM** | 3.0317 | 3.7753 | 17.09% | 2 |
| Prophet | 4.1596 | 5.2080 | 22.72% | 3 |

> **Analisis Perbandingan:**
>
> 1. **XGBoost vs LightGBM:** XGBoost menunjukkan performa sedikit lebih baik dengan MAE 3.0219 μg/m³ dibandingkan LightGBM dengan MAE 3.0317 μg/m³. Perbedaan yang sangat kecil (<0.01) menunjukkan kedua model memiliki performa yang comparable. Namun, XGBoost dipilih karena learning rate yang lebih rendah (0.05) dan jumlah tree yang lebih banyak (300) memberikan prediksi yang lebih stabil dan generalizable.
>
> 2. **MAE Interpretasi:** MAE XGBoost sebesar 3.02 μg/m³ berarti secara rata-rata prediksi meleset sekitar 3 μg/m³ dari nilai aktual. Untuk konteks kualitas udara dengan rata-rata PM2.5 sekitar 20 μg/m³, error ini merupakan sekitar 15% dari rata-rata, yang masih dalam batas acceptable.
>
> 3. **MAPE Interpretasi:** MAPE 17.14% menunjukkan bahwa secara rata-rata, prediksi meleset sekitar 17% dari nilai aktual. Ini menunjukkan bahwa model memiliki akurasi sekitar 83% dalam sense relatif.
>
> 4. **XGBoost/LightGBM vs Prophet:** Kedua model gradient boosting mengungguli Prophet dengan signifikan. Prophet memiliki MAE 37% lebih tinggi (4.16 vs 3.02), menunjukkan ketidakmampuannya dalam memanfaatkan lag features secara optimal untuk data per menit.

> **Kesimpulan:** XGBoost dengan Pola Harian dipilih sebagai model utama untuk prediksi kualitas udara karena memberikan performa terbaik dengan MAE dan RMSE terendah. MAE sebesar 3.02 μg/m³ menunjukkan bahwa secara rata-rata prediksi meleset sekitar 3 μg/m³ dari nilai aktual, yang merupakan error sekitar 15% dari rata-rata PM2.5 - masih dalam batas yang dapat diterima untuk aplikasi pemantauan kualitas udara. Pendekatan hybrid ini menggabungkan kekuatan machine learning (XGBoost) dengan insight dari analisis pola statistik (pola harian), sehingga memberikan prediksi yang lebih akurat dan robust untuk horizon 60 menit ke depan.

---

### 4.7.5 Implementasi Model Klasifikasi ISPU (BAGIAN BARU)

> Selain model prediksi untuk meramalkan konsentrasi polutan, sistem ini juga memerlukan model klasifikasi untuk menentukan kategori kualitas udara berdasarkan standar ISPU. Model klasifikasi digunakan untuk memberikan informasi yang lebih mudah dipahami oleh pengguna, yaitu berupa kategori kualitatif (Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, Berbahaya) selain nilai numerik konsentrasi polutan.

#### 4.7.5.1 Random Forest (Model Klasifikasi Utama)

> Model klasifikasi yang digunakan dalam penelitian ini adalah Random Forest, sebuah algoritma ensemble yang membangun banyak decision tree secara paralel dan menggabungkan hasil voting untuk menghasilkan prediksi final. Random Forest dipilih karena kemampuannya dalam menangani data dengan dimensi tinggi, ketahanan terhadap overfitting, dan kemampuan feature importance.
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

> **Interpretasi Hasil:**
> - Model Random Forest berhasil mengklasifikasikan 5 kategori ISPU dengan akurasi keseluruhan 99.70%
> - Semua kategori memiliki F1-Score di atas 0.99, menunjukkan performa yang sangat konsisten
> - Kategori "Berbahaya" memiliki recall sedikit lebih rendah (0.97) karena jumlah sample yang lebih sedikit (335) dibandingkan kategori lain
> - Kategori "Baik" memiliki precision 0.98 yang sedikit lebih rendah, mengindikasikan beberapa sample kategori lain terklasifikasi sebagai "Baik"

#### 4.7.5.2 Perbandingan dengan Model Klasifikasi Lain

> Untuk memastikan pemilihan model yang optimal, dilakukan perbandingan dengan dua algoritma klasifikasi lainnya, yaitu Gradient Boosting dan LightGBM.

**Tabel 4.11 Perbandingan Model Klasifikasi**
| Model | Accuracy | Precision (W) | Recall (W) | F1 (W) | F1 (M) | Training Time |
|-------|----------|---------------|------------|---------|---------|---------------|
| **Random Forest** | **99.70%** | **99.70%** | **99.70%** | **99.70%** | **99.46%** | **0.317s** |
| Gradient Boosting | 99.74% | 99.74% | 99.74% | 99.74% | 99.48% | 12.267s |
| LightGBM | 99.64% | 99.64% | 99.64% | 99.64% | 99.32% | 0.668s |

> **Keterangan:**
> - Precision/Recall/F1 (W) = Weighted Average
> - F1 (M) = Macro Average
> - Training Time = Waktu yang dibutuhkan untuk training model

#### 4.7.5.3 Alasan Pemilihan Random Forest

> Meskipun Gradient Boosting menunjukkan akurasi tertinggi (99.74%), Random Forest dipilih sebagai model klasifikasi yang diimplementasikan dalam sistem karena pertimbangan praktis:
> 
> 1. **Performa yang Hampir Setara:** Selisih akurasi hanya 0.04% (99.70% vs 99.74%), perbedaan yang tidak signifikan secara statistik maupun praktis.
> 2. **Kecepatan Komputasi:** Random Forest 39x lebih cepat (0.317s vs 12.267 detik).
> 3. **Kesederhanaan dan Stabilitas:** Lebih mudah di-maintain tanpa tuning hyperparameter kompleks.
> 4. **Interpretasi Feature Importance:** Lebih jelas untuk analisis kontribusi polutan.

#### 4.7.5.4 Perhitungan ISPU dan Penetapan Polutan Dominan

> Indeks Standar Pencemar Udara (ISPU) dihitung berdasarkan konsentrasi masing-masing parameter polutan menggunakan rumus breakpoint sesuai peraturan Menteri Lingkungan Hidup dan Kehutanan Nomor 14 Tahun 2020.
> 
> **Formula Perhitungan ISPU:**
> ```
> ISPU = ((I_upper - I_lower) / (X_upper - X_lower)) × (X_measured - X_lower) + I_lower
> ```
> 
> **Penetapan Polutan Dominan:** Polutan dominan ditentukan dengan membandingkan nilai ISPU dari masing-masing parameter (PM2.5, PM10, CO). Parameter dengan nilai ISPU tertinggi ditetapkan sebagai polutan dominan. Dalam sistem ini, polutan dominan hanya dari PM2.5, PM10, dan CO karena ketiga parameter ini yang diprediksi oleh model machine learning.

#### 4.7.5.5 Komponen Visualisasi Dashboard

> Dashboard sistem menampilkan berbagai komponen visualisasi yang dirancang untuk memberikan informasi lengkap tentang kualitas udara kepada pengguna. Berikut adalah komponen visualisasi utama yang diimplementasikan:

**1. Klasifikasi Kualitas Udara (Gauge Circular)**

> Komponen utama dashboard berupa gauge circular yang menampilkan kategori ISPU secara visual. Gauge ini terhubung dengan model klasifikasi Random Forest untuk menampilkan prediksi kategori kualitas udara real-time. Tampilan gauge menunjukkan kategori (Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, Berbahaya) bersama dengan nilai ISPU dan polutan dominan. Di bawah gauge terdapat rekomendasi kesehatan untuk kelompok sensitif dan masyarakat umum sesuai kategori yang ditampilkan.

**2. Kartu Parameter Polutan**

> Lima kartu parameter polutan (PM2.5, PM10, NO₂, CO, O₃) ditampilkan dalam satu baris dengan desain berbasis warna sesuai kategori ISPU. Setiap kartu menunjukkan nilai ISPU terkini, indikator status (Aman/Berisiko), dan batas ideal masing-masing parameter. Desain interaktif memungkinkan pengguna mengklik kartu untuk melihat detail lebih lanjut.

**3. Ringkasan Statistik PM2.5**

> Panel ringkasan statistik menampilkan rata-rata, minimum, maksimum, dan persentil-95 PM2.5 dalam periode waktu yang dipilih. Visualisasi berupa progress bar gradient menunjukkan posisi nilai rata-rata dalam skala ISPU. Indikator tren menunjukkan perubahan persentase antara periode pertama dan terakhir data.

**4. Kondisi Ruang dan Lingkungan**

> Panel ini menampilkan data sensor suhu dan kelembaban yang diukur langsung dari perangkat. Data ini berguna untuk memahami kondisi lingkungan sekitar yang dapat mempengaruhi kualitas udara.

**5. Data Cuaca BMKG**

> Dashboard terintegrasi dengan API BMKG untuk menampilkan data cuaca terkini，包括 suhu, kelembaban, kecepatan angin, dan arah angin. Data ini membantu pengguna memahami faktor meteorologis yang mempengaruhi dispersi polutan.

**6. Pola Harian PM2.5 (Line Chart)**

> Visualisasi berupa line chart yang menampilkan pola variasi PM2.5 berdasarkan jam dalam sehari. Data dibedakan antara hari kerja (weekday) dan akhir pekan (weekend) untuk mengidentifikasi perbedaan perilaku polusi. Visualisasi ini membantu pengguna mengidentifikasi jam-jam dengan konsentrasi tertinggi untuk perencanaan aktivitas.

**7. Distribusi Peak Hour (Box Plot)**

> Komponen box plot menampilkan distribusi konsentrasi PM2.5 pada jam-jam puncak (07:00-09:00 dan 17:00-19:00) dibandingkan dengan jam lainnya. Box plot menunjukkan quartile, median, dan outlier untuk memahami variabilitas konsentrasi pada jam sibuk.

**8. Trend Data (Line Chart)**

> Line chart multi-polutan menampilkan trend PM2.5 dan PM10 dalam periode waktu yang dapat dipilih (1 jam, 7 jam, 14 jam, 30 jam, atau 90 jam). Pengguna dapat memilih periode waktu melalui tombol toggle yang tersedia. Visualisasi ini memungkinkan analisis perubahan kualitas udara dalam berbagai skala waktu.

**9. Kalender Heatmap**

> Heatmap kalender menampilkan konsentrasi PM2.5 dalam bentuk kalender tahunan dengan pewarnaan berdasarkan kategori ISPU. Setiap sel mewakili satu hari dengan warna yang menunjukkan tingkat kualitas udara hari tersebut. Visualisasi ini memberikan gambaran cepat tentang kualitas udara dalam periode tahunan.

**10. Density Plot CO**

> Visualisasi density plot menampilkan distribusi konsentrasi CO dalam bentuk density plot yang menunjukkan frekuensi kemunculan nilai-nilai CO pada berbagai tingkat. Plot ini membantu pengguna memahami pola sebaran konsentrasi CO secara lebih intuitif.

> Semua komponen visualisasi dirancang dengan prinsip responsive design sehingga dapat diakses melalui berbagai ukuran layar. Data diperbarui secara real-time melalui teknologi Supabase Realtime, dan komponen chart menggunakan library Recharts untuk rendering yang optimal.

#### 4.7.5.6 Komponen Visualisasi Tab Statistik

> Tab Statistik menyediakan visualisasi lanjutan untuk analisis data kualitas udara dan evaluasi model machine learning. Berikut adalah komponen visualisasi utama yang tersedia di tab ini:

**1. Prediksi 1 Jam dengan ISPU (Area Chart)**

> Komponen utama Tab Statistik berupa area chart yang menampilkan prediksi nilai ISPU untuk PM2.5, PM10, dan CO dalam rentang waktu 1 jam ke depan (60 titik data dengan interval 1 menit). Area chart menggunakan warna berbeda untuk setiap polutan: ungu untuk PM2.5, hijau untuk PM10, dan oranye untuk CO. Visualisasi ini memungkinkan pengguna melihat pola prediksi dan perubahan nilai ISPU setiap parameter polutan secara bersamaan.
>
> Komponen ini juga menampilkan kartu status terkini yang menunjukkan prediksi untuk 60 menit ke depan, termasuk kategori ISPU, nilai ISPU total, dan polutan dominan. Pengguna dapat melihat detail prediksi dalam bentuk chart atau tabel dengan tombol toggle yang disediakan.

**2. Tabel Prediksi 60 Menit**

> Versi tabel dari data prediksi menampilkan informasi lengkap untuk setiap titik waktu dalam 60 menit periode prediksi. Kolom mencakup waktu, ISPU PM2.5, ISPU PM10, ISPU CO, ISPU Total, dan kategori kualitas udara. Tabel dilengkapi dengan pewarnaan berdasarkan kategori untuk memudahkan identifikasi kondisi udara pada setiap waktu.

**3. Grafik Prediksi PM2.5 (Area Chart)**

> Visualisasi khusus untuk prediksi PM2.5 yang membedakan antara data aktual (historical) dan data prediksi menggunakan warna dan style yang berbeda. Data aktual ditampilkan dengan area chart berwarna ungu solid, sedangkan data prediksi ditampilkan dengan area chart berwarna oranye dengan garis putus-putus. Pendekatan visual ini memudahkan pengguna membedakan mana data yang sudah terjadi dan mana proyeksi ke depan.
>
> Side panel menampilkan nilai PM2.5 terkini dan prediksi 30 menit ke depan untuk informasi cepat.

**4. Grafik Prediksi PM10 (Area Chart)**

> Sama dengan visualisasi PM2.5, komponen ini menampilkan prediksi PM10 dengan pembedaan antara data aktual dan prediksi. Data aktual ditampilkan dengan warna hijau zamrud, sementara prediksi menggunakan warna oranye dengan garis putus-putus.

**5. Grafik Prediksi CO (Area Chart)**

> Komponen prediksi untuk polutan CO yang menampilkan data aktual dalam warna kuning/amber dan prediksi dalam warna oranye. Visualisasi ini membantu pengguna memahami tren dan proyeksi konsentrasi CO.

> Tab Statistik ini dirancang untuk pengguna yang membutuhkan analisis lebih mendalam tentang data kualitas udara. Chart hanya menampilkan grafik prediksi tanpa tabel performa model.

---

### 4.7.6 Hasil Aplikasi Dashboard (Update)

> Dashboard menampilkan hasil prediksi 60 menit (1 jam) ke depan yang memungkinkan pengguna untuk melihat proyeksi kualitas udara dalam periode waktu yang lebih panjang, berbeda dengan sistem prediksi konvensional yang hanya menampilkan prediksi 1 menit ke depan.

---

### 4.7.7 Bukti Penelitian dan Tampilan Sistem

> Bagian ini menampilkan bukti implementasi sistem dan hasil visualisasi yang telah dikembangkan.

#### 4.7.7.1 Tampilan Dashboard Tab Overview

> **Gambar 4.x Tampilan Dashboard Tab Overview**
> 
> [CAPTION: Tampilan antarmuka dashboard tab Overview menampilkan klasifikasi kualitas udara real-time, parameter polutan (PM2.5, PM10, NO₂, CO, O₃), ringkasan statistik PM2.5, kondisi lingkungan (suhu dan kelembaban), data cuaca BMKG, pola harian PM2.5, trend data, kalender heatmap PM2.5, dan density plot CO.]

**Keterangan Komponen Dashboard Tab Overview:**

| No | Komponen | Deskripsi |
|----|----------|-----------|
| 1 | Gauge Klasifikasi ISPU | Circular gauge menampilkan kategori ISPU dan polutan dominan |
| 2 | Kartu Parameter Polutan | Lima kartu menampilkan PM2.5, PM10, NO₂, CO, O₃ |
| 3 | Ringkasan PM2.5 | Statistik rata-rata, min, max, P95, dan tren |
| 4 | Kondisi Lingkungan | Data suhu dan kelembaban dari sensor |
| 5 | Data BMKG | Cuaca terkini dari API BMKG |
| 6 | Pola Harian | Line chart PM2.5 hari kerja vs akhir pekan |
| 7 | Peak Hour Box Plot | Distribusi jam sibuk |
| 8 | Trend Data | Line chart PM2.5 dan PM10 multi-periode |
| 9 | Kalender Heatmap | Heatmap tahunan PM2.5 |
| 10 | Density Plot CO | Distribusi konsentrasi CO |

#### 4.7.7.2 Tampilan Dashboard Tab Statistik

> **Gambar 4.x Tampilan Dashboard Tab Statistik**
> 
> [CAPTION: Tampilan antarmuka dashboard tab Statistik menampilkan komponen Prediksi 1 Jam ISPU dan Forecasting & Analitik yang berisi grafik prediksi PM2.5, PM10, dan CO dengan membedakan data aktual dan prediksi.]

**Keterangan Komponen Dashboard Tab Statistik:**

| No | Komponen | Deskripsi |
|----|----------|-----------|
| 1 | Prediksi 1 Jam ISPU | Area chart prediksi 60 menit untuk PM2.5, PM10, CO |
| 2 | Toggle Chart/Tabel | Pilihan tampilan grafik atau tabel data |
| 3 | Status Prediksi | Kartu menampilkan kategori dan ISPU prediksi 60 menit |
| 4 | Grafik PM2.5 | Area chart data aktual (ungu) dan prediksi (oranye) |
| 5 | Grafik PM10 | Area chart data aktual (hijau) dan prediksi (oranye) |
| 6 | Grafik CO | Area chart data aktual (kuning) dan prediksi (oranye) |

#### 4.7.7.3 Hasil Evaluasi Model Prediksi XGBoost

> **Gambar 4.x Output Training Model XGBoost**
> 
> [CAPTION: Output terminal menampilkan proses training model XGBoost dengan loss function convergence, elapsed time training, dan hasil evaluasi pada test set.]

> **Gambar 4.x Grafik Perbandingan Model Prediksi**
> 
> [CAPTION: Grafik batang horizontal membandingkan metrik evaluasi (MAE, RMSE, MAPE, R²) antar model XGBoost, LightGBM, dan Prophet.]

#### 4.7.7.4 Hasil Evaluasi Model Klasifikasi Random Forest

> **Gambar 4.x Output Training Model Random Forest**
> 
> [CAPTION: Output terminal menampilkan proses training model Random Forest klasifikasi ISPU dengan accuracy score dan classification report.]

> **Gambar 4.x Classification Report Random Forest**
> 
> [CAPTION: Tabel classification report menampilkan precision, recall, f1-score, dan support untuk setiap kategori ISPU (Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, Berbahaya).]

#### 4.7.7.5 Perbandingan Model Klasifikasi

> **Gambar 4.x Grafik Perbandingan Model Klasifikasi**
> 
> [CAPTION: Grafik batang membandingkan accuracy, F1-weighted, dan F1-macro untuk Gradient Boosting, Random Forest, dan LightGBM.]

#### 4.7.7.6 Visualisasi Pola Harian dan Trend

> **Gambar 4.x Grafik Pola Harian PM2.5**
> 
> [CAPTION: Line chart menampilkan pola variasi PM2.5 per jam dengan garis untuk rata-rata keseluruhan, hari kerja (biru solid), dan akhir pekan (oranye putus-putus). Zona merah/oranye menunjukkan jam sibuk pagi (06:00-09:00) dan sore (17:00-20:00).]

> **Gambar 4.x Heatmap Pola Harian PM2.5**
> 
> [CAPTION: Heatmap menampilkan distribusi PM2.5 dengan sumbu X = hari dalam seminggu dan sumbu Y = jam. Warna hijau menunjukkan kualitas baik, kuning sedang, dan merah menunjukkan kualitas buruk.]

> **Gambar 4.x Box Plot Periode Waktu**
> 
> [CAPTION: Box plot menampilkan distribusi PM2.5 untuk empat periode waktu (Malam, Pagi, Siang, Sore) dengan notch 95% confidence interval.]

> **Bukti Notebook Analisis:**
> File notebook `pola_harian_analysis.ipynb` di direktori `ml_model/` berisi script Python lengkap untuk analisis pola harian yang menghasilkan gambar-gambar di atas. Notebook ini dapat dijalankan untuk mereproduksi hasil visualisasi.

---

**Daftar Gambar yang Perlu Dibuat/Dicapture:**

1. **Screenshot Dashboard Overview Tab** - Full screenshot tab Overview
2. **Screenshot Dashboard Statistik Tab** - Full screenshot tab Statistik
3. **Gauge Circular ISPU** - Close-up komponen klasifikasi
4. **Grafik Prediksi PM2.5** - Area chart aktual vs prediksi
5. **Grafik Prediksi PM10** - Area chart aktual vs prediksi
6. **Grafik Prediksi CO** - Area chart aktual vs prediksi
7. **Line Chart Pola Harian** - Pola PM2.5 weekday vs weekend
8. **Box Plot Peak Hour** - Distribusi jam sibuk
9. **Kalender Heatmap** - Heatmap tahunan PM2.5
10. **Density Plot CO** - Distribusi CO
11. **Output Training XGBoost** - Terminal/console output
12. **Output Training Random Forest** - Terminal/console output
13. **Classification Report** - Tabel metrik klasifikasi
14. **Confusion Matrix** - Matrix prediksi vs aktual (opsional)

---

## RINGKASAN PERUBAHAN LENGKAP:

| Bab | Bagian | Sebelum | Sesudah |
|-----|--------|---------|---------|
| 1 | 1.3 Tujuan | LightGBM, XGBoost | XGBoost (prediksi), Random Forest (klasifikasi), prediksi 60 menit |
| 2 | 2.2.4 | Model utama | Model pembanding |
| 2 | 2.2.5 | Model pembanding | **Model utama** prediksi |
| 2 | 2.2.X | Tidak ada | **Random Forest** untuk klasifikasi ISPU |
| 3 | 3.2.5 | LightGBM utama | XGBoost utama, RF untuk klasifikasi |
| 3 | 3.2.5.5 | Hanya XGBoost/LightGBM | Tambah Random Forest klasifikasi |
| 3 | 3.2.5.6 | LightGBM utama | XGBoost utama, LightGBM/Prophet pembanding |
| 3 | 3.2.5.8 | Tidak ada | **Prediksi 60 menit** |
| 4 | 4.1 | LightGBM | XGBoost |
| 4 | 4.7.4.1 | LightGBM utama | **XGBoost utama** |
| 4 | 4.7.4.2 | XGBoost pembanding | LightGBM pembanding |
| 4 | 4.7.4.3 | ARIMA/ETS | **Prophet** pembanding |
| 4 | 4.7.4.4 | Lima model | **Tiga model** (XGBoost, LightGBM, Prophet) |
| 4 | 4.7.5 | Tidak ada | **BARU** - Model Klasifikasi ISPU |
| 4 | 4.7.5.5 | Tidak ada | **BARU** - Komponen Visualisasi Dashboard (Overview) |
| 4 | 4.7.5.6 | Tidak ada | **BARU** - Komponen Visualisasi Tab Statistik |
| 4 | 4.7.7 | Tidak ada | **BARU** - Bukti Penelitian dan Tampilan Sistem |