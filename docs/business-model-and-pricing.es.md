# Bukky Booking — modelo de negocio, pricing y unit economics

> Propuesta de trabajo basada en el producto existente y su baseline de dominios.
>
> Fecha de corte: 13 de octubre de 2026. Los precios de competidores y proveedores cambian; deben revisarse antes de publicar una oferta comercial.

## 1. Decisión ejecutiva

Bukky debería comercializarse como un SaaS B2B de suscripción para negocios de servicios con cita previa. El modelo recomendado combina:

1. **cuota mensual predecible** por etapa/tamaño del negocio;
2. **profesionales reservables activos** como métrica principal de valor;
3. **reservas mensuales incluidas** como límite de uso y protección operativa, no como impuesto por cada venta;
4. **costes variables externos** —SMS, WhatsApp, pagos— como consumo o add-on;
5. **onboarding/migración opcional** como servicio profesional;
6. descuento anual moderado para mejorar caja y retención.

No se recomienda cobrar un porcentaje de todos los importes mostrados en Bukky mientras los pagos ocurran fuera de la plataforma. `Booking.total_price` es una estimación comercial: no demuestra cobro, devolución, descuento presencial, impuesto ni ingreso neto.

Tampoco se recomienda un plan gratuito permanente durante la fase inicial. Un producto joven necesita soporte y onboarding, y todavía no existe suficiente automatización para que miles de cuentas gratuitas tengan coste marginal cercano a cero.

## 2. Qué se vende

### Resultado principal

> Bukky ayuda a un negocio a recibir citas online sin solapamientos y a gestionar su agenda diaria desde un único lugar.

El cliente no compra “pantallas” ni “software de agenda”. Compra:

- menos mensajes manuales para coordinar horarios;
- disponibilidad 24/7 para reservar;
- reducción de errores y dobles reservas;
- menos tiempo administrativo;
- mejor experiencia para el cliente;
- historial operativo;
- más probabilidad de ocupar huecos disponibles;
- en el futuro, reducción de no-shows mediante recordatorios/depósitos.

### Producto base

- negocio y página/enlace público;
- servicios;
- profesionales;
- horarios, descansos y ausencias;
- disponibilidad;
- reserva pública y manual;
- calendario/listado;
- estados;
- reprogramación;
- emails transaccionales;
- configuración y branding básico;
- seguridad, backups, integridad y soporte estándar.

Seguridad, aislamiento de datos, backups, disponibilidad, correcciones e integridad de reservas **no son add-ons**. Son obligaciones del producto base.

## 3. Cómo deben convertirse los dominios futuros en add-ons

### 3.1 Add-ons de valor

El coste técnico marginal puede ser pequeño, pero aportan mayor valor al negocio y permiten subir ARPA:

- reporting avanzado;
- panel del profesional;
- white-label y dominio personalizado;
- múltiples ubicaciones;
- clases/capacidad avanzada;
- confirmaciones y políticas avanzadas;
- API y webhooks;
- integraciones con calendarios.

Pueden incluirse en planes superiores o venderse por separado.

### 3.2 Add-ons de consumo

Tienen un coste externo proporcional al uso y deben incluir allowance + overage o ser pay-as-you-go:

- SMS;
- WhatsApp;
- email de marketing;
- almacenamiento extraordinario;
- IA/voz;
- exportaciones o procesos pesados si llegan a generar coste relevante.

### 3.3 Add-ons transaccionales

- pagos;
- depósitos;
- devoluciones;
- protección frente a no-show.

Aquí puede cobrarse una pequeña tarifa de plataforma, pero solo sobre pagos realmente procesados por Bukky y separando claramente la comisión del procesador.

### 3.4 Capacidades que nunca deben bloquearse por plan

- MFA básico y seguridad de cuenta;
- cifrado;
- protección CSRF/CORS/rate limiting;
- backups;
- exportación necesaria para ejercer derechos de datos;
- aislamiento multi-tenant;
- consistencia de reservas;
- correcciones de vulnerabilidades;
- logs internos necesarios para soporte.

## 4. Métrica de valor y forma de cobrar

### Métrica principal: profesionales reservables activos

