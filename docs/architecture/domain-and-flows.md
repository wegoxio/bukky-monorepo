# Dominio funcional y flujos reales

## Entidades principales

- `Tenant`
- `User`
- `AuthSession`
- `AuthMfaChallenge`
- `Service`
- `Employee`
- `Booking`
- `BookingItem`
- `EmployeeScheduleRule`
- `EmployeeScheduleBreak`
- `EmployeeTimeOff`
- `BookingReminder`
- `AuditLog`
- `TenantSetting`
- `PlatformSetting`

## Negocio

`Tenant` representa un negocio.

Datos visibles/editables:

- Nombre.
- Email público.
- Teléfono.
- Dirección.
- Ciudad.
- Estado.
- País.
- Código postal.

La configuración actual fija Venezuela como país objetivo inicial.

## Servicio

`Service` define qué puede reservar el cliente.

Campos relevantes:

- Nombre, descripción e instrucciones.
- Duración.
- Buffers antes y después.
- Precio.
- Divisa.
- Modelo de precio `FLAT` o `PER_PERSON`.
- Tamaño mínimo y máximo del grupo.
- Capacidad por slot.
- Confirmación requerida.
- Antelación mínima.
- Ventana máxima de reserva.
- Profesionales asignados.
- Estado activo/inactivo.

## Cita

`Booking` representa una reserva.

Campos relevantes:

- Negocio.
- Profesional.
- Estado.
- Inicio y fin visibles.
- Inicio y fin ocupados incluyendo buffers.
- Cantidad de personas.
- Precio total calculado por backend.
- Divisa.
- Datos del cliente.
- Fuente.
- Token público de gestión.
- Clave de idempotencia.
- Timestamps de creación, cancelación, completado y reprogramación.

## Snapshot histórico

`BookingItem` conserva snapshots del servicio:

- Nombre.
- Duración.
- Buffers.
- Precio.
- Divisa.
- Modelo de precio.
- Precio unitario.
- Cantidad.
- Total de línea.
- Instrucciones.

Editar un servicio después de crear una cita no modifica el histórico de esa cita.

## Estados de cita

Estados que bloquean disponibilidad:

- `PENDING`
- `CONFIRMED`
- `IN_PROGRESS`

Estados finales:

- `COMPLETED`
- `CANCELLED`
- `NO_SHOW`

Una cita finalizada no debe reabrirse sin un flujo explícito futuro.

## Disponibilidad

La disponibilidad se calcula con:

- Horarios activos del profesional.
- Descansos.
- Ausencias.
- Duración de servicios.
- Buffers.
- Citas bloqueantes existentes.
- Capacidad total del slot.
- Personas ya ocupando capacidad.
- Antelación mínima.
- Ventana máxima de reserva.

El backend revalida disponibilidad dentro de la transacción al crear o reprogramar una cita.

## Idempotencia

La creación pública de reservas usa `Idempotency-Key`.

Flujo:

1. Cliente confirma una reserva.
2. La red falla después del request.
3. El navegador reintenta con la misma clave.
4. El backend devuelve la misma reserva en vez de duplicarla.

## Pricing

### `FLAT`

Precio fijo por reserva.

Ejemplo:

```text
Servicio: Corte clásico
Precio: 18 USD
Personas: 3
Total: 18 USD
```

### `PER_PERSON`

Precio por persona.

Ejemplo:

```text
Servicio: Clase grupal
Precio unitario: 10 USD
Personas: 4
Total: 40 USD
```

## Capacidad

Si un servicio tiene `slot_capacity = 5`:

1. Una reserva de 2 personas ocupa 2 cupos.
2. Otra reserva de 3 personas puede compartir el horario.
3. Una tercera reserva no entra porque no queda capacidad.

## Flujo público: cliente crea una cita

1. Cliente abre `/book/barberia-demo`.
2. Selecciona servicio.
3. Selecciona profesional.
4. Selecciona fecha y hora.
5. Completa nombre, email, teléfono y notas.
6. Turnstile valida si está activo.
7. Frontend envía reserva con `Idempotency-Key`.
8. Backend valida disponibilidad y capacidad.
9. Backend crea cita y snapshots.
10. Cliente ve confirmación.
11. Cliente recibe email con detalles, dirección y enlace de gestión.
12. Profesional recibe email operativo.

## Flujo público: cliente reprograma desde email

1. Cliente abre el enlace seguro del email.
2. Frontend carga la cita mediante token.
3. Cliente selecciona nuevo horario.
4. Backend valida token, estado, disponibilidad y capacidad.
5. Cita queda reprogramada.
6. Se actualizan notificaciones y auditoría.

## Flujo operativo: negocio reprograma por WhatsApp

1. Cliente escribe al negocio solicitando cambio.
2. Administrador entra a Citas.
3. Busca la cita.
4. Ejecuta acción de reprogramar.
5. Selecciona nuevo horario.
6. Backend valida reglas.
7. Cita queda actualizada.

## Flujo operativo: detalle de cita

1. Administrador entra a Citas.
2. Pulsa "Ver detalle".
3. Revisa cliente, contacto, servicios, profesional, horario, estado, notas y precio.
4. Consulta timeline básico.
5. Copia resumen para WhatsApp si necesita coordinar manualmente.
6. Ejecuta acciones rápidas según estado.

## Flujo operativo: calendario

1. Administrador entra a Citas.
2. Cambia de Tabla a Calendario.
3. Selecciona vista mensual, semanal o diaria.
4. Selecciona un día con actividad.
5. Revisa volumen, personas y estados.
6. Abre una cita desde el calendario.
7. Si corresponde, arrastra una cita pendiente o confirmada a otro horario.
8. Backend valida disponibilidad, capacidad y reglas antes de guardar.

## Emails transaccionales

### Cliente

Recibe:

- Negocio.
- Servicio.
- Profesional.
- Fecha y hora.
- Duración.
- Total.
- Estado.
- Teléfono público del negocio.
- Email público del negocio.
- Dirección.
- Enlace "Cómo llegar" hacia Google Maps.
- Enlace seguro de gestión.

No recibe IDs internos ni datos administrativos.

### Profesional

Recibe:

- Cliente.
- Servicio.
- Fecha y hora.
- Duración.
- Notas relevantes.
- Datos necesarios para atender.

### Administrador de negocio

No recibe todos los emails de cada cita por defecto. La operación diaria se centraliza en dashboard, citas y logs.

## Limitaciones actuales

- No hay pagos online.
- No hay WhatsApp/SMS nativo.
- No hay panel independiente para profesionales.
- No hay sincronización con calendarios externos.
- `requires_confirmation` existe, pero aún no tiene flujo diferencial completo.
- El cambio de email administrativo está preparado a nivel UX, pero requiere flujo final de verificación para automatizarse.
