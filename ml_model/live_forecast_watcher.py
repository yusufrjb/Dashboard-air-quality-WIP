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
    log.info("Memulai pipeline peramalan...")
    try:
        # Jalankan Peramalan Multi-Parameter (60 min, untuk ISPU 1 jam)
        log.info("  -> Menjalankan predict_hourly_multi.py")
        res3 = subprocess.run([sys.executable, "predict_hourly_multi.py"], capture_output=True, text=True, cwd=Path(__file__).parent)
        if res3.stdout:
            for line in res3.stdout.splitlines():
                if "Selesai" in line or "simpan" in line: log.info(f"     [Hourly] {line}")

        if res3.returncode == 0:
            log.info("Pipeline peramalan berhasil.")
        else:
            log.warning(f"Pipeline gagal")
            
    except Exception as e:
        log.error(f"Error saat menjalankan pipeline: {e}")

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
