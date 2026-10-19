# Bukky Booking — baseline integral de producto por dominios

> Documento piloto para comprender el estado actual, definir el producto base, separar add-ons y servir de contexto a futuros PRD, épicas, historias de usuario e issues.
>
> Fecha de corte: 13 de octubre de 2026. Fuente primaria: repositorio local en esta fecha. No certifica que el commit analizado coincida con producción ni que todas las pruebas estén verdes.

## 1. Propósito

Este documento debe permitir que una persona o agente de IA comprenda Bukky sin reconstruir primero todo el contexto desde el código. Describe:

- qué producto existe realmente;
- quiénes son sus actores;
- qué dominios componen el núcleo;
- qué capacidades pueden convertirse en add-ons;
- qué entidades y relaciones gobiernan los flujos;
- qué está implementado, incompleto o solamente proyectado;
- qué debería contener un MVP vendible;
- qué trabajo es necesario para llevar cada dominio a un objetivo futuro.

La existencia de una entidad, endpoint o pantalla no equivale a una funcionalidad terminada. Cada dominio debe evaluarse en código, experiencia, integración, calidad, operación y propuesta comercial.

### 1.1 Escala de madurez

| Nivel | Significado |
|---|---|
| 0 — Ausente | No hay implementación utilizable. |
| 1 — Esqueleto | Existen piezas aisladas, no un flujo completo. |
| 2 — Implementado | El camino principal existe, pero faltan pruebas, UX u operación. |
| 3 — Pilotable | Puede usarse con clientes seleccionados y soporte cercano. |
| 4 — Vendible | Está probado, documentado, observable y soportable. |
| 5 — Escalable | Es autoservicio, resiliente y medido con volumen real. |

### 1.2 Estado de esta evaluación

- Repositorio más compacto que Cataloguer: aproximadamente 409 archivos.
- Backend NestJS/TypeORM/PostgreSQL y frontend Next.js.
- 34 migraciones.
- 23 archivos de pruebas backend y 4 frontend identificados.
- Existen workflows de validación de pull requests y despliegue de producción.
- Las dependencias no estaban instaladas durante esta revisión; no se ejecutó la suite completa.
- Había una modificación local previa en `super-admin.seed.spec.ts`; no forma parte de este documento y no se modificó.

## 2. Veredicto sobre la forma del producto

Bukky sí es sustancialmente más coherente y compacto que Cataloguer. Tiene un único grafo dominante:

```text
Negocio
→ servicios
→ profesionales
→ horarios, descansos y ausencias
→ disponibilidad
→ reserva
→ comunicación y operación
```

No obstante, hay que corregir una idea: los dominios anteriores **no son add-ons independientes**. Son componentes inseparables del producto base. No se puede ofrecer una agenda de citas funcional sin servicios, recursos/profesionales, reglas horarias, cálculo de disponibilidad y reservas.

Los add-ons reales comienzan después del motor central:

- recordatorios configurables y canales adicionales;
- pagos, depósitos y políticas económicas;
- WhatsApp/SMS;
- calendarios externos;
- panel del profesional;
- reporting avanzado;
- branding premium/white-label;
- grupos, clases y capacidad avanzada;
- API/webhooks para integraciones;
- múltiples ubicaciones y recursos físicos;
- CRM/marketing, si algún día se decide construirlos.

### 2.1 Tres capas recomendadas

#### Núcleo obligatorio

- tenant/negocio;
- administrador del negocio;
- servicios;
- profesionales;
- horario, descansos y ausencias;
- disponibilidad;
- reservas públicas y manuales;
- estados y reprogramación;
- confirmación transaccional básica;
- configuración esencial del negocio;
- seguridad, tenancy y auditoría técnica.

#### Capacidades de soporte

Necesarias para operar, pero no necesariamente vendidas como add-ons:

- autenticación, sesiones y MFA;
- onboarding;
- superadministración;
- branding base;
- dashboard básico;
- observabilidad, CI/CD y migraciones;
- almacenamiento de logos y avatares.

#### Add-ons comerciales

Pueden tener plan, feature flag, permisos y ciclo de vida propios:

- recordatorios avanzados;
- pagos/depósitos;
- comunicaciones WhatsApp/SMS;
- sincronización de calendarios;
- reportes avanzados/exportación;
- panel de profesional;
- white-label;
- reservas grupales/capacidad avanzada;
- integraciones/API/webhooks.

## 3. Público objetivo y límites

### Público principal

Pequeños y medianos negocios de servicios que trabajan mediante citas:

- barberías;
- salones de belleza;
- uñas, estética y spa;
- odontólogos y clínicas pequeñas;
- fisioterapia y terapia no hospitalaria;
- entrenadores, clases y estudios;
- consultores y profesionales independientes;
- talleres u otros servicios con agenda, siempre que el modelo sea compatible.

### Mejor cliente inicial

- uno o varios profesionales;
- servicios con duración conocida;
- una ubicación;
- atención en una única zona horaria;
- reservas por web/WhatsApp/teléfono;
- cobro presencial o acordado fuera de Bukky;
- necesidad de reducir solapamientos y coordinación manual.

### Fuera del alcance actual

- hospitales o historias clínicas;
- telemedicina regulada;
- marketplaces de profesionales;
- franquicias/multiubicación compleja;
- alquiler de recursos físicos múltiples;
- pagos online;
- fiscalidad y facturación;
- CRM y marketing automation;
- turnos sin hora;
- listas de espera;
- recurrencias;
- videollamada;
- POS/caja;
- integración nativa con Google/Outlook/Apple Calendar.

## 4. Mapa de entidades y relaciones