Es fácil de entender, se correlaciona con capacidad económica y no castiga directamente cada cita. Debe definirse como:

> Empleado activo, asociado al menos a un servicio activo y disponible para aparecer o ser utilizado en reservas durante el periodo.

No cobrar por usuarios administrativos en las primeras etapas. Cobrar por asiento administrativo crea fricción para recepción o gerencia sin aumentar necesariamente el valor.

### Métrica secundaria: reservas creadas por mes

Sirve para:

- impedir abuso;
- relacionar plan con volumen;
- anticipar capacidad;
- controlar comunicaciones;
- sugerir upgrade.

Debe contar reservas creadas, no requests ni reintentos idempotentes. Las canceladas pueden seguir contando porque consumieron disponibilidad, almacenamiento, emails y operación. Las reservas de prueba claramente marcadas podrían excluirse.

### Métricas de consumo

- mensajes enviados;
- emails transaccionales;
- almacenamiento;
- llamadas API/webhooks;
- pagos procesados;
- ubicaciones.

## 5. Propuesta de planes

Los siguientes precios son hipótesis de lanzamiento en USD, antes de impuestos. Deben validarse con entrevistas y pilotos pagados.

| Plan | Precio mensual | Precio anual | Profesionales | Reservas/mes | Posicionamiento |
|---|---:|---:|---:|---:|---|
| Solo | $15 | $150 | 1 | 150 | autónomo o cabina individual |
| Equipo | $35 | $350 | hasta 5 | 600 | barbería/salón/consulta pequeña |
| Crecimiento | $69 | $690 | hasta 15 | 2.000 | negocio consolidado con equipo |
| Empresa | desde $129 | contrato | 16+, varias ubicaciones futuras | negociado | operación compleja y soporte acordado |

El anual equivale aproximadamente a dos meses gratis. Durante validación podría ofrecerse 15–17% en lugar de 20%; lo importante es no erosionar margen sin obtener compromiso.

### 5.1 Solo — $15/mes

Incluye:

- producto base completo;
- 1 profesional;
- 150 reservas/mes;
- servicios esenciales;
- página/enlace y QR;
- reserva manual/pública;
- reprogramación;
- emails transaccionales;
- calendario/listado;
- dashboard básico;
- soporte por email.

No debe ser artificialmente inseguro ni inútil. El objetivo es conseguir que un autónomo pague porque ahorra tiempo, no forzarlo a subir por una función básica.

### 5.2 Equipo — $35/mes

Incluye Solo más:

- hasta 5 profesionales;
- 600 reservas/mes;
- múltiples administradores razonables;
- recordatorios email configurables;
- confirmación requerida cuando esté terminada;
- reportes básicos ampliados;
- exportación operativa;
- branding adicional;
- soporte prioritario ligero.

Este debería ser el plan recomendado y el principal generador de ingresos.

### 5.3 Crecimiento — $69/mes

Incluye Equipo más:

- hasta 15 profesionales;
- 2.000 reservas/mes;
- capacidad/clases cuando estén terminadas;
- reporting avanzado;
- roles/panel profesional cuando estén terminados;
- integraciones de calendario incluidas hasta un límite;
- branding premium;
- webhooks/API con cuotas;
- soporte con respuesta objetivo.

No anunciar estas funciones antes de estar disponibles. Mientras se desarrollan, el plan no debe publicarse o debe mostrar únicamente capacidades reales.

### 5.4 Empresa

Solo por venta consultiva:

- múltiples ubicaciones;
- volumen elevado;
- onboarding/migración;
- contratos y DPA personalizados;
- SSO o requisitos regulatorios;
- límites API especiales;
- SLA y soporte;
- configuración y formación.

## 6. Add-ons y precios orientativos

