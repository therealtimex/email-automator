# Solución de problemas y soporte

Si encuentra problemas, esta guía cubre los obstáculos más comunes y sus soluciones.

---

## 📡 Problemas de sincronización

### Los correos electrónicos no aparecen en el Panel de control
*   **Compruebe la fecha "Sincronizar desde"**: La IA solo procesa los correos electrónicos recibidos *después* de esta fecha.
*   **Restablecer punto de control (Reset Checkpoint)**: Si ha cambiado su fecha de inicio y desea volver a escanear correos antiguos, haga clic en el botón **Reset Checkpoint** en el panel de Alcance de sincronización.
*   **Límites de lotes**: El ajuste **Máximo de correos** limita cuántos correos se procesan por ejecución. Si tiene un gran volumen acumulado, puede llevar varios ciclos de sincronización ponerse al día.
*   **Activación manual**: Haga clic en **Run Sync Now** en el Panel de control para forzar una comprobación inmediata.

### "Sync Failed" o "Backend Not Connected"
*   **Servidor local**: Asegúrese de que la aplicación Email Automator esté abierta y en funcionamiento.
*   **Flujo de actividad en vivo**: Abra la terminal **Live Activity**. A menudo contiene mensajes de error técnicos específicos (p. ej., "Network Error" o "401 Unauthorized").

---

## 🔑 Autenticación y permisos

### Google/Gmail: `redirect_uri_mismatch`
*   **La solución**: Su URI de redireccionamiento en Google Cloud Console debe coincidir *exactamente* con la que se muestra en Email Automator.
*   **Ejemplo**: `https://tu-ref.supabase.co/functions/v1/auth-gmail/callback` (asegúrese de que no haya barras diagonales finales ni espacios).

### Microsoft/Outlook: El inicio de sesión falla o agota el tiempo de espera
*   **Registro de la aplicación**: Asegúrese de que su registro de aplicación de Azure tenga "Permitir flujos de clientes públicos" configurado en **Sí**.
*   **Tipo de cuenta**: Asegúrese de haber seleccionado "Cuentas en cualquier directorio organizativo y cuentas personales de Microsoft" durante el registro.

### Supabase: "Invalid API Key"
*   **La solución**: Utilice siempre la clave **anon (public)**. La clave **service_role** será rechazada por la aplicación por razones de seguridad.

---

## 🤖 Integración de IA y RealTimeX

### La IA es lenta o no responde
*   **Modelos locales**: Si utiliza Ollama o LM Studio, asegúrese de que su máquina tenga suficiente RAM y que su GPU no esté bajo una carga pesada.
*   **Descubrimiento**: Si no aparece ningún modelo en el menú desplegable, asegúrese de que **RealTimeX Desktop** esté funcionando y de haber configurado al menos un proveedor de IA en él.

### No se están creando "Borradores inteligentes"
*   **Interruptor del sistema**: Asegúrese de que **Smart Drafts** esté activado (**ON**) en la pestaña Auto-Pilot.
*   **Conflicto de reglas**: Verifique que la regla que coincide con el correo electrónico incluya realmente la acción de **Borrador** (Draft).
*   **Filtro de seguridad**: La IA omite automáticamente la creación de borradores para direcciones `no-reply` y ciertas notificaciones automatizadas para evitar "bucles de bots".

---

## 🗄️ Base de datos y migraciones

### Banner "Se requiere migración de base de datos"
*   **Por qué sucede**: Su aplicación local se ha actualizado y el esquema de su base de datos de Supabase debe actualizarse para admitir nuevas funciones.
*   **La solución**: Haga clic en **Update Now** en el banner. Necesitará su **Token de acceso de Supabase** para ejecutar la actualización automáticamente.

### La Terminal en vivo está vacía o muestra "404"
*   **Permisos de Realtime**: Asegúrese de haber ejecutado las últimas migraciones. La tabla `processing_events` debe existir y tener habilitadas las políticas de RLS (Seguridad de Nivel de Fila) correctas.

---

## 🆘 ¿Aún necesita ayuda?

Si su problema no aparece aquí:
1.  Consulte los **Registros del sistema** (System Logs) en la Configuración de la cuenta para ver los rastreos técnicos.
2.  Revise la [Documentación para desarrolladores](../docs-dev/README.md) para obtener detalles de configuración avanzada.
3.  Abra un ticket o una discusión en el repositorio del proyecto.