```text
Tenant
├── TenantSetting
├── User (TENANT_ADMIN)
├── Service ↔ Employee
├── Employee
│   ├── EmployeeScheduleRule
│   ├── EmployeeScheduleBreak
│   └── EmployeeTimeOff
├── Booking
│   ├── BookingItem → Service
│   ├── Employee
│   └── BookingReminder
└── AuditLog

PlatformSetting pertenece al scope global BUKKY.
AuthSession, AuthMfaChallenge, UserAccessToken y
UserOnboardingProgress pertenecen al usuario y su contexto.
```

### 4.1 Fuentes de verdad

- `Tenant`: identidad y datos públicos del negocio.
- `TenantSetting`: apariencia del negocio.
- `Service`: oferta reservable y reglas comerciales.
- `Employee`: profesional/recurso humano que presta servicios.
- entidades de schedule: cuándo puede trabajar.
- `Booking`: compromiso temporal y datos del cliente.
- `BookingItem`: snapshot histórico de los servicios contratados.
- `BookingReminder`: trabajo asíncrono de comunicación programada.
- `AuditLog`: evidencia de acciones relevantes.

### 4.2 Invariantes transversales

- toda entidad de negocio debe quedar limitada a un tenant;
- precio, disponibilidad, capacidad y autorización se deciden en backend;
- una reserva conserva snapshots aunque cambie el servicio;
- estados bloqueantes consumen disponibilidad;
- estados finales no se reabren sin un flujo explícito;
- crear y reprogramar debe revalidar dentro de transacción;
- los reintentos públicos no deben duplicar una reserva;
- tiempos se almacenan en UTC y se presentan en la zona horaria correspondiente;
- el cliente público nunca recibe IDs o datos administrativos innecesarios.

## 5. Mapa de dependencias

| Dominio | Depende de | Requerido por |
|---|---|---|
| Identidad | usuarios, tenant | todo el panel privado |
| Tenant | identidad | servicios, empleados, reservas, branding |
| Servicios | tenant | disponibilidad, reservas, reportes |
| Profesionales | tenant, servicios | horarios, disponibilidad, reservas |
| Agenda | profesionales | disponibilidad |
| Disponibilidad | servicios, agenda, reservas | reserva y reprogramación |
| Reservas | disponibilidad, servicios, empleados | notificaciones, recordatorios, reportes |
| Notificaciones | reservas, tenant, email | experiencia del cliente/profesional |
| Recordatorios | reservas, notificaciones | reducción de no-show |
| Reportes | reservas, servicios, empleados | gestión del negocio |
| Branding | tenant/settings, storage | panel, reserva pública, emails |
| Auditoría | identidad y dominios operativos | soporte y seguridad |

---

# 6. Dominios del producto

## D01. Identidad, autenticación, sesiones y MFA

### Responsabilidad

Autenticar operadores, gestionar sesiones y proteger cuentas administrativas.

### Entidades

- `User`: nombre, email, password hash, rol, tenant, estado, verificación/invitación, onboarding, token version, bloqueo, último login y MFA.
- `AuthSession`: refresh hash, CSRF hash, expiración, revocación, reemplazo, IP, user-agent y último uso.
- `AuthMfaChallenge`: challenge intermedio, expiración, consumo e intentos.
- `UserAccessToken`: invitación o recuperación de contraseña, snapshot de email y consumo.
- `UserOnboardingProgress`: módulo/versión completados por usuario.

### Roles actuales

- `SUPER_ADMIN`;
- `TENANT_ADMIN`.

No existe usuario profesional autenticado ni usuario cliente final.

### Flujos

1. login con contraseña;
2. MFA si está habilitado;
3. access token corto y refresh en cookie;
4. refresh con rotación y CSRF;
5. logout individual/global;
6. sesiones activas y revocación;
7. setup/enable/disable MFA;
8. regeneración de recovery codes;
9. recuperación de contraseña;
10. invitación y activación de tenant admin.

### Estado

Buena base de seguridad: Argon2, tokens hasheados, MFA cifrado, CSRF, bloqueo, sesiones y challenge persistente. Madurez estimada: **3/5**.

### Riesgos/deuda

- secretos JWT admiten mínimo de 10 caracteres, insuficiente como política de producción;
- `JWT_REFRESH_SECRET`, `MFA_ENCRYPTION_KEY` y `MFA_CHALLENGE_SECRET` son opcionales en schema; producción debe exigir claves independientes y fuertes;
- falta acreditar alertas de acceso y step-up MFA para acciones sensibles;
- solo dos roles obligan al administrador a tener acceso total al negocio;
- recuperación/correos deben verificarse de extremo a extremo.

### Decisión MVP

**Núcleo obligatorio.** No es add-on. MFA puede ser opcional para cliente, pero la capacidad debe estar disponible y ser obligatoria para superadministración.

### Definición de vendible

- secretos fail-closed en producción;
- sesiones y CSRF probados en dominios reales;
- E2E de login, refresh, recuperación, invitación y MFA;
- logs y alertas sin datos sensibles;
- matriz clara de autoridad de superadmin frente a tenant admin.

## D02. Plataforma multiempresa y tenants

### Responsabilidad

Representar cada negocio y aislar sus datos.

### Entidad `Tenant`

- nombre y slug;
- estado activo;
- dirección, ciudad, estado, país y código postal;
- teléfono y email público.

### Flujos

- superadmin lista, consulta, crea y edita negocios;
- tenant admin consulta y edita su propio negocio;
- slug identifica la URL pública `/book/{tenantSlug}`;
- tenant inactivo debe dejar de aceptar reservas y limitar operación según política.

### Estado