| Add-on | Modelo recomendado | Precio inicial orientativo |
|---|---|---:|
| Recordatorios email avanzados | incluido desde Equipo | $0 independiente al principio |
| WhatsApp/SMS | allowance + consumo | coste proveedor + 25–40% de margen |
| Calendar sync | por profesional conectado | $4–6/profesional/mes |
| Panel profesional | incluido en Crecimiento o por asiento | $4–6/profesional/mes |
| Reporting avanzado | por tenant | $10–15/mes |
| White-label | por tenant | $15–25/mes |
| Dominio personalizado | anual o mensual | $5–10/mes más dominio |
| Ubicación adicional | por ubicación | $20–35/mes |
| API/webhooks | cuota incluida + overage | desde $15/mes |
| Setup asistido Solo | pago único | $49–99 |
| Setup/migración Equipo | pago único | $149–299 |
| Migración compleja | presupuesto | desde $499 |

No lanzar ocho add-ons al mismo tiempo. Empezar por los que tengan demanda pagada repetida.

## 7. Overage y upgrades

### Reservas adicionales

Propuesta inicial:

- aviso al 80%;
- aviso y recomendación de upgrade al 100%;
- grace del 10% durante un mes;
- después, upgrade o paquete de 100 reservas por $5;
- nunca bloquear una reserva que el cliente final está confirmando sin aviso previo al negocio.

El paquete de $5/100 está alineado con el orden de magnitud del mercado: SimplyBook.me publica paquetes adicionales de 100 reservas por $4.

### Profesionales adicionales

Evitar combinaciones difíciles. Si se supera el número del plan:

- permitir grace breve;
- sugerir el siguiente plan;
- opcionalmente cobrar $7–10 por profesional adicional si el salto de plan fuera desproporcionado.

No permitir que add-ons conviertan indefinidamente un plan inferior en uno superior más barato.

### Downgrade

Un downgrade nunca debe borrar datos. Debe:

- impedir activar nuevos profesionales si excede el límite;
- conservar históricos;
- permitir elegir qué profesionales siguen activos;
- conservar configuración de add-ons desactivados durante una retención definida;
- explicar qué deja de funcionar al final del ciclo.

## 8. ¿Cómo ajustar la cuota al volumen económico del comercio?

### 8.1 No facturar directamente por “ingreso estimado”

Bukky puede calcular:

```text
GMV reservado = suma de total_price de reservas creadas
GMV completado = suma de total_price de reservas COMPLETED
```

Pero ninguno equivale necesariamente a ingreso real. El cliente puede:

- cobrar otro importe;
- aplicar descuentos;
- recibir efectivo;
- no cobrar un no-show;
- devolver dinero;
- incluir impuestos;
- marcar estados de forma incorrecta.

Hasta integrar pagos o conciliación, el GMV debe llamarse **valor estimado de citas completadas**, nunca facturación contable.

### 8.2 Índice interno de asequibilidad

```text
ratio_bukky = cuota_mensual / valor_estimado_citas_completadas
```

Guía inicial:

| Ratio | Lectura |
|---:|---|
| < 0,5% | Bukky probablemente está capturando poco valor; puede haber espacio para upsell |
| 0,5–1,5% | zona saludable para negocio activo |
| 1,5–3% | aceptable si ahorra trabajo o reduce no-show |
| > 3% | cuota probablemente pesada; revisar plan, uso y activación |
| sin citas completadas | problema de onboarding/adopción, no oportunidad de cobro |

Estas bandas son una hipótesis y deben validarse. No deben generar automáticamente una factura.

### 8.3 Regla más comprensible para el cliente

El precio mensual debería costar menos que:

- una cita promedio recuperada;
- o una/dos horas del trabajo administrativo ahorrado;
- o una fracción clara del coste de un no-show evitado.

Ejemplos:

| Negocio | Actividad completada estimada | Plan | Ratio |
|---|---:|---:|---:|
| Barbero solo: 80 citas × $12 | $960 | $15 | 1,56% |
| Salón: 300 citas × $20 | $6.000 | $35 | 0,58% |
| Clínica pequeña: 450 citas × $35 | $15.750 | $69 | 0,44% |

En el tercer caso, cobrar $69 puede ser conservador; el plan se justifica también por profesionales, permisos, soporte y riesgo operativo.

### 8.4 Señales para recomendar un plan

Usar los últimos 2–3 meses, no un único mes:

- profesionales activos;
- reservas creadas/completadas;
- valor estimado completado;
- emails/mensajes;
- ubicaciones;
- funciones utilizadas;
- minutos de soporte;
- picos de concurrencia.

