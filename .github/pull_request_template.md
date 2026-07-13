## Qué cambia

<!-- Describe el cambio de forma breve y concreta. -->

## Por qué

<!-- Explica el motivo del cambio y el problema que resuelve. -->

## Cómo probar

<!-- Incluye pasos concretos de validación local o en staging. -->

## Riesgos

<!-- Qué podría romperse, qué flujos revisar y cómo revertir si aplica. -->

## Checklist

- [ ] `pnpm format:check` pasa
- [ ] `pnpm lint` pasa
- [ ] `pnpm typecheck` pasa
- [ ] `pnpm test` pasa
- [ ] `pnpm build` pasa
- [ ] Si aplica, `pnpm ci:test:e2e:backend` pasa
- [ ] Si aplica, `pnpm ci:test:integration:backend` pasa con PostgreSQL
- [ ] No hay secrets, tokens ni credenciales en el diff
- [ ] Se actualizaron docs/ADR si aplica
- [ ] Se agregaron o actualizaron migraciones si cambió base de datos
