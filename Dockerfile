FROM node:24.22.1-bookworm-slim AS dependencies
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@12.11.2
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/commerce-ui/package.json packages/commerce-ui/package.json
COPY apps/mcp-app/package.json apps/mcp-app/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm rebuild @prisma/engines prisma unrs-resolver

FROM dependencies AS build
COPY tsconfig.base.json ./
COPY scripts/local.mjs scripts/local.mjs
COPY apps apps
COPY packages packages
ARG API_INTERNAL_URL=http://api:3001
ARG WEB_ORIGIN=http://localhost:3000
ENV WEB_ORIGIN=${WEB_ORIGIN}
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN DATABASE_URL=postgresql://build:build@db:5432/build pnpm db:generate && pnpm build

# No source checkout or confidential references in the delivery image.
# Workspace dependencies include Prisma CLI for explicit deployment migrations.
FROM dependencies AS production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_INTERNAL_URL=http://api:3001
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/prisma.config.ts apps/api/prisma.config.ts
COPY --from=build /app/apps/api/scripts apps/api/scripts
COPY --from=build /app/apps/web/.next apps/web/.next
COPY --from=build /app/apps/web/public apps/web/public
COPY --from=build /app/apps/web/next.config.ts apps/web/next.config.ts
COPY --from=build /app/packages/contracts/dist packages/contracts/dist
CMD ["pnpm", "--filter", "@store/api", "start"]
