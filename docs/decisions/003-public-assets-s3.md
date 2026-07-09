# ADR 003 - Assets públicos servidos directamente desde S3

## Estado

Aceptada.

## Contexto

CloudFront generó problemas de cache en assets visibles, especialmente logos en emails. Para el estado actual del producto, el objetivo es priorizar consistencia visual, menor complejidad operativa y URLs predecibles.

## Decisión

Servir assets públicos de marca directamente desde AWS S3, sin CloudFront.

El backend centraliza:

- Subida de objetos.
- Validación de tipo real de imagen.
- Generación de keys versionadas.
- Generación de URLs públicas directas.
- Borrado del objeto anterior cuando se reemplaza un asset.

Variables recomendadas:

```env
AWS_REGION=us-east-1
AWS_S3_BUCKET=bukky-public-assets-prod
AWS_S3_PUBLIC_BASE_URL=
MAIL_ASSET_BASE_URL=
AWS_S3_FORCE_PATH_STYLE=false
```

Con `AWS_S3_PUBLIC_BASE_URL` vacío, la URL pública se deriva automáticamente:

```txt
https://bukky-public-assets-prod.s3.us-east-1.amazonaws.com/{key}
```

## Alcance

Permitido:

- Logos.
- Favicons.
- Avatares públicos de profesionales.
- Assets visuales de branding.

No permitido:

- Datos privados.
- Documentos internos.
- Backups.
- Exportaciones.
- Archivos con información sensible de clientes.

## Reglas de seguridad

- Las credenciales AWS viven solo en backend.
- El frontend nunca recibe credenciales AWS.
- El bucket permite lectura pública, pero nunca escritura pública.
- El backend usa `PutObject` y `DeleteObject`.
- Los objetos se sirven con `Cache-Control: public, max-age=31536000, immutable`.
- Cada asset nuevo debe generar una key nueva/versionada.
- `*.cloudfront.net` está bloqueado en `AWS_S3_PUBLIC_BASE_URL` y `MAIL_ASSET_BASE_URL`.

## Consecuencias

Ventajas:

- Menos problemas de cache.
- URLs directas y fáciles de depurar.
- Mejor compatibilidad con emails.
- Menos piezas de infraestructura.

Costes:

- No hay CDN delante.
- El bucket debe tener lectura pública para los prefijos de assets.
- Si el tráfico de imágenes crece mucho, habrá que evaluar CDN con invalidación/versionado correcto.

## Operación

La guía completa de bucket, bucket policy, CORS, IAM y variables está en:

```txt
docs/setup/aws-s3-public-assets.md
```

## Migración

Si existen URLs viejas de CloudFront guardadas en base de datos, se recomienda:

1. Re-subir logos/favicons/avatares desde el panel.
2. O ejecutar backfill solo si se confirma que las keys antiguas siguen existiendo en el bucket.

Con hard reset de Supabase no se requiere backfill.