Modelo sencillo y apropiado. Falta documentar el ciclo contractual: prueba, activo, suspendido, cancelado, retención y borrado. Actualmente `is_active` es demasiado binario para billing/operación futuros. Madurez: **3/5 técnica; 2/5 comercial**.

### Decisión MVP

**Núcleo obligatorio.** Herramientas de superadmin son soporte interno, no add-on.

### Futuro

Si se añade multiubicación, no sobrecargar `Tenant`: crear `Location/Branch` y decidir si horarios, servicios, empleados y reservas pertenecen también a ubicación.

## D03. Administradores, equipo y permisos

### Responsabilidad

Dar acceso al personal que configura y opera el negocio.

### Estado actual

El superadmin administra tenant admins. Un tenant admin posee, en la práctica, toda la autoridad del negocio. Los empleados/profesionales no son usuarios.

### Flujos

- listar/detallar administradores;
- invitar;
- editar;
- reenviar invitación;
- activar/desactivar mediante el modelo de usuario.

### Diagnóstico

Es suficiente para un MVP pequeño. No es suficiente cuando el negocio tiene recepción, gerente y profesionales con diferentes responsabilidades. Madurez: **2.5/5**.

### Decisión MVP

**Incluir un administrador propietario y administradores adicionales.** No construir RBAC complejo hasta observar demanda real.

### Add-on futuro: panel profesional

Debe ser un producto vertical con usuario enlazado a `Employee`, permisos limitados, agenda propia, bloqueo de horarios y datos de clientes mínimos. No debe reutilizar `TENANT_ADMIN` como atajo.

## D04. Servicios y reglas comerciales

### Responsabilidad

Definir qué puede reservarse y bajo qué restricciones.

### Entidad `Service`

- tenant;
- nombre, descripción e instrucciones;
- duración;
- buffer anterior/posterior;
- precio y moneda;
- pricing `FLAT` o `PER_PERSON`;
- capacidad, mínimo/máximo y party size;
- capacidad compartida por slot;
- profesionales asignados;
- confirmación requerida;
- antelación mínima;
- ventana máxima de reserva;
- orden y estado activo.

### Relaciones

- muchos servicios ↔ muchos empleados;
- una reserva contiene uno o más `BookingItem` con snapshot de servicio;
- disponibilidad combina duración/buffers de los servicios seleccionados;
- cambiar capacidad está restringido si contradice reservas futuras.

### Flujos

- crear, listar, detallar y editar;
- activar/desactivar;
- asignar profesionales;
- configurar pricing/capacidad/ventanas;
- exponer servicios activos en reserva pública.

### Estado

Más completo de lo necesario para el segmento inicial. El modelo soporta reservas grupales y múltiples servicios, pero esa flexibilidad eleva las combinaciones que probar. Madurez: **3/5**.

### Decisión MVP

**Núcleo obligatorio.** En UI inicial mostrar duración, precio, profesionales y estado. Mantener buffers, aviso y ventana como configuración avanzada. Ocultar capacidad grupal si el primer vertical trabaja 1:1.

### Preguntas de PRD

- ¿Una reserva puede combinar servicios de distinta persona?
- ¿El precio siempre es informativo o contractual?
- ¿Qué sucede si se edita/desactiva un servicio con reservas futuras?
- ¿Puede cambiar moneda por servicio dentro del mismo negocio?

## D05. Profesionales/empleados

### Responsabilidad

Representar a quien presta el servicio y contra cuya agenda se reserva.

### Entidad `Employee`

- tenant;
- nombre, email y teléfono estructurado;
- avatar;
- zona horaria;
- intervalo de slots;
- estado;
- servicios asociados.

### Flujos

- alta, listado, detalle y edición;
- activación/desactivación;
- subida de avatar;
- asignación de servicios;
- configuración de agenda;
- recepción de emails operativos.

### Estado

Adecuado para un MVP. El término “Empleado” puede ser incorrecto para autónomos, doctores, contratistas o recursos no humanos. Madurez: **3/5**.

### Decisión MVP

**Núcleo obligatorio**, aunque un negocio unipersonal debería recibir un profesional predeterminado para reducir onboarding.

### Add-on futuro

Perfil público, panel propio, permisos, comisiones, ubicación, recursos, preferencias y sincronización de calendario deben vivir en PRD separados.

## D06. Horarios, descansos y ausencias

### Responsabilidad

Definir cuándo un profesional está disponible antes de considerar reservas existentes.

### Entidades

- `EmployeeScheduleRule`: día, inicio/fin local y actividad.
- `EmployeeScheduleBreak`: día, pausa local y actividad.
- `EmployeeTimeOff`: rango UTC, razón y actividad.

### Flujo

1. administrador define horario recurrente semanal;
2. configura descansos recurrentes;
3. añade ausencias puntuales;
4. disponibilidad proyecta reglas locales a UTC usando zona del profesional;
5. se restan descansos, ausencias y reservas bloqueantes.

### Estado

Modelo claro, pero fechas/zonas horarias son un área de alto riesgo. No hay excepciones positivas aparentes —por ejemplo, abrir un domingo excepcional— ni calendario festivo. Madurez: **2.5/5**.

### Decisión MVP

**Núcleo obligatorio.** Limitar inicialmente a una zona horaria por negocio/profesional y documentar cambios DST aunque Venezuela no los utilice.

### Pendientes

- validar solapamientos de reglas y descansos;
- copiado de horarios entre profesionales;
- excepciones por fecha;
- vacaciones recurrentes o masivas;
- experiencia visual de conflictos;
- decidir si el slot interval pertenece al empleado, servicio o tenant.

## D07. Motor de disponibilidad y capacidad

