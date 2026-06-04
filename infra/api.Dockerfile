FROM python:3.14-slim-bookworm

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock package.json ./

# Install dependencies using uv
RUN uv sync --frozen --no-dev
RUN chmod -R 777 /app/.venv


# Copy the rest of the backend code
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# The command is provided in docker-compose.yml
