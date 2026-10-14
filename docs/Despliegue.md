# Despliegue en Render y MongoDB Atlas

Estado actual: preparado, pendiente de configurar las cuentas y verificar una URL pública.

## 1. MongoDB Atlas

1. Crear una cuenta y un proyecto en MongoDB Atlas.
2. Crear un cluster disponible en el plan seleccionado y una base de demostración.
3. Crear un usuario de base de datos limitado al proyecto.
4. Obtener la conexión del controlador Node.js y reemplazar las credenciales localmente o en el panel de Render. No pegarlas en el README, chat, issues o código.
5. Autorizar en Atlas los rangos de IP saliente que muestre Render para el servicio. Mantener el acceso de red acotado.

## 2. Render

1. Crear una cuenta en Render y conectar GitHub.
2. Crear un Blueprint desde `HEFRA-ws/ProyectoIngSoftware`; `render.yaml` contiene la configuración inicial.
3. Introducir `MONGODB_URI` y `DEMO_PASSWORD` como variables privadas. Usar una contraseña de al menos 12 caracteres.
4. Verificar `NODE_ENV=production`, `COOKIE_SECURE=true`, `DEMO_MODE=true` y `MONGODB_DB=vigia` para la demostración.
5. Revisar la disponibilidad y condiciones del plan antes de confirmar cualquier contratación. La plantilla solicita el plan `free`; su disponibilidad depende de la cuenta y la plataforma.
6. Iniciar el despliegue y comprobar los logs sin divulgar credenciales.

## 3. Verificación después de publicar

- `/api/health` responde `{"status":"ok"}`.
- El login funciona bajo HTTPS y la cookie tiene `Secure` y `HttpOnly`.
- Crear un reporte ficticio, reiniciar el servicio y verificar que persiste en Atlas.
- Probar los cuatro roles y los adjuntos.
- Verificar que un trabajador no puede consultar reportes ajenos.
- Registrar URL, commit y fecha de verificación.

La aplicación utiliza una sola instancia web y Atlas para datos; no requiere guardar archivos en el disco efímero de Render. Los adjuntos se almacenan en MongoDB con límites pequeños apropiados al prototipo.

## Recursos oficiales

- [MongoDB: inicio con el controlador de Node.js](https://www.mongodb.com/docs/drivers/node/current/get-started/)
- [Render: despliegue de Node.js y Express](https://render.com/docs/deploy-node-express-app)
- [Render: variables de entorno](https://render.com/docs/configure-environment-variables)

La publicación todavía requiere que el titular configure las cuentas y los accesos. No se presenta como desplegado hasta comprobar el resultado.