### Responsabilidad

Calcular horarios reservables y volver a validarlos atómicamente al confirmar.

### Entradas

- servicio(s), duración y buffers;
- profesional elegible;
- horario, descansos y ausencias;
- slot interval;
- reservas `PENDING`, `CONFIRMED`, `IN_PROGRESS`;
- party size y slot capacity;
- aviso mínimo y ventana máxima;
- zona horaria.

### Salida

Slots visibles que parecen disponibles. La respuesta previa no reserva el slot; la creación debe revalidar dentro de una transacción.

### Concurrencia

El servicio usa transacciones y locks pesimistas. Existe prueba E2E específica de concurrencia y migración de integridad de reservas. Esto es una fortaleza esencial.

### Estado

Es el corazón técnico de Bukky y no un add-on. La implementación parece consciente de carreras, buffers, capacidad y solapamientos. Debe verificarse contra PostgreSQL real y cargas. Madurez: **3/5**.

### Riesgos

- la complejidad crece mucho al combinar múltiples servicios y capacidad;
- slots consultados pueden quedar obsoletos antes de confirmar;
- cambio de horario/servicio con reservas futuras;
- zonas horarias y límites de día;
- consultas por rango para calendarios grandes;
- rate limit en memoria por instancia si no se usa almacenamiento distribuido.

### Definición de vendible

- suite PostgreSQL verde;
- pruebas paralelas crear/crear, crear/reprogramar y reprogramar/reprogramar;
- objetivos P95 medidos en staging;
- mensajes útiles cuando un slot deja de estar disponible;
- índices y planes de consultas validados con volumen objetivo.

## D08. Reservas, estados y operación diaria

### Responsabilidad

Representar el compromiso entre cliente, negocio y profesional.

### Entidades

`Booking` contiene:

- tenant y empleado;
- inicio/fin visibles;
- inicio/fin ocupados incluyendo buffers;
- estado;
- party size;
- precio total/moneda;
- contacto y notas del cliente;
- fuente;
- actor creador;
- idempotencia;
- token público de gestión;
- timestamps de cancelación/completado.

`BookingItem` conserva snapshot de nombre, duración, buffers, precio, pricing, cantidad, total, moneda e instrucciones.

### Estados

```text
PENDING   → CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW
CONFIRMED → IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW
IN_PROGRESS → COMPLETED | CANCELLED | NO_SHOW
COMPLETED / CANCELLED / NO_SHOW → finales
```

Estados bloqueantes: `PENDING`, `CONFIRMED`, `IN_PROGRESS`.

### Flujos privados

- crear reserva manual;
- listar/buscar/filtrar;
- ver detalle;
- cambiar estado;
- reprogramar;
- tabla/calendario y drag-and-drop validado en backend.

### Estado

Núcleo funcional sólido. Falta cerrar cancelación pública, políticas, notas internas, asignación y comunicación de cambios. Madurez: **3/5**.

### Decisión MVP

**Núcleo obligatorio.** Reducir estados visibles si el negocio inicial no necesita `IN_PROGRESS`. Nunca añadir estados sin definir transiciones, disponibilidad, notificaciones, reporting y auditoría.

## D09. Reserva pública y autogestión del cliente

### Flujo de creación

```text
/book/{tenantSlug}
→ servicios activos
→ profesional elegible
→ fecha/slot
→ datos y notas
→ Turnstile opcional
→ POST con Idempotency-Key
→ revalidación transaccional
→ PENDING o CONFIRMED
→ confirmación y email
```

### Flujo de gestión

```text
Enlace con token opaco
→ GET detalle limitado
→ consulta de nueva disponibilidad
→ PATCH reprogramación con idempotencia
→ nuevo horario y notificaciones
```

El token se guarda por hash y expira. Actualmente la gestión pública expone reprogramación; no aparece un endpoint público de cancelación.

### Estado

Flujo compacto y alineado con el producto. Madurez: **3/5**.

### Deuda

- política de expiración y regeneración del enlace;
- cancelación pública y política temporal;
- consentimiento/privacidad;
- accesibilidad y móvil probados;
- estados cuando email está desactivado;
- bloqueo de abuso por tenant/IP;
- qué ocurre si empleado/servicio se desactiva;
- localización e idioma.

### Decisión MVP

**Núcleo obligatorio.** La autogestión por token puede lanzarse con reprogramación y añadir cancelación mediante PRD específico.

## D10. Confirmación requerida

### Responsabilidad

Permitir que ciertos servicios creen reservas `PENDING` en vez de confirmarlas automáticamente.

### Estado real

La regla sí afecta al estado inicial y existe transición posterior a `CONFIRMED`; por tanto no es solo un campo muerto. Sin embargo, la documentación reconoce que falta un flujo diferencial completo. Madurez: **2/5**.

### Lo que falta

- bandeja/alerta de pendientes;
- SLA de respuesta;
- expiración o liberación automática;
- aceptar/rechazar con motivo;
- mensajes distintos para cliente;
- qué disponibilidad consume una solicitud pendiente y durante cuánto tiempo;
- recordatorios y reportes diferenciados.

### Decisión MVP

Ocultar `requires_confirmation` para negocios de confirmación instantánea. Si un vertical lo necesita, tratarlo como un subdominio explícito, no como un checkbox.

## D11. Notificaciones transaccionales por email

### Responsabilidad

Comunicar creación y cambios de la reserva al cliente y profesional.

### Componentes

- Resend;
- plantillas separadas;
- datos públicos del tenant;
- Google Maps;
- enlace de gestión;
- calendario ICS;
- branding de email.

### Estado