No usar datos del negocio para aumentar precios de forma opaca. Mostrar siempre el límite que produjo la recomendación.

## 9. Unit economics

### 9.1 Definiciones

```text
MRR = suma de suscripciones mensuales normalizadas
ARPA = MRR / tenants de pago activos
COGS = infraestructura + proveedores variables + soporte directo
Margen bruto = (MRR - COGS) / MRR
Churn = clientes perdidos / clientes al inicio del periodo
LTV aproximado = ARPA × margen bruto / churn mensual
CAC payback = CAC / (ARPA × margen bruto)
```

Objetivo inicial prudente:

- margen bruto > 75%;
- objetivo posterior > 80%;
- CAC payback < 6–9 meses en venta asistida;
- churn mensual < 3–5% una vez estabilizado;
- ARPA inicial objetivo: $25–40.

### 9.2 Coste mínimo de un plan

```text
coste_tenant =
  infraestructura_compartida / tenants_activos
  + email_y_mensajes
  + almacenamiento
  + pagos/proveedores
  + minutos_soporte × coste_por_minuto

precio_mínimo = coste_tenant / (1 - margen_objetivo)
```

Si atender un tenant cuesta $6/mes y se busca 80% de margen:

```text
$6 / (1 - 0,80) = $30
```

Esto demuestra por qué el soporte manual, no Cloud Run, puede definir el precio mínimo.

### 9.3 Costes de infraestructura observables

El repositorio no contiene el tamaño real de los servicios Cloud Run ni de PostgreSQL: el pipeline actualiza servicios existentes. Por tanto, no puede calcularse la factura exacta desde código.

Referencias públicas a octubre de 2026:

- Cloud Run ofrece 2 millones de requests gratuitos al mes y cobra por CPU/memoria facturada; con scale-to-zero el coste inicial puede ser bajo: <https://cloud.google.com/run/pricing>.
- Cloud SQL `db-f1-micro` en `us-central1` aparece a $0,0105/hora —aproximadamente $7,67 por 730 horas— y `db-g1-small` a $0,035/hora —aproximadamente $25,55—, sin incluir storage/backups/red y sin SLA para shared-core: <https://cloud.google.com/sql/pricing>.
- Resend ofrece 3.000 emails/mes gratis con límite diario y un plan Pro de $20/mes para 50.000; overage publicado de $0,90/1.000: <https://resend.com/pricing>.

La base de datos, soporte y observabilidad serán probablemente costes mínimos más importantes que el cómputo de Cloud Run en la fase temprana.

### 9.4 Escenario de referencia, no presupuesto

| Etapa | Tenants pago | ARPA | MRR | Comentario |
|---|---:|---:|---:|---|
| Piloto | 10 | $20 | $200 | no cubre desarrollo; valida disposición a pagar |
| Inicio | 50 | $27 | $1.350 | debe cubrir infraestructura y parte de soporte |
| Tracción | 100 | $32 | $3.200 | ya permite medir cohortes y soporte real |
| Escala pequeña | 300 | $38 | $11.400 | exige billing, soporte y observabilidad maduros |

No confundir ingresos con rentabilidad: salarios, ventas, impuestos y desarrollo no forman parte del margen bruto de infraestructura, pero sí del resultado del negocio.

## 10. Benchmark de mercado

El objetivo no es copiar competidores, sino comprobar que la propuesta está en un rango creíble.

### SimplyBook.me

Publica $13,90 mensual para Basic con 100 reservas/5 providers, $29,90 para Standard con 500/15 y $59,90 para Premium con 2.000/30. También vende SMS/WhatsApp y reservas adicionales: <https://simplybook.me/en/pricing>.

### Fresha

Publica $19,95/mes para un independiente y $14,95 por profesional reservable para equipos; además cobra ciertos mensajes, pagos y add-ons: <https://www.fresha.com/pricing>.

### Acuity Scheduling

Publica precios mensuales de $20, $34 y $61 —o $16, $27 y $49 con facturación anual— según calendarios y funciones: <https://www.acuityscheduling.com/pricing/>.

### Setmore

