FROM python:3.12-slim
WORKDIR /app
COPY requirements*.txt ./
RUN pip install --no-cache-dir -r requirements-iot.txt
COPY backend backend
COPY frontend frontend
RUN useradd --create-home --uid 10001 maia && mkdir /data && chown maia:maia /data
USER maia
ENV MAIA_DB=/data/maia.db PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["python","-m","uvicorn","backend.main:app","--host","0.0.0.0","--port","8000"]