Forma parte del núcleo práctico aunque técnicamente pueda desactivarse. Sin comunicación, una reserva pública pierde confianza y la autogestión por token no llega al cliente. Madurez: **2.5/5**.

### Decisión MVP

**Incluir email de confirmación/reprogramación/cancelación como núcleo.** No tratarlo como add-on. El canal premium puede ser WhatsApp/SMS.

### Pendientes

- matriz evento × destinatario × estado;
- deduplicación/idempotencia de envíos;
- retries y dead-letter;
- rebotes/complaints;
- preferencias y consentimiento;
- preview de plantillas;
- pruebas con zonas horarias y datos incompletos.

## D12. Recordatorios programados

### Entidad `BookingReminder`

- booking/tenant;
- audiencia;
- canal;
- tipo;
- estado;
- email destino;
- fecha programada;
- intentos, retry, processing, envío y error.

### Procesamiento

Cron jobs dentro del backend:

- dispatch;
- backfill;
- process;
- recovery de trabajos atascados.

Hay configuración de batch, máximo de intentos, delay y timeout de processing.

### Estado

Implementación seria para email del día siguiente, pero ejecutar cron en cada instancia de Cloud Run exige comprobar coordinación/claiming para evitar duplicados. Madurez: **2.5/5**.

### Decisión

**Add-on comercial válido** si los recordatorios son configurables y medibles. Puede incluirse gratis al principio, pero debe tener feature flag por tenant, preferencias, horario y métricas de entrega.

### Evolución recomendada

Mover procesamiento a Cloud Run Job/Tasks o cola cuando el volumen justifique, manteniendo claims idempotentes en DB.

## D13. Dashboard, reportes y exportación

### Capacidades

- overview de dashboard;
- citas e ingresos;
- cancelaciones/asistencia;
- ticket promedio y tendencias;
- top servicios/profesionales;
- filtros por rango, estado, canal y tenant;
- exportación Excel.

### Fuente

Reservas, items snapshot, servicios y profesionales. Solo `COMPLETED` cuenta como ingreso según constantes actuales.

### Estado

Dashboard básico es soporte del núcleo. Reporting avanzado/exportación sí puede ser add-on. La exactitud necesita datasets de reconciliación y reglas claras de moneda/zona horaria. Madurez: **2.5/5**.

### Decisión MVP

- incluir hoy, próximas citas, pendientes y resumen simple;
- ocultar métricas que parezcan contables;
- exportación y análisis avanzados como add-on posterior.

### Definición de KPI

Cada métrica debe documentar rango, timezone, estados incluidos, moneda, cancelaciones, reservas manuales/públicas y fecha usada para agrupar.

## D14. Configuración, identidad visual y white-label

### Entidades

- `TenantSetting`: colores, hovers, textos, modo, overrides, app name, window title, logo y favicon.
- `PlatformSetting`: misma estructura en scope global `BUKKY`.

### Flujos

- obtener/editar configuración global o del tenant;
- subir logo/favicon a S3;
- aplicar tema al panel y rutas públicas;
- preview/theme builder.

### Diagnóstico crítico

La personalización actual no está totalmente aislada: un contexto global de frontend la consume y afecta navegación, login, panel y reserva. Comercialmente puede ser white-label; técnicamente es infraestructura transversal.

### Estado

Más avanzado de lo necesario para un booking MVP. La estrategia de assets usa lectura pública directa desde S3. Madurez: **2.5/5**.

### Decisión MVP

- incluir nombre, logo y color principal;
- ocultar theme builder avanzado;
- vender white-label completo como add-on futuro;
- mantener defaults seguros para que la ausencia/fallo de settings no bloquee la aplicación.

### Pendientes

Contraste/accesibilidad, formatos, dimensiones, borrado de assets previos, cuotas, CSP, cache, dominio personalizado y emails coherentes.

## D15. Onboarding guiado

### Responsabilidad

Explicar los módulos y registrar progreso por usuario, rol, module key y versión.

### Estado

Existe una guía bastante extensa acoplada a selectores y rutas de frontend. Sirve de soporte, pero puede romperse con cambios visuales y no equivale a onboarding de negocio completado. Madurez: **2/5**.

### Decisión MVP

Reemplazar tours largos por checklist de resultado:

1. completar datos;
2. crear servicio;
3. crear profesional;
4. definir horario;
5. probar reserva;
6. compartir enlace.

El onboarding no es add-on; es activación del producto. El tour interactivo sí es prescindible.

## D16. Auditoría y trazabilidad

### Entidad

`AuditLog`: actor, tenant, acción, mensaje, entidad, ID, metadata, IP, user-agent y fecha.

### Uso

Login/logout/refresh, cambios de recursos, invitaciones, reservas, reprogramaciones y configuración.

### Estado

Buena capacidad transversal. La vista para tenant admin debe filtrar metadatos sensibles y traducir eventos técnicos. Madurez: **2.5/5**.

### Decisión MVP

Mantener internamente. Exponer al cliente solo eventos operativos útiles. Auditoría avanzada y retención prolongada pueden diferenciar planes, pero los eventos de seguridad mínimos no deben depender del plan.

## D17. Superadministración

### Capacidades

- dashboard/reportes globales;
- tenants;
- administradores de negocio;
- auditoría global;
- configuración de plataforma/tenant.

### Estado

Necesaria para operar SaaS, pero no es un módulo de cliente. El superadmin no debe operar citas como si fuera tenant admin ni romper límites de tenant. Madurez: **2.5/5**.

### Pendientes

- soporte delegado explícito e informado;
- impersonation segura si se decide, con step-up y auditoría;
- estados contractuales;
- búsqueda y health por tenant;
- métricas de consumo;
- suspensión/reactivación y exportación/borrado.

