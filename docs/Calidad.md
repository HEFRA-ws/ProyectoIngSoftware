# Calidad y evidencia de validación

Versión 0.2. Objetivo: proteger la declaración inicial, separar eventos e informes y verificar las operaciones por rol.

## Criterios de terminado

Cumplir criterios de aceptación, validar entradas en servidor, aplicar permisos, pasar pruebas relacionadas, revisar interfaz y actualizar documentación. Las historias parciales conservan sus pendientes.

## Pruebas de integración

Ejecución: `pnpm test`. Archivo: `test/api.test.js`. Base MongoDB aislada y servidor temporal; no utiliza la base de la demostración.

La suite actual contiene **29 casos de comprobación**, agrupados en una prueba principal; Node Test Runner informa **30 pruebas** contando el grupo.

| Área | Evidencia |
| --- | --- |
| Migración | Conserva código, declaración e historial; cambia referencia de evidencia; repetición idempotente |
| Autenticación | Sesión obligatoria, credenciales incorrectas, roles, cookie HttpOnly, limitación y logout |
| Evento | Campos, fecha válida no futura, personas, código y actividad |
| Propiedad y permisos | Aislamiento de eventos e informes; bloqueo de cambios por trabajador/coordinador |
| Verificación | Solo SST; Leve, Grave, Mortal; rechazo de Muy grave y de gravedad en incidentes |
| Investigación | Verificación previa y persistencia de causas e historial para ambos tipos |
| Informe | No se crea automáticamente; exige accidente verificado; validación de catálogos y campos |
| Concurrencia | Creación simultánea produce un informe y un conflicto; versiones obsoletas devuelven 409 |
| Emisión | Documento Emitido protegido; no cierra evento ni reemplaza declaración |
| Evidencia | Tamaño y cabecera, metadatos, descarga autorizada y bloqueo al coordinador |

## Recorrido manual v0.2

Login trabajador, registro de accidente ficticio con actividad, consulta sin informe; cambio a SST, verificación leve, creación de borrador y emisión. Se comprobó que la declaración inicial y el historial del evento se mantienen separados del documento emitido.

La interfaz incorpora navegación Eventos e Informes SST. Las capturas de la versión 0.1 se conservan como evidencia histórica; las nuevas capturas se identifican como v0.2.

## Defectos y regresión

Issue #1: carga de evidencia del coordinador bloqueada en API y cubierta por regresión. Se conservan las pruebas negativas al añadir el informe independiente.

## Límites

Pendientes: carga de 50 usuarios, accesibilidad exhaustiva, antivirus, auditoría externa, respaldo/restauración y verificación del despliegue. No se afirma 99 % de disponibilidad ni tiempos máximos medidos. La existencia del workflow no acredita éxito: comprobar cada ejecución en GitHub Actions.
