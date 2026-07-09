# ADR 004 - Swagger disponible solo en desarrollo

## Estado

Aceptada.

## Contexto

Swagger facilita integración y revisión de API, pero exponerlo en producción aumenta superficie de reconocimiento para atacantes.

## Decisión

Registrar Swagger/OpenAPI únicamente cuando:

```text
NODE_ENV=development
```

Rutas locales:

```text
/api/docs
/api/docs-json
/api/docs-yaml
```

## Consecuencias

Ventajas:

- Documentación útil en desarrollo.
- Menor exposición en producción.
- Menos información pública sobre endpoints protegidos.

Costes:

- Si se necesita compartir documentación externa, debe generarse una versión estática interna o protegida.

## Verificación

En producción:

- `/api/docs` debe responder 404.
- `/api/docs-json` debe responder 404.
- `/api/docs-yaml` debe responder 404.
