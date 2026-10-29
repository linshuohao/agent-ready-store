FROM node:24.22.1-bookworm-slim AS dev
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@12.11.2
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN DEBUG=prisma:download pnpm rebuild @prisma/engines prisma unrs-resolver
COPY . .
RUN pnpm --filter @store/contracts build
FROM dev AS production
ARG API_INTERNAL_URL=http://api:3001
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN DATABASE_URL=postgresql://build:build@db:5432/build pnpm db:generate && pnpm build
ENV NODE_ENV=production
