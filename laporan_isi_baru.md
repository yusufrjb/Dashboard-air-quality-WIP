# Bagian Baru untuk Laporan Proyek Akhir

## 4.7.5 Implementasi Model Klasifikasi ISPU

Selain model prediksi untuk meramalkan konsentrasi polutan, sistem ini juga memerlukan model klasifikasi untuk menentukan kategori kualitas udara berdasarkan standar Indeks Standar Pencemar Udara (ISPU). Model klasifikasi digunakan untuk memberikan informasi yang lebih mudah dipahami oleh pengguna, namely berupa kategori kualitatif (Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, Berbahaya) selain nilai numerik konsentrasi polutan.

### 4.7.5.1 Random Forest (Model Utama)

Model klasifikasi yang digunakan dalam penelitian ini adalah Random Forest, sebuah algoritma ensemble yang membangun banyak decision tree secara paralel dan menggabungkan hasil voting untuk menghasilkan prediksi final. Random Forest dipilih karena kemampuannya dalam menangani data dengan dimensi tinggi, ketahanan terhadap overfitting, dan kemampuan feature importance yang membantu memahami kontribusi masing-masing parameter polutan terhadap status kualitas udara.

**Spesifikasi Model:**
- **Algoritma:** Random Forest Classifier
- **Jumlah pohon (n_estimators):** 100
- **Kedalaman maksimum (max_depth):** Tidak dibatasi
- **Fitur input:** PM2.5, PM10, CO, NO2, O3, Suhu, Kelembaban
- **Target:** Kategori ISPU (Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, Berbahaya)
- **Strategi kelas:** Balanced (untuk menangani ketidakseimbangan data)

**Hasil Evaluasi:**
- Accuracy: 99.70%
- Precision (weighted): 99.70%
- Recall (weighted): 99.70%
- F1-Score (weighted): 99.70%
- F1-Score (macro): 99.46%

### 4.7.5.2 Perbandingan dengan Model Klasifikasi Lain

Untuk memastikan pemilihan model yang optimal, dilakukan perbandingan dengan dua algoritma klasifikasi lainnya, yaitu Gradient Boosting dan LightGBM. Ketiga model dilatih dan dievaluasi pada dataset yang sama dengan menggunakan strategi stratified split untuk memastikan distribusi kelas yang representatif pada masing-masing subset.

**Hasil Perbandingan Model Klasifikasi:**

| Model           | Accuracy | F1 (Weighted) | F1 (Macro) | Training Time |
|-----------------|----------|---------------|------------|---------------|
| Gradient Boosting | 99.74%  | 99.74%        | 99.48%     | 12.267s       |
| **Random Forest** | **99.70%** | **99.70%** | **99.46%** | **0.317s**    |
| LightGBM        | 99.64%   | 99.64%        | 99.32%     | 0.668s        |

Berdasarkan hasil evaluasi pada Tabel di atas, Gradient Boosting menunjukkan akurasi tertinggi dengan nilai 99.74%, diikuti oleh Random Forest dengan 99.70% dan LightGBM dengan 99.64%. Meskipun Gradient Boosting memiliki akurasi slightly lebih tinggi, Random Forest dipilih sebagai model operasional dengan mempertimbangkan beberapa faktor penting.

### 4.7.5.3 Alasan Pemilihan Random Forest

Meskipun Gradient Boosting menunjukkan akurasi tertinggi (99.74%), Random Forest dipilih sebagai model klasifikasi yang diimplementasikan dalam sistem karena pertimbangan praktis sebagai berikut:

1. **Performa yang Hampir Setara:** Selisih akurasi antara Random Forest dan Gradient Boosting hanya sebesar 0.04% (99.70% vs 99.74%), perbedaan yang tidak signifikan secara statistik maupun praktis untuk aplikasi pemantauan kualitas udara.

2. **Kecepatan Komputasi yang Signifikan:** Random Forest memiliki waktu training 39 kali lebih cepat dibandingkan Gradient Boosting (0.317 detik vs 12.267 detik). Kecepatan ini sangat penting untuk sistem yang memerlukan pembaruan model secara berkala (periodic retraining).

