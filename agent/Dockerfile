FROM python:3.10-slim

WORKDIR /app

COPY system_agent.py .

RUN pip install --no-cache-dir psutil requests

CMD ["python", "system_agent.py"]
