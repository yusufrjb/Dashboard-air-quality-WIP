#!/bin/bash
# Cron job to run prediction script every 5 minutes
# Add to crontab: crontab -e
# */5 * * * * /path/to/DashboardAQ_v3/run_predict.sh >> /path/to/DashboardAQ_v3/logs/predict.log 2>&1

cd D:\DashboardAQ_v3
python ml_model/predict_and_store.py