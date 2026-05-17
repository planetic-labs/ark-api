FROM python:3.14-slim-bookworm

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy dependency files
COPY backend/pyproject.toml backend/uv.lock backend/package.json ./backend/

# Install dependencies using uv
RUN cd backend && uv sync --frozen --no-dev

# Copy the rest of the backend code
COPY backend/ ./backend/

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# The command is provided in docker-compose.yml
