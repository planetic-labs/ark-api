FROM python:3.12-slim-bookworm

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy dependency files
COPY backend/pyproject.toml backend/package.json ./backend/

# Install dependencies using uv
# Note: Python 3.14 might not be fully stable/available in all images yet, 
# so using 3.12 as a stable base for now or adapting as needed.
RUN cd backend && uv sync --no-dev

# Copy the rest of the backend code
COPY backend/ ./backend/

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# The command is provided in docker-compose.yml
