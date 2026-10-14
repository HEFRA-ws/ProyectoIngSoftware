# Plan y evidencia de calidad

## Objetivo

Validar que el prototipo registre eventos de forma consistente, proteja el acceso según el rol y conserve información para su investigación. La calidad se comprueba con pruebas automáticas de integración, revisión de código y recorridos manuales de la interfaz.

## Criterios de terminado

1. El comportamiento cumple los criterios de la historia seleccionada.
2. Las entradas obligatorias se validan en cliente y servidor.
3. Las acciones restringidas se autorizan en la API.
4. Las pruebas de regresión relacionadas pasan.
5. Se actualizan la documentación y la issue correspondiente.
6. La funcionalidad puede demostrarse con datos ficticios.

## Pruebas automatizadas

Archivo: `test/api.test.js`. Ejecución: `pnpm test`. La suite utiliza MongoDB temporal aislado, no la base de la demostración.

| Área | Comprobaciones |
| --- | --- |
| Autenticación | Sesión obligatoria, credenciales incorrectas, cuatro roles, cookie HttpOnly, cierre de sesión |
| Seguridad | Hash no expuesto, separación por propietario, prohibición de cambios no autorizados, origen cruzado, límite de intentos |
| Registro | Campos obligatorios, fecha inválida/futura, tipo permitido, código, personas e historial |
| Investigación | Clasificación previa, prohibición de duplicado, causas y conclusión persistidas |
| Evidencia | Tipo falso, tamaño excesivo, consulta de metadatos, descarga binaria, bloqueo del coordinador |

La suite contiene 16 casos de comprobación, agrupados en una prueba principal. Node Test Runner contabiliza también el grupo, por lo que informa 17 pruebas en total.

## Revisión manual

Se revisan login, creación del reporte, clasificación, investigación, búsqueda y visualización en escritorio y ancho móvil. La evidencia visual se conserva en `docs/imagenes/` cuando está disponible. La prueba manual no sustituye las comprobaciones de permisos de la API.

## Defecto identificado

[Issue #1](https://github.com/HEFRA-ws/ProyectoIngSoftware/issues/1): la ruta para adjuntar evidencia autorizaba la lectura del caso, pero no excluía al coordinador de la escritura. Corrección: bloqueo explícito en la API y prueba de regresión esperando HTTP 403.

## Límites de validación

No se han ejecutado pruebas de 50 usuarios concurrentes, auditoría externa de seguridad, medición de disponibilidad ni verificación de cumplimiento legal. No se afirma un 99 % de disponibilidad ni tiempos máximos de respuesta sin medirlos. El entorno cloud debe verificarse después del despliegue.
