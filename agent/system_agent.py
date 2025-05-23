import time
import socket
import psutil
import platform
import requests
from datetime import datetime

BACKEND_URL = "http://backend:5000/api/metrics"
HOSTNAME = socket.gethostname()

def collect_metrics():
    cpu = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    uptime = int(time.time() - psutil.boot_time())
    os_type = platform.system()

    metrics = {
        "hostname": HOSTNAME,
        "cpu": cpu,
        "memory": round(memory.percent, 2),
        "disk": round(disk.percent, 2),
        "uptime": uptime,
        "os": os_type,
        "timestamp": datetime.utcnow().isoformat()
    }
    return metrics

def send_metrics():
    while True:
        data = collect_metrics()
        try:
            response = requests.post(BACKEND_URL, json=data)
            print(f"[{datetime.now()}] Sent metrics: {response.status_code}")
        except Exception as e:
            print(f"[{datetime.now()}] Failed to send metrics: {e}")
        time.sleep(5)

if __name__ == "__main__":
    send_metrics()
