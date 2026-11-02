# FINN API for Render: Node 22 plus the Python yfinance bridge (backend/python).
# Build context: finn-enam/backend. Secrets come from the host's environment, never the image.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Node dependencies first so they are cached between deploys.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# The Python bridge lives where the API looks for it by default (python/.venv).
COPY python/requirements.txt python/requirements.txt
RUN python3 -m venv python/.venv \
  && python/.venv/bin/pip install --no-cache-dir -r python/requirements.txt

COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production \
    SERVE_FRONTEND=false
EXPOSE 10000
CMD ["node", "dist/server.js"]
