FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app


# Instala el workspace completo.
# El contexto Docker debe ser la raíz del monorepo.
FROM base AS dependencies

COPY . .

RUN pnpm install --frozen-lockfile


# Compila únicamente el frontend.
FROM dependencies AS builder

WORKDIR /app/booking-system-frontend

RUN mkdir -p public

# Valores que varían por despliegue
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_DOMAIN
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_SENTRY_RELEASE=local

# Configuración pública de autenticación y CSRF
ARG NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME=bukky_csrf
ARG NEXT_PUBLIC_AUTH_CSRF_HEADER_NAME=x-csrf-token

# Acciones públicas de Turnstile
ARG NEXT_PUBLIC_TURNSTILE_LOGIN_ACTION=login
ARG NEXT_PUBLIC_TURNSTILE_BOOKING_ACTION=booking_create
ARG NEXT_PUBLIC_TURNSTILE_RESCHEDULE_ACTION=booking_reschedule

# Sentry
ARG NEXT_PUBLIC_SENTRY_ENABLED=false
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
ARG NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.02
ARG NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0
ARG NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=0.1

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_DOMAIN=$NEXT_PUBLIC_APP_DOMAIN

ENV NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME=$NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME
ENV NEXT_PUBLIC_AUTH_CSRF_HEADER_NAME=$NEXT_PUBLIC_AUTH_CSRF_HEADER_NAME

ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_LOGIN_ACTION=$NEXT_PUBLIC_TURNSTILE_LOGIN_ACTION
ENV NEXT_PUBLIC_TURNSTILE_BOOKING_ACTION=$NEXT_PUBLIC_TURNSTILE_BOOKING_ACTION
ENV NEXT_PUBLIC_TURNSTILE_RESCHEDULE_ACTION=$NEXT_PUBLIC_TURNSTILE_RESCHEDULE_ACTION

ENV NEXT_PUBLIC_SENTRY_ENABLED=$NEXT_PUBLIC_SENTRY_ENABLED
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT
ENV NEXT_PUBLIC_SENTRY_RELEASE=$NEXT_PUBLIC_SENTRY_RELEASE
ENV NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=$NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
ENV NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=$NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE
ENV NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=$NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm run build

# Comprueba que Next.js generó el standalone y prepara los assets
# junto al server.js, independientemente de si quedó anidado
# por la estructura del monorepo.
RUN set -eux; \
    echo "Contenido standalone generado:"; \
    find .next/standalone -maxdepth 6 -type f -name "server.js" -print; \
    SERVER_FILE="$(find .next/standalone -type f -name "server.js" -print -quit)"; \
    test -n "$SERVER_FILE"; \
    SERVER_DIR="$(dirname "$SERVER_FILE")"; \
    mkdir -p "$SERVER_DIR/.next"; \
    cp -r public "$SERVER_DIR/public"; \
    cp -r .next/static "$SERVER_DIR/.next/static"; \
    SERVER_RELATIVE_PATH="${SERVER_FILE#.next/standalone/}"; \
    printf '%s' "$SERVER_RELATIVE_PATH" > .next/standalone/server-path.txt; \
    echo "Servidor seleccionado: $SERVER_RELATIVE_PATH"


# Imagen final de producción
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=8080

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

# Copia toda la estructura standalone.
# Esto conserva node_modules y cualquier estructura anidada del monorepo.
COPY --from=builder --chown=nextjs:nodejs \
    /app/booking-system-frontend/.next/standalone \
    ./

USER nextjs

EXPOSE 8080

CMD ["sh", "-c", "exec node \"$(cat /app/server-path.txt)\""]
