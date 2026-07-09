# AWS S3 para assets públicos

Este proyecto sirve logos, favicons y avatares directamente desde S3. No se usa CloudFront para estos assets.

## Uso dentro de la aplicación

El backend es el único componente con credenciales AWS. El frontend solo recibe URLs públicas ya generadas por el backend.

Tipos de archivo permitidos:

- Logo de plataforma o negocio: PNG, JPG, WEBP.
- Favicon: PNG, JPG, WEBP, ICO.
- Avatar de profesional: PNG, JPG, WEBP.

Tamaños máximos actuales:

- Logo de negocio: 2 MB.
- Favicon de negocio: 512 KB.
- Avatar de profesional: 2 MB.

## Bucket recomendado

Crear un bucket dedicado solo para assets públicos.

Ejemplo:

```txt
bukky-public-assets-prod
```

Recomendaciones:

- Usar un nombre sin puntos para evitar problemas TLS con URLs virtual-hosted.
- No guardar documentos privados, backups, exportaciones, datos de clientes ni archivos internos.
- Mantener Object Ownership en `Bucket owner enforced`.
- No habilitar ACLs públicas de objeto. La lectura pública debe venir solo de bucket policy.

## Estructura de objetos

No tienes que crear estas carpetas manualmente. S3 no usa carpetas reales; el backend crea las keys cuando subes archivos.

Estructura usada por la app:

```txt
platform/bukky/assets/logo/{archivo-versionado}
platform/bukky/assets/favicon/{archivo-versionado}
tenants/{tenantId}/assets/logo/{archivo-versionado}
tenants/{tenantId}/assets/favicon/{archivo-versionado}
tenants/{tenantId}/employees/{employeeId}/avatar/{archivo-versionado}
```

Ejemplo real:

```txt
tenants/7f9e.../assets/logo/logo-barberia-6b9e9d4a-...webp
```

Cada archivo lleva UUID en el nombre. Por eso el backend usa:

```txt
Cache-Control: public, max-age=31536000, immutable
```

## Block Public Access

Para este bucket específico:

1. Entrar a `Permissions`.
2. Editar `Block public access`.
3. Desactivar el bloqueo que impide bucket policies públicas.
4. Confirmar el warning solo para este bucket de assets públicos.

No aplicar esta configuración a buckets privados.

## Bucket policy

Reemplaza `bukky-public-assets-prod` por el nombre real del bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicReadForBukkyPublicAssets",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::bukky-public-assets-prod/platform/*",
        "arn:aws:s3:::bukky-public-assets-prod/tenants/*"
      ]
    }
  ]
}
```

Esta policy solo permite lectura pública. No permite escritura pública.

## CORS del bucket

Configurar CORS para lectura desde navegador:

```json
[
  {
    "AllowedHeaders": [],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "https://app.tudominio.com",
      "https://www.tudominio.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 86400
  }
]
```

En producción elimina `http://localhost:3000` si quieres una política estricta.

## IAM para el backend

Crear un usuario o rol usado únicamente por el backend para escribir y borrar assets públicos.

Policy mínima:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BukkyPublicAssetsWrite",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::bukky-public-assets-prod/platform/*",
        "arn:aws:s3:::bukky-public-assets-prod/tenants/*"
      ]
    }
  ]
}
```

No dar permisos `s3:*`.

No exponer estas credenciales en el frontend.

## Variables de entorno del backend

Configuración recomendada:

```env
AWS_REGION=us-east-1
AWS_S3_BUCKET=bukky-public-assets-prod
AWS_S3_PUBLIC_BASE_URL=
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_SESSION_TOKEN=
AWS_S3_FORCE_PATH_STYLE=false
MAIL_ASSET_BASE_URL=
```

Con `AWS_S3_PUBLIC_BASE_URL` vacío, el backend genera automáticamente:

```txt
https://bukky-public-assets-prod.s3.us-east-1.amazonaws.com/{key}
```

`MAIL_ASSET_BASE_URL` debe quedar vacío salvo que exista una razón operativa fuerte. Si está vacío, los correos usan la misma URL pública directa de S3.

## Next Image remotePatterns

Si el frontend usa `next/image`, el host S3 debe estar permitido en `booking-system-frontend/next.config.ts`.

Para URL path-style:

```txt
https://s3.us-east-1.amazonaws.com/bukky-public-assets-prod/tenants/...
```

Usar:

```ts
{
  protocol: 'https',
  hostname: 's3.us-east-1.amazonaws.com',
  pathname: '/bukky-public-assets-prod/**',
}
```

Para URL virtual-hosted:

```txt
https://bukky-public-assets-prod.s3.us-east-1.amazonaws.com/tenants/...
```

Usar:

```ts
{
  protocol: 'https',
  hostname: 'bukky-public-assets-prod.s3.us-east-1.amazonaws.com',
  pathname: '/**',
}
```

`hostname` no debe incluir `https://` ni `/`.

## Variables prohibidas

No usar URLs CloudFront:

```env
AWS_S3_PUBLIC_BASE_URL=https://xxxxx.cloudfront.net
MAIL_ASSET_BASE_URL=https://xxxxx.cloudfront.net
```

El backend ahora rechaza dominios `*.cloudfront.net` para evitar volver accidentalmente al flujo con cache de CDN.

## Validación manual después de crear el bucket

1. Levantar backend con las variables reales.
2. Subir logo desde Configuración > Theme Builder.
3. Confirmar que la respuesta guarda una URL como:

```txt
https://bukky-public-assets-prod.s3.us-east-1.amazonaws.com/tenants/.../assets/logo/...
```

4. Abrir la URL en navegador anónimo.
5. Enviar una reserva de prueba.
6. Confirmar que el correo muestra el logo.
7. Cambiar logo y confirmar que la URL cambia por el UUID nuevo.

## Reset o migración de URLs antiguas

Si la base de datos tiene URLs antiguas de CloudFront en `logo_url`, `favicon_url` o `avatar_url`, hay dos opciones:

1. Re-subir los assets desde el panel. Es lo más seguro.
2. Ejecutar un backfill si las keys antiguas siguen existiendo en S3.

Para producción limpia con hard reset de Supabase, no debería hacer falta backfill.
