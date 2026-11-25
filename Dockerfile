FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY scripts/build-frontend.mjs scripts/
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY requirements*.txt ./
RUN pip install --no-cache-dir -r requirements-iot.txt
COPY backend backend
COPY frontend frontend
COPY --from=frontend-build /app/frontend/vendor frontend/vendor
RUN useradd --create-home --uid 10001 maia && mkdir /data && chown maia:maia /data
USER maia
ENV MAIA_DB=/data/maia.db PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["python","-m","uvicorn","backend.main:app","--host","0.0.0.0","--port","8000"]
