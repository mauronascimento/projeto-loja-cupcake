FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VIRTUALENVS_CREATE=false

RUN apt-get update && apt-get install -y --no-install-recommends curl libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir poetry==2.2.1
RUN poetry install --only main --no-interaction --no-ansi --no-root

COPY . /app

EXPOSE 8000

CMD ["sh", "scripts/start.sh"]