## D18. Operación, seguridad e infraestructura

### Arquitectura

- frontend y backend en Cloud Run;
- PostgreSQL;
- migraciones mediante Cloud Run Job;
- S3 para assets públicos;
- Resend;
- Turnstile opcional;
- Sentry;
- GitHub Actions + Workload Identity Federation + Cloud Build;
- imágenes por SHA y smoke tests.

### Fortalezas

- CI/CD presente;
- sin claves JSON de GCP;
- ValidationPipe estricto;
- Helmet/HSTS;
- CORS allowlist;
- cookies HttpOnly y CSRF;
- Swagger solo en desarrollo;
- sanitización Sentry;
- objetivos de performance;
- migraciones explícitas.

### Deuda/riesgos

- health solo confirma que el proceso responde, no DB/readiness;
- rate limiting estándar puede ser por instancia y no distribuido;
- cron de recordatorios corre dentro del servicio escalable;
- secretos críticos opcionales o con mínimo débil;
- S3 público requiere política, enumeración y lifecycle revisados;
- falta evidencia en este corte de restore periódico de backups;
- solo cuatro pruebas frontend identificadas y no se ejecutó ninguna suite;
- el último commit local es de julio de 2026: verificar si producción/repo están realmente activos y alineados.

### Decisión MVP

Dominio bloqueante. Antes de vender: readiness DB, backup restaurado, rate limit distribuido o estrategia documentada, secretos endurecidos, suite verde, cron seguro y despliegue de staging demostrado.

---

# 7. Add-ons futuros: fronteras y contratos

## A01. Pagos y depósitos

Debe acoplarse a `Booking` mediante una entidad de pago, no columnas sueltas. Necesita intent, webhook, idempotencia, moneda, refund, cancelación, no-show, depósito parcial, conciliación y estados independientes. Una reserva y un pago no comparten el mismo estado.

## A02. WhatsApp y SMS

Debe consumir eventos de reserva/notificación. Requiere consentimiento, plantillas, entrega, fallo, opt-out, coste por tenant y fallback. No debe introducir llamadas directas al proveedor dentro de la transacción de reservas.

## A03. Calendarios externos

Debe sincronizar mediante conectores y webhooks/jobs. Hay que resolver dirección de verdad, recurrencias, cambios externos, duplicados, scopes OAuth, desconexión y reconciliación. El motor de disponibilidad sigue siendo autoridad hasta que el PRD diga lo contrario.

## A04. Panel profesional

Requiere identidad propia enlazada a Employee, agenda limitada, privacidad, acciones permitidas y notificaciones. No es solo una nueva pantalla.

## A05. Reporting premium

Debe apoyarse en definiciones versionadas de métricas, no consultas ad hoc. Puede incluir cohortes, no-show, ocupación, rendimiento, exportación programada y benchmarking anonimizado.

## A06. White-label

Incluye tema avanzado, dominio, emails, identidad, favicon, textos y posiblemente remitente. Requiere fallback, accesibilidad, DNS/TLS y límites por plan.

## A07. Capacidad/clases

Aunque parte del modelo ya existe, debe tener UX y reglas propias: cupos, mínimo, lista de asistentes, cambios de capacidad, espera, cancelación individual y pricing por persona.

## A08. API, webhooks e integraciones

Actualmente Bukky tiene API para su propio frontend, no un producto de integración pública. Un add-on necesita credenciales, scopes, versionado, rate limits, webhooks firmados, reintentos, portal y deprecación.

---

# 8. Flujos transversales

## 8.1 Onboarding de un negocio

```text
Superadmin crea tenant
→ invita tenant admin
→ usuario activa cuenta
→ configura perfil del negocio
→ crea servicio
→ crea profesional
→ asigna servicio
→ configura horario
→ realiza reserva de prueba
→ personaliza branding básico
→ comparte enlace/QR
```

Casos alternativos: invitación expirada, slug ocupado, negocio unipersonal, horario vacío, servicio sin profesional, email desactivado, reserva de prueba sin slots.

## 8.2 Cálculo y creación de reserva

```text
Leer tenant público
→ listar servicios activos
→ listar profesionales elegibles
→ calcular slots
→ recopilar contacto
→ verificar captcha
→ enviar Idempotency-Key
→ abrir transacción
→ bloquear/releer datos relevantes
→ revalidar reglas y solapamientos
→ calcular snapshots/precio
→ crear Booking + BookingItem
→ emitir token de gestión
→ commit
→ auditoría/notificaciones/reminders
```

El envío de email no debe hacer rollback de una reserva ya confirmada; debe registrarse y reintentarse.

## 8.3 Reprogramación

```text
Admin o token público autorizado
→ validar estado reprogramable
→ consultar slots
→ elegir horario
→ transacción y lock de reserva
→ revalidar agenda/capacidad excluyendo la propia reserva
→ actualizar tiempos visibles/ocupados
→ auditoría
→ actualizar recordatorios
→ notificar
```

## 8.4 Cambio de estado

```text
PENDING → confirmar/rechazar
CONFIRMED → iniciar/completar/cancelar/no-show
IN_PROGRESS → completar/cancelar/no-show
Final → sin reapertura
```

Cada transición debe declarar: permiso, efecto en disponibilidad, timestamp, actor, motivo, email, reminder y reporting.

## 8.5 Día operativo

```text
Dashboard
→ próximas citas/pendientes
→ tabla o calendario
→ detalle y contacto
→ confirmar/reprogramar
→ iniciar/completar/no-show/cancelar
→ revisar métricas y auditoría
```

---

# 9. Propuesta de MVP vendible

