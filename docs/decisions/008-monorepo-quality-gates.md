# ADR 008 - Monorepo, quality gates y formato automático

## Estado

Aceptada.

## Contexto

El proyecto pasó de repos internos separados a un repositorio raíz único. Para que varias personas puedan trabajar sin conflictos innecesarios, el repo necesita reglas compartidas de formato, linting, typecheck, testing y CI/CD.

## Decisión

Usar:

- `pnpm workspaces` como orquestador del monorepo.
- Prettier como formatter único.
- ESLint por paquete para reglas de código.
- TypeScript `tsc --noEmit` como typecheck.
- GitHub Actions para quality gates.
- VS Code con format-on-save versionado en el repo.

## Reglas

- `pnpm install` se ejecuta desde la raíz.
- `pnpm ci` es el gate local equivalente al CI.
- `lint` no modifica archivos.
- `lint:fix` sí modifica archivos.
- `format` aplica Prettier.
- `format:check` valida formato sin modificar.
- Ningún PR debe mergearse si falla formato, lint, typecheck, tests o build.

## Formato al guardar

La raíz versiona:

```text
.vscode/settings.json
.vscode/extensions.json
```

VS Code debe ejecutar Prettier al guardar y aplicar fixes seguros de ESLint. Esto reduce diferencias por comillas, espacios, saltos de línea y estilo local.

CI sigue siendo obligatorio porque no todos los colaboradores usarán el mismo editor.

## CI/CD

Pull requests hacia `develop` y `main` ejecutan:

1. Install.
2. Format check.
3. Lint.
4. Typecheck.
5. Tests.
6. Build.

Push a `develop`:

- Ejecuta quality gates.
- No despliega staging automáticamente.
- Ejecuta smoke tests si las URLs están configuradas.

Push a `main`:

- Ejecuta quality gates.
- Ejecuta migraciones con Cloud Run Job antes de desplegar backend.
- Despliega production con GitHub Actions, Workload Identity Federation, Cloud Build y Cloud Run.
- Ejecuta smoke tests si las URLs están configuradas.

## TypeORM vs MikroORM

El manual base menciona MikroORM como estándar general para productos nuevos. Este producto mantiene TypeORM porque ya existe una base funcional con entidades, migraciones, servicios, reportes y pruebas construidas sobre TypeORM.

Cambiar ORM ahora no aporta valor proporcional y aumentaría riesgo sobre integridad de reservas, disponibilidad y migraciones.

## Consecuencias

Ventajas:

- Menos ruido en diffs.
- Menos conflictos por formato.
- PRs con validación automática.
- Onboarding más claro para nuevos desarrolladores.
- Base lista para trabajo colaborativo.

Costes:

- Requiere instalar dependencias desde raíz.
- Requiere configurar Workload Identity Federation, IAM y GitHub Environment `production`.
- Los errores existentes de lint/typecheck pueden aparecer como deuda técnica real que debe corregirse gradualmente.
