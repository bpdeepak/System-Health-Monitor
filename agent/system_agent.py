import psutil
import platform
import time
import requests
import socket

API_URL = "http://backend:5000/api/metrics"

def get_metrics():
    return {
        "hostname": socket.gethostname(),
        "cpu": psutil.cpu_percent(interval=1),
        "memory": psutil.virtual_memory().percent,
        "disk": psutil.disk_usage('/').percent,
        "uptime": int(time.time() - psutil.boot_time()),
        "os": platform.system()
    }

while True:
    try:
        data = get_metrics()
        res = requests.post(API_URL, json=data)
        print("Sent:", data, "Status:", res.status_code)
    except Exception as e:
        print("Error:", e)
    time.sleep(10)