## 9.1 Promesa

> Bukky permite a un negocio publicar sus servicios, recibir citas online sin solapamientos y gestionar su agenda diaria desde un panel sencillo.

## 9.2 Incluido

- una empresa y una ubicación lógica;
- propietario/administrador;
- servicios simples;
- profesionales;
- horarios, descansos y ausencias;
- disponibilidad fiable;
- reserva pública;
- reserva manual;
- confirmación instantánea;
- reprogramación por negocio y cliente;
- cancelación administrativa;
- estados básicos;
- emails transaccionales;
- calendario y listado;
- dashboard mínimo;
- logo/color/enlace/QR;
- MFA y sesiones;
- auditoría interna;
- CI/CD, monitorización y backups.

## 9.3 Simplificar u ocultar al inicio

- party size y capacidad grupal;
- pricing por persona;
- confirmación requerida;
- múltiples servicios por reserva si no está validado por el vertical;
- theme builder avanzado;
- reportes complejos/exportación;
- logs técnicos visibles;
- tours de onboarding extensos;
- configuración global que no sea necesaria para el negocio.

## 9.4 No prometer

- pagos online;
- WhatsApp/SMS nativo;
- panel profesional;
- calendarios externos;
- facturación;
- CRM;
- múltiples sucursales;
- recordatorios multicanal;
- marketplace;
- white-label completo.

# 10. Matriz de madurez y decisión

| Dominio | Madurez | Clasificación | MVP |
|---|---:|---|---|
| Identidad/sesiones/MFA | 3 | soporte obligatorio | incluir |
| Tenant | 3 técnica | núcleo | incluir |
| Administradores | 2.5 | soporte | incluir simple |
| Servicios | 3 | núcleo | incluir simplificado |
| Profesionales | 3 | núcleo | incluir |
| Horarios/ausencias | 2.5 | núcleo | incluir |
| Disponibilidad | 3 | núcleo crítico | incluir y endurecer |
| Reservas/estados | 3 | núcleo crítico | incluir |
| Reserva pública | 3 | núcleo | incluir |
| Autogestión por token | 3 | núcleo diferenciador | incluir reprogramación |
| Confirmación requerida | 2 | subdominio | ocultar inicialmente |
| Email transaccional | 2.5 | núcleo operativo | incluir |
| Recordatorios | 2.5 | add-on | piloto/feature flag |
| Dashboard básico | 2.5 | soporte | incluir reducido |
| Reportes avanzados | 2.5 | add-on | ocultar/reducir |
| Branding básico | 3 | soporte | incluir |
| White-label | 2 | add-on | ocultar avanzado |
| Onboarding | 2 | activación | simplificar |
| Auditoría | 2.5 | transversal | interna/básica |
| Superadministración | 2.5 | operación Wegox | interna |
| Operación/infra | 2.5 | bloqueante | endurecer |
| Pagos | 0 | add-on futuro | no prometer |
| WhatsApp/SMS | 0 | add-on futuro | no prometer |
| Calendar sync | 0 | add-on futuro | no prometer |
| Panel profesional | 0 | add-on futuro | no prometer |

---

# 11. Roadmap propuesto

## Etapa 0 — Verdad del release y congelación (1 semana)

- identificar commit, imagen y migración desplegados;
- ejecutar quality gates completos;
- clasificar fallos existentes;
- congelar add-ons;
- escoger vertical inicial;
- fijar alcance y vocabulario;
- documentar funciones visibles y ocultas.

**Salida:** baseline reproducible y sin dudas sobre producción.

## Etapa 1 — Seguridad y operación (2–3 semanas)

- secretos independientes y fuertes obligatorios en producción;
- readiness de DB y dependencias críticas;
- restore real de backup;
- revisar rate limit multiinstancia;
- confirmar coordinación/idempotencia de cron;
- validar sanitización Sentry;
- smoke tests de login, reserva y reprogramación;
- asegurar que CI Required es realmente obligatorio.

**Salida:** plataforma operable con incidentes y releases controlados.

## Etapa 2 — Camino crítico del MVP (3–6 semanas)

- reducir configuración de servicios al vertical;
- onboarding de checklist;
- negocio unipersonal rápido;
- agenda y excepciones claras;
- pruebas completas de disponibilidad/concurrencia;
- reserva pública móvil/accesible;
- emails y enlaces de gestión;
- estados y cancelación administrativa;
- mensajes de error y empty states;
- ocultar funciones avanzadas.

**Salida:** un negocio puede configurarse y recibir su primera cita sin asistencia técnica.

## Etapa 3 — Piloto con 5–15 negocios (4–8 semanas)

- mismo vertical y país;
- onboarding asistido y cronometrado;
- catálogos/horarios reales;
- seguimiento de reservas creadas, fallidas y reprogramadas;
- medición de no-show y trabajo manual;
- soporte y entrevistas semanales;
- corrección priorizada por impacto.

**Salida:** evidencia de valor y lista de add-ons demandados.

## Etapa 4 — Comercialización

- autoservicio o proceso de venta definido;
- planes y límites;
- trial, activación, suspensión y cancelación;
- términos, privacidad y DPA;
- exportación/eliminación;
- SLO y soporte;
- analítica de producto;
- pentest y prueba de aislamiento tenant.

## Etapa 5 — Add-ons por demanda

Orden recomendado, sujeto a evidencia:

1. recordatorios configurables;
2. confirmación/cancelación y políticas;
3. WhatsApp transaccional;
4. depósitos/pagos;
5. panel profesional;
6. calendarios externos;
7. reporting premium;
8. capacidad/clases;
9. multiubicación;
10. API/webhooks.

