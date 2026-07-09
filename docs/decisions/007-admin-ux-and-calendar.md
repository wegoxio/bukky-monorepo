# ADR 007 - UX administrativa, configuración por secciones y calendario operativo

## Estado

Aceptada.

## Contexto

El panel administrativo acumulaba demasiada información en vistas densas. Para un producto de reservas, las citas necesitan una experiencia operativa clara, no solo tablas.

## Decisión

Implementar:

- Configuración con sidebar interno.
- Secciones: General, Theme builder y Seguridad.
- Datos editables del negocio en General.
- MFA y sesiones en Seguridad.
- Citas con vista Tabla y Calendario.
- Calendario mensual, semanal y diario.
- Detalle operativo de cita.
- Acciones rápidas agrupadas.
- QR del enlace público en Configuración General.
- Textos visibles no técnicos para usuarios finales.

## Reglas UX

- No usar términos internos como "tenant" en superficies visibles.
- No mostrar errores técnicos crudos como `NetworkError`.
- No usar IDs como información principal.
- Estados vacíos deben proponer acción.
- Filtros deben poder limpiarse.
- Tablas con muchas acciones deben agruparse de forma ordenada.

## Consecuencias

Ventajas:

- Menos ruido visual.
- Operación diaria más rápida.
- Mejor soporte a flujos reales por WhatsApp.
- Menos dependencia de entender términos técnicos.

Costes:

- Más componentes UI que mantener.
- El calendario necesita endpoint agregado si el volumen mensual supera la paginación actual.

## Próximo paso recomendado

Crear un endpoint agregado para calendario si aparecen negocios con más de 100 citas por periodo visible.
