# Despliegue en Render y MongoDB Atlas

Último código funcional verificado: 22 de noviembre de 2026, 23:22 de Colombia, en https://vigia-sst-io46.onrender.com (commit 9fe790f), con MongoDB Atlas. La validación acumuló 68 comprobaciones HTTP sobre 0612796 y otras 24 tras el redespliegue de 9fe790f, además del acceso real con Google; véase [Calidad](Calidad.md). Los cambios posteriores que afecten al producto necesitan un nuevo Manual Deploy si Render no está conectado para despliegue automático.

## 1. MongoDB Atlas

1. Crear una cuenta y un proyecto en MongoDB Atlas.
2. Crear un cluster disponible en el plan seleccionado y una base de demostración.
3. Crear un usuario de base de datos limitado al proyecto.
4. Obtener la conexión del controlador Node.js y reemplazar las credenciales localmente o en el panel de Render. No pegarlas en el README, chat, issues o código.
5. En **Network Access** (IP Access List), autorizar las IP de salida que Render muestre para el servicio (**Connect → Outbound**). Mantener la lista acotada; sin esta autorización Atlas puede rechazar la conexión de Render con `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR`.
6. Cuando el servicio funcione, limitar el usuario de base de datos a lectura y escritura sobre `vigia`, en lugar de `atlasAdmin`.

## 2. Render

1. Crear una cuenta en Render y conectar GitHub.
2. Crear un Blueprint desde `HEFRA-ws/ProyectoIngSoftware`; `render.yaml` contiene la configuración inicial.
3. Introducir `MONGODB_URI` y `DEMO_PASSWORD` como variables privadas. Usar una contraseña de al menos 12 caracteres.
4. Verificar `NODE_ENV=production`, `COOKIE_SECURE=true`, `DEMO_MODE=true` y `MONGODB_DB=vigia` para la demostración.
5. Revisar la disponibilidad y condiciones del plan antes de confirmar cualquier contratación. La plantilla solicita el plan `free`; su disponibilidad depende de la cuenta y la plataforma.
6. Iniciar el despliegue y comprobar los logs sin divulgar credenciales.

### Alternativa sin acceso de administrador al repositorio

Si la cuenta de Render no puede conectarse a la organización dueña del repositorio, crear *New → Web Service → Public Git Repository* con `https://github.com/HEFRA-ws/ProyectoIngSoftware` y cargar a mano la configuración de `render.yaml`: Build Command `corepack enable && pnpm install --frozen-lockfile --prod --ignore-scripts`, Start Command `node server.js`, Health Check Path `/api/health` y las mismas variables. En esta modalidad cada nuevo commit se publica con *Manual Deploy*.

## 3. Verificación después de publicar

- `/api/health` responde `{"status":"ok"}`.
- El login funciona bajo HTTPS y la cookie tiene `Secure` y `HttpOnly`.
- Crear un reporte ficticio, reiniciar el servicio y verificar que persiste en Atlas.
- Probar los cuatro roles y los adjuntos.
- Verificar que un trabajador no puede consultar reportes ajenos.
- Registrar URL, commit y fecha de verificación.

| Revisión pública | Fecha | Resultado |
| --- | --- | --- |
| `GET /api/health` en `vigia-sst-io46.onrender.com` | 2026-11-22 | Respondió `{"status":"ok"}` |
| Página de acceso oficial | 2026-11-22 | Cargan correo/contraseña y Google; privacidad accesible |
| Flujos críticos en producción | 2026-11-22 23:09 Colombia | 68 comprobaciones HTTP correctas: roles, evento, informe, adjuntos, acciones y cierre; datos en Atlas |
| Redespliegue final, persistencia y quejas | 2026-11-22 23:22 Colombia | Otras 24 comprobaciones correctas; frontend actualizado, casos conservados y calendario de Colombia corregido |

La aplicación utiliza una sola instancia web y Atlas para datos; no requiere guardar archivos en el disco efímero de Render. Los adjuntos se almacenan en MongoDB con límites pequeños apropiados al prototipo.

## Recursos oficiales

- [MongoDB: inicio con el controlador de Node.js](https://www.mongodb.com/docs/drivers/node/current/get-started/)
- [Render: despliegue de Node.js y Express](https://render.com/docs/deploy-node-express-app)
- [Render: variables de entorno](https://render.com/docs/configure-environment-variables)

Los resultados posteriores y su alcance están registrados en Calidad. El acceso, los flujos de eventos e informes y las descargas se probaron en producción; las pruebas de carga, respaldo y restauración siguen pendientes.

## Acceso opcional con Google

La aplicación conserva el acceso por correo y contraseña. Para habilitar también el registro y acceso con Google, configura `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI` según [Google Auth](Google-Auth.md). Las variables se añaden en el servicio existente de Render y requieren un nuevo despliegue; no hace falta modificar las contraseñas de demostración. La URI autorizada de producción es `https://vigia-sst-io46.onrender.com/auth/google/callback`.
