FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir -e ".[dev]"

COPY app/ ./app/

ENV PYTHONPATH=/app
ENV PORT=8104

EXPOSE 8104

CMD ["uvicorn", "app.api.main:app", "--host", "0.0.0.0", "--port", "8104"]
