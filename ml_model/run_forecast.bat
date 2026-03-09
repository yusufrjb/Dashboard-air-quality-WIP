@echo off
REM ============================================================
REM  run_forecast.bat
REM  Jalankan pipeline prediksi PM2.5 dengan model XGBoost.
REM  Gunakan Windows Task Scheduler untuk menjalankan file ini
REM  secara berkala (misalnya setiap hari atau setiap jam).
REM ============================================================

SET PROJECT_DIR=D:\DashboardAQ_v3

REM Aktifkan virtual environment Python jika ada
REM IF EXIST "%PROJECT_DIR%\venv\Scripts\activate.bat" (
REM     CALL "%PROJECT_DIR%\venv\Scripts\activate.bat"
REM )

REM Pindah ke direktori ml_model
cd /d "%PROJECT_DIR%\ml_model"

REM Jalankan script prediksi
echo Running XGBoost forecast pipeline at %DATE% %TIME%
python predict_and_save.py

IF ERRORLEVEL 1 (
    echo ERROR: Script gagal dijalankan. Cek forecast_log.txt untuk detail.
    exit /b 1
) ELSE (
    echo Prediksi berhasil disimpan ke Supabase.
)
