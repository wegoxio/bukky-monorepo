# Limitaciones y roadmap

## Limitaciones actuales

- No hay pagos online.
- No hay WhatsApp o SMS nativo.
- No hay panel independiente para profesionales.
- No hay sincronización con Google Calendar, Outlook o Apple Calendar.
- `requires_confirmation` existe, pero aún no tiene flujo diferencial completo.
- El cambio de email administrativo está preparado a nivel UX, pero necesita flujo final de verificación.
- La estrategia S3 directo requiere bucket público de assets.
- Si existen URLs antiguas de CloudFront en base de datos, puede requerirse backfill.
- El calendario actual usa listado de citas por rango; si el volumen crece mucho, conviene crear endpoint agregado específico.

## Próximas mejoras recomendadas

### Seguridad

- Step-up MFA para acciones sensibles.
- Alertas por nuevo inicio de sesión.
- Historial detallado de cambios de configuración sensible.
- Revisión automática de sesiones antiguas.
- OpenAPI estático interno si se necesita compartir documentación sin exponer Swagger en producción.

### UX

- Calendario avanzado entre profesionales.
- Vista de capacidad por servicio.
- Timeline completo por cita alimentado por auditoría.
- Panel propio de profesional.
- Confirmación visual avanzada de reprogramación.
- Preview público del negocio.
- Onboarding guiado para negocios nuevos.

### Funcionalidad

- Pagos online.
- Depósitos o pagos parciales.
- WhatsApp transaccional.
- SMS opcional.
- Sincronización con calendarios externos.
- Recordatorios configurables por negocio.
- Políticas de cancelación por negocio.
- Flujo completo para servicios que requieren confirmación.

### Performance

- Lighthouse y Web Vitals por ruta.
- Trazas de endpoints pesados.
- Presupuestos de bundle por ruta.
- Medición de creación y reprogramación de reservas con k6.
- Endpoint agregado para calendario si hay alto volumen.
- Jobs en background para reportes Excel, recordatorios y futuros webhooks.

## Criterio de priorización

Priorizar en este orden:

1. Seguridad e integridad de reservas.
2. Operación diaria del negocio.
3. Performance de disponibilidad y citas.
4. Comunicación con cliente.
5. Monetización: pagos y depósitos.
6. Integraciones externas.
