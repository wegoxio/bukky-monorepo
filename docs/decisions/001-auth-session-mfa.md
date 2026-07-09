# ADR 001 - Estrategia de autenticación, sesiones y MFA

## Estado

Aceptada.

## Contexto

La plataforma administra información operativa sensible de negocios: citas, clientes, horarios, empleados, reportes y configuración. Los accesos administrativos deben protegerse más allá de un login básico.

## Decisión

Usar:

- Access token JWT de vida corta.
- Refresh token en cookie HttpOnly.
- Hash del refresh token en base de datos.
- Rotación de refresh token.
- CSRF para flujos autenticados.
- Registro de sesiones activas.
- MFA TOTP con app autenticadora.
- Códigos de recuperación.
- Cierre individual y masivo de sesiones.

## Consecuencias

Ventajas:

- Reduce exposición frente a robo de tokens desde JavaScript.
- Permite revocar sesiones.
- Permite detectar y cerrar dispositivos no reconocidos.
- MFA protege cuentas administrativas aun si una contraseña se filtra.

Costes:

- Más complejidad en login, refresh y logout.
- Requiere UI clara para MFA, recuperación y sesiones.
- Requiere manejar CSRF correctamente.

## Flujos afectados

- Login.
- Refresh.
- Logout.
- MFA setup.
- MFA challenge.
- Cierre de sesiones.
- Cambio de contraseña.
- Cambios sensibles de cuenta.