No construir varios simultáneamente. Cada add-on requiere feature flag, entitlement de plan, estado por tenant, métricas, soporte y comportamiento cuando se desactiva.

---

# 12. Requisitos arquitectónicos para add-ons

Un dominio solo debe llamarse add-on si cumple:

1. puede habilitarse por tenant sin redeploy;
2. el núcleo funciona correctamente sin él;
3. tiene contrato de entrada/salida claro;
4. no introduce columnas ad hoc en Booking para cada proveedor;
5. fallar no revierte ni bloquea una reserva válida;
6. tiene permisos y configuración propios;
7. tiene observabilidad, reintentos e idempotencia;
8. su desactivación conserva o migra datos de forma definida;
9. puede asociarse a plan/cuota;
10. tiene pruebas del núcleo con feature on y off.

Arquitectura sugerida:

```text
Motor de reservas
→ guarda transacción
→ registra evento/outbox
→ adaptadores consumidores
   ├── email
   ├── reminders
   ├── WhatsApp/SMS
   ├── pagos
   ├── calendar sync
   └── webhooks
```

No hace falta introducir Kafka o microservicios en esta etapa. Un outbox PostgreSQL y workers/jobs idempotentes son suficientes.

# 13. Plantilla obligatoria para futuros PRD

Cada PRD derivado debe contener:

1. nombre, responsabilidad y límite;
2. problema y evidencia;
3. público/personas;
4. jobs to be done;
5. estado actual verificado en código;
6. estado objetivo;
7. no objetivos;
8. entidades, ownership y relaciones;
9. estados y transiciones;
10. flujos felices, alternativos y de error;
11. reglas de negocio y cálculos;
12. matriz de permisos y tenancy;
13. contratos API/eventos/jobs;
14. idempotencia, concurrencia y consistencia;
15. UX, móvil, accesibilidad y estados vacíos/carga/error;
16. seguridad, privacidad y retención;
17. observabilidad y soporte;
18. migración, feature flag y rollout;
19. estrategia de pruebas;
20. métricas y criterios verificables de aceptación;
21. dependencias y secuencia de implementación;
22. deuda o código antiguo que se retira.

### Prompt base para otro agente

```text
Lee completamente `docs/product-domain-baseline.es.md`. Trabaja únicamente
sobre [DXX/A0X — DOMINIO]. Verifica el baseline contra el código antes de
afirmar que algo funciona. Mi objetivo es [OBJETIVO], para [PÚBLICO], con
[RESTRICCIONES/PLAN].

Genera un PRD usando las 22 secciones del capítulo 13. Separa estado actual,
brechas, estado objetivo y migración. No amplíes el alcance hacia otros
dominios: decláralos como dependencias. Después genera épicas, historias
verticales, criterios Given/When/Then, tickets técnicos, dependencias y orden.
Toda mutación debe considerar tenant, permisos, timezone, concurrencia,
idempotencia, auditoría, notificaciones y errores parciales.
```

# 14. Preguntas abiertas de producto

1. ¿Cuál es el primer vertical concreto?
2. ¿Una reserva contiene un servicio o varios en el MVP?
3. ¿Un servicio puede necesitar varios profesionales simultáneos?
4. ¿La elección de profesional es obligatoria o puede ser “cualquiera”?
5. ¿La moneda es única por tenant?
6. ¿El precio es solo informativo hasta añadir pagos?
7. ¿Cuál es la política de cancelación/reprogramación?
8. ¿Cuándo expira el enlace público de gestión?
9. ¿Cuánto tiempo puede permanecer una reserva pendiente?
10. ¿Qué estados necesita realmente el vertical inicial?
11. ¿Se soportan clases/grupos desde el lanzamiento?
12. ¿Se necesita una entidad Customer o bastan snapshots por reserva?
13. ¿Qué datos puede ver un futuro profesional?
14. ¿Cómo se suspende/cancela un tenant?
15. ¿Cuánto tiempo se retienen clientes, reservas y auditoría?
16. ¿Qué incluye cada plan y qué se cobra como add-on?
17. ¿Cuál es el SLA de emails y recordatorios?
18. ¿Se desplegará en Venezuela inicialmente o también España/otros países?
19. ¿Cómo se gestionan zonas horarias para negocio y profesional?
20. ¿Qué volumen de profesionales, servicios y reservas se garantiza?

# 15. Veredicto final

Bukky no presenta el mismo problema estructural que Cataloguer. Su núcleo es reconocible, las entidades principales están alineadas con el trabajo de reservar una cita y las capacidades futuras encajan naturalmente alrededor de ese núcleo.

El riesgo no es que Bukky intente ser hoy cinco SaaS. El riesgo es dejar activas demasiadas variantes del mismo motor —múltiples servicios, grupos, capacidad, confirmación, estados, branding y reporting— antes de validar un vertical concreto. Cada combinación aumenta pruebas y UX sin ampliar necesariamente el valor inicial.

La estrategia recomendada es:

1. mantener intacto el núcleo negocio-servicio-profesional-agenda-disponibilidad-reserva;
2. simplificar sus opciones visibles para un vertical inicial;
3. endurecer seguridad, readiness, jobs y pruebas;
4. pilotar el camino crítico;
5. convertir comunicaciones, pagos, calendarios, panel profesional, reporting y white-label en add-ons explícitos;
6. exigir fronteras técnicas y comerciales antes de llamar add-on a cualquier función.

Bukky está mucho más cerca de un MVP vendible que Cataloguer, pero debe demostrarlo con un release ejecutado, pruebas verdes y pilotos reales. La compacidad del dominio es una ventaja; no sustituye la validación operativa.