Publica plan gratuito y Pro alrededor de $5 por usuario/mes con facturación anual, incluyendo funciones maduras que Bukky aún no tiene: <https://www.setmore.com/pricing>.

### Lectura

Los planes propuestos de $15/$35/$69 son defendibles si Bukky ofrece una experiencia adaptada al mercado objetivo, soporte cercano y un motor fiable. No es razonable competir solo por precio contra productos globales más maduros. La ventaja debe venir de:

- simplicidad;
- idioma/mercado;
- onboarding;
- soporte;
- adecuación al flujo local;
- comunicación/pagos regionales futuros;
- cercanía y personalización razonable.

## 11. Trial, descuentos y lanzamiento

### Trial

Recomendado:

- 14 días;
- sin tarjeta durante piloto o con tarjeta cuando el billing sea sólido;
- máximo 1–3 profesionales;
- reservas reales permitidas;
- checklist de activación;
- recordatorios de expiración;
- exportación disponible.

El trial debe empezar cuando el negocio tenga configuración utilizable, no necesariamente al crear la cuenta si Wegox realiza onboarding manual.

### Founding customers

- máximo 10–20 negocios;
- 30–40% de descuento durante 6–12 meses;
- alcance y soporte explícitos;
- permiso para entrevistas, no obligación de testimonio positivo;
- sin precio vitalicio ilimitado;
- migración/setup a precio reducido a cambio de feedback.

### Plan gratuito

No al inicio. Considerarlo después si existen:

- onboarding autoservicio;
- soporte documental;
- coste medido;
- conversión demostrada;
- antiabuso;
- borrado automático de cuentas inactivas;
- canal de adquisición que lo justifique.

## 12. Billing y ciclo de vida necesarios

Bukky no tiene actualmente un dominio de suscripción comercial. Antes de automatizar cobros hay que diseñar:

### Entidades

- `Plan` y versiones de plan;
- `Feature`/capability;
- `PlanEntitlement`;
- `TenantSubscription`;
- `TenantEntitlementOverride`;
- `UsageCounter` por periodo;
- `BillingCustomer` y referencias del proveedor;
- `BillingEvent/WebhookRecord` idempotente;
- `Invoice` de la suscripción si corresponde;
- `AddOnSubscription`;
- `Trial`/grace/suspensión.

### Estados de suscripción

```text
TRIALING
→ ACTIVE
→ PAST_DUE
→ GRACE
→ SUSPENDED
→ CANCELLED
```

Definir también reactivación, cambio de plan, cancelación al final del periodo, impago y pago manual.

### Enforcement

- siempre en backend;
- frontend solo explica/oculta;
- no borrar datos por downgrade;
- no bloquear acceso a exportación y facturación propia;
- reserva pública durante impago debe seguir una política explícita;
- feature flags de rollout no son lo mismo que entitlements comerciales.

## 13. Instrumentación necesaria

Sin telemetría de costes no existe pricing responsable.

### Por tenant y periodo

- profesionales activos;
- servicios activos;
- reservas creadas/completadas/canceladas/no-show;
- valor estimado reservado/completado;
- requests públicos y privados;
- slots consultados;
- emails intentados/entregados/fallidos;
- mensajes por canal;
- storage/egress;
- exportaciones;
- uso de add-ons;
- tickets y minutos de soporte;
- incidencias atribuibles al tenant;
- errores y latencia.

### FinOps mensual

- exportar billing de GCP/AWS/Sentry/Resend;
- separar coste fijo y variable;
- asignar tags/labels por entorno;
- calcular coste por tenant activo y por 1.000 reservas;
- alertas de presupuesto;
- revisar top consumers;
- no repercutir un pico hasta confirmar que no fue un bug propio.

## 14. Política de fair use

Los límites deben ser visibles y comprensibles. Prohibir:

- scraping o abuso deliberado;
- usar Bukky como plataforma de envío masivo no autorizado;
- almacenamiento ajeno al producto;
- automatizaciones que degraden el servicio;
- compartir una cuenta/tenant entre negocios independientes para evitar planes.

Aplicar primero aviso y colaboración; limitar solo cuando sea necesario para seguridad o continuidad.

## 15. Métricas del negocio SaaS

### Activación

