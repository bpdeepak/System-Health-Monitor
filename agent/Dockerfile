FROM python:3.11-slim
WORKDIR /app
COPY system_agent.py .
RUN pip install psutil requests
CMD ["python", "system_agent.py"]
