FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

WORKDIR /app


FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY booking-system-backend/package.json booking-system-backend/package.json
COPY booking-system-frontend/package.json booking-system-frontend/package.json

RUN pnpm install --frozen-lockfile --filter booking-system...


FROM deps AS builder

COPY booking-system-backend ./booking-system-backend

WORKDIR /app/booking-system-backend

RUN pnpm run build
RUN test -f dist/main.js
RUN pnpm exec node -e "require('argon2'); console.log('argon2 ok')"


FROM builder AS operations

ENV NODE_ENV=production

WORKDIR /app/booking-system-backend

CMD ["pnpm", "run", "migration:run"]


FROM base AS production

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY booking-system-backend/package.json booking-system-backend/package.json
COPY booking-system-frontend/package.json booking-system-frontend/package.json

RUN pnpm install --prod --frozen-lockfile --filter booking-system...

COPY --from=builder /app/booking-system-backend/dist ./booking-system-backend/dist

WORKDIR /app/booking-system-backend

EXPOSE 8080

CMD ["pnpm", "run", "start:prod"]