- tenant completa datos;
- crea servicio;
- crea profesional;
- configura horario;
- recibe primera reserva real;
- recibe cinco reservas en 30 días.

### Uso/valor

- reservas por profesional;
- porcentaje público vs manual;
- tasa de finalización;
- reprogramación;
- cancelación/no-show;
- tiempo hasta primera reserva;
- ratio Bukky/valor completado;
- horas administrativas estimadas ahorradas.

### Comercial

- trial → pago;
- ARPA;
- MRR/new/expansion/contraction/churned MRR;
- logo churn y revenue churn;
- add-on attach rate;
- CAC y payback;
- LTV;
- margen bruto;
- tickets de soporte por tenant.

## 16. Qué no hacer

- cobrar porcentaje sobre ingresos presenciales no verificables;
- precio personalizado opaco según lo que parezca ganar el cliente;
- planes basados en muchas funciones arbitrarias difíciles de explicar;
- bloquear seguridad o backups en planes baratos;
- ofrecer ilimitado sin fair use;
- publicar funciones futuras dentro de planes activos;
- regalar onboarding humano ilimitado;
- construir billing antes de definir estados y entitlements;
- lanzar plan gratuito por imitación;
- prometer reducción de no-show sin medirla;
- usar el importe de reserva como contabilidad.

## 17. Experimentos de validación

### Entrevista de precio

Para 15–20 negocios del vertical elegido:

- cuánto vale una cita promedio;
- cuántas citas/profesionales tienen;
- cuánto tiempo coordinan manualmente;
- coste de un no-show;
- software actual;
- precio que parece barato/razonable/caro/demasiado caro;
- qué función haría pagar hoy.

### Piloto pagado

Probar al menos tres cohortes:

- Solo: $9–15;
- Equipo: $25–35;
- Equipo con onboarding: $35 + setup.

No regalar todos los pilotos: una prueba gratuita valida uso; un pago, aunque reducido, valida negocio.

### Criterio para cambiar precios

Revisar después de:

- 20 clientes de pago;
- tres meses completos;
- datos de soporte y uso;
- entrevistas de churn y conversión.

Proteger el precio de clientes existentes durante un periodo comunicado, sin prometerlo de por vida.

## 18. Roadmap comercial/técnico

### Fase 1 — Manual controlada

- planes en contrato/documento;
- facturación/cobro manual;
- límites monitorizados, no bloqueados automáticamente;
- 10–20 founding customers;
- cálculo mensual de unit economics.

### Fase 2 — Entitlements

- modelo Plan/Subscription/Entitlement/Usage;
- enforcement server-side;
- trial y grace;
- portal interno de superadmin;
- emails de límites y renovación.

### Fase 3 — Billing automático

- proveedor compatible con mercados objetivo;
- checkout/portal;
- webhooks idempotentes;
- prorrateo;
- impuestos/facturas;
- dunning;
- cancelación y reactivación.

### Fase 4 — Add-ons medidos

- reminders;
- comunicaciones;
- calendar sync;
- reporting/white-label;
- pagos.

Cada add-on se lanza solo cuando se conoce su COGS y disposición a pagar.

## 19. Recomendación final

Bukky debe cobrar por la capacidad operativa que entrega, no intentar adivinar los beneficios del cliente. El modelo más coherente es:

```text
suscripción por tamaño del equipo
+ límite amplio de reservas
+ consumos externos
+ add-ons de valor
+ onboarding opcional
```

El ratio entre cuota y valor estimado de citas completadas sirve para cuidar la salud económica del cliente, segmentar y recomendar planes; no para ajustar precios en secreto.

La hipótesis inicial recomendada es lanzar Solo a $15 y Equipo a $35, mantener Crecimiento sin publicar hasta que sus capacidades estén terminadas y usar pilotos pagados para validar precio. El mayor coste temprano probablemente será soporte/onboarding y desarrollo, no el cómputo. Medir esos minutos desde el primer cliente es tan importante como medir reservas.

El modelo debe revisarse con datos reales. Ningún spreadsheet sustituye saber cuánto cuesta activar, atender y retener a un negocio y cuánto valor percibe ese negocio después de usar Bukky durante varios meses.
