import time
import subprocess
import logging
import sys
from datetime import datetime
from pathlib import Path

# Konfigurasi Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(Path(__file__).parent / "watcher_log.txt", encoding="utf-8")
    ]
)
log = logging.getLogger("Watcher")

def run_forecast():
    log.info("Memulai pemicu peramalan & regresi...")
    try:
        # 1. Jalankan Peramalan (Time-Series, 30 min)
        log.info("  -> Menjalankan predict_and_save.py")
        res1 = subprocess.run([sys.executable, "predict_and_save.py"], capture_output=True, text=True, cwd=Path(__file__).parent)
        if res1.stdout:
            for line in res1.stdout.splitlines():
                if "Berhasil" in line or "Saved" in line or "Selesai" in line: log.info(f"     [Predict] {line}")

        # 2. Jalankan Peramalan Multi-Parameter (60 min, untuk ISPU 1 jam)
        log.info("  -> Menjalankan predict_hourly_multi.py")
        res3 = subprocess.run([sys.executable, "predict_hourly_multi.py"], capture_output=True, text=True, cwd=Path(__file__).parent)
        if res3.stdout:
            for line in res3.stdout.splitlines():
                if "Selesai" in line or "simpan" in line: log.info(f"     [Hourly] {line}")

        # 3. Jalankan Regresi (Antar-Parameter)
        log.info("  -> Menjalankan regression_antar_parameter.py")
        res2 = subprocess.run([sys.executable, "regression_antar_parameter.py"], capture_output=True, text=True, cwd=Path(__file__).parent)
        if res2.stdout:
            for line in res2.stdout.splitlines():
                if "berhasil" in line or "Total data" in line: log.info(f"     [Regress] {line}")

        if res1.returncode == 0 and res2.returncode == 0:
            log.info("Semua pipa ML berhasil diperbarui.")
        else:
            log.warning(f"Ada pipa ML yang gagal")
            if res1.returncode != 0: log.error(f"Predict Error: {res1.stderr[:200]}")
            if res2.returncode != 0: log.error(f"Regress Error: {res2.stderr[:200]}")
            
    except Exception as e:
        log.error(f"Error saat menjalankan ML pipeline: {e}")

def main():
    log.info("="*50)
    log.info("LIVE FORECAST WATCHER STARTED (Interval: 5 Menit)")
    log.info("="*50)
    
    interval = 5 * 60 # 5 menit dalam detik
    
    try:
        while True:
            start_time = time.time()
            
            # Eksekusi peramalan
            run_forecast()
            
            # Hitung sisa waktu tidur agar tetap 5 menit bersih
            elapsed = time.time() - start_time
            sleep_time = max(0, interval - elapsed)
            
            log.info(f"Selesai dalam {elapsed:.2f} detik. Tidur selama {sleep_time/60:.2f} menit...")
            time.sleep(sleep_time)
            
    except KeyboardInterrupt:
        log.info("Watcher dimatikan oleh pengguna.")

if __name__ == "__main__":
    main()