3. **Kesederhanaan dan Stabilitas:** Random Forest memiliki arsitektur yang lebih sederhana dan lebih tahan terhadap overfitting tanpa memerlukan tuning hyperparameter yang kompleks seperti Gradient Boosting.

4. **Interpretasi Feature Importance:** Random Forest menyediakan informasi feature importance yang lebih jelas dan mudah diinterpretasikan untuk memahami kontribusi masing-masing polutan terhadap kategori kualitas udara.

Keputusan ini didasarkan pada prinsip bahwa dalam konteks aplikasi real-time dengan constraint computational resources yang terbatas, Random Forest memberikan keseimbangan optimal antara akurasi, kecepatan, dan maintainability.

### 4.7.5.4 Perhitungan ISPU dan Penetapan Polutan Dominan

Indeks Standar Pencemar Udara (ISPU) dihitung berdasarkan konsentrasi masing-masing parameter polutan menggunakan rumus breakpoint sesuai peraturan Menteri Lingkungan Hidup dan Kehutanan Nomor 14 Tahun 2020. Untuk setiap parameter (PM2.5, PM10, CO), nilai konsentrasi dikonversi menjadi nilai ISPU menggunakan persamaan linear pada range breakpoint yang sesuai.

**Formula Perhitungan ISPU:**

```
ISPU = ((I_upper - I_lower) / (X_upper - X_lower)) * (X_measured - X_lower) + I_lower
```

Dimana:
- I_upper = ISPU batas atas
- I_lower = ISPU batas bawah
- X_upper = Konsentrasi ambien batas atas
- X_lower = Konsentrasi ambien batas bawah
- X_measured = Konsentrasi ambien hasil pengukuran

**Penetapan Polutan Dominan:**
Polutan dominan ditentukan dengan membandingkan nilai ISPU dari masing-masing parameter. Parameter dengan nilai ISPU tertinggi ditetapkan sebagai polutan dominan yang mencerminkan kondisi kualitas udara secara keseluruhan. Dalam sistem ini, polutan dominan hanya dipilih dari PM2.5, PM10, dan CO karena ketiga parameter ini yang diprediksi oleh model machine learning, whereas NO2 dan O3 tidak termasuk dalam model prediksi.

---

## Perubahan pada Bagian 4.7.4 (Model Prediksi)

### Penjelasan Tambahan untuk XGBoost

XGBoost (Extreme Gradient Boosting) merupakan algoritma gradient boosting yang diimplementasikan sebagai model utama prediksi konsentrasi PM2.5 dalam sistem ini. XGBoost membangun ensemble dari decision trees secara sekuensial, dimana setiap tree baru dilatih untuk memperbaiki error dari model sebelumnya menggunakan prinsip gradient descent.

Keunggulan XGBoost yang menjadikannya pilihan utama:
1. Regularisasi eksplisit (L1 dan L2) untuk mencegah overfitting
2. Pemanfaatan second-order gradient untuk konvergensi yang lebih cepat
3. Kemampuan menangani missing values secara native
4. Parallel processing untuk efisiensi komputasi

**Parameter XGBoost yang Digunakan:**
- n_estimators: 300
- max_depth: 6
- learning_rate: 0.05
- subsample: 0.8
- colsample_bytree: 0.8
- reg_alpha (L1): 0.1
- reg_lambda (L2): 1.0
- eval_metric: rmse

**Hasil Evaluasi XGBoost pada Test Set:**
- MAE: 0.0131 μg/m³
- RMSE: 0.0480 μg/m³
- MAPE: 0.47%
- R²: 0.9988 (99.88%)

Nilai R² sebesar 99.88% menunjukkan bahwa model mampu menjelaskan hampir seluruh variabilitas data PM2.5, mengindikasikan kemampuan prediksi yang sangat tinggi untuk mendukung sistem peringatan dini kualitas udara.