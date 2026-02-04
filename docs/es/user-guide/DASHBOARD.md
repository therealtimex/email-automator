# Panel de control y actividad en vivo

El **Panel de control** es su interfaz principal para monitorear la actividad de su agente de IA y gestionar su bandeja de entrada analizada. Está diseñado para proporcionar una transparencia total sobre cómo piensa y actúa la IA.

---

## 📊 El flujo de análisis

A medida que la IA procesa su bandeja de entrada, los correos electrónicos aparecen en el flujo con actualizaciones de estado en tiempo real e información inteligente.

*   **Búsqueda inteligente**: Encuentre rápidamente correos electrónicos por palabra clave o remitente.
*   **Filtros de IA**: Filtre su vista por Categoría (por ejemplo, Newsletter, Personal), Sentimiento o Prioridad.
*   **Clasificación dinámica**: Alterne entre la hora en que se *recibió* un correo electrónico y la hora en que fue *procesado* por la IA.

### 📌 Barra lateral de detalles del correo electrónico
Al hacer clic en cualquier tarjeta de correo electrónico se abre un panel lateral detallado que contiene:
*   **Resumen de IA**: Una descripción concisa del contenido del correo electrónico.
*   **Puntos clave**: Aspectos destacados extraídos por la IA.
*   **Vista previa del borrador**: Si se generó un borrador de respuesta, puede revisarlo aquí antes de enviarlo.
*   **Enlaces rápidos**: Salte directamente al correo electrónico original en su interfaz web de Gmail o Outlook.

---

## 🛡️ Confianza y transparencia

Email Automator se basa en el principio de **"IA de caja de cristal" (Glass Box AI).** Siempre debe saber *por qué* se tomó una acción.

### 📟 Terminal de actividad en vivo
Haga clic en el botón **Live Activity** (Actividad en vivo) en la esquina inferior derecha para abrir el flujo de procesamiento en tiempo real.
*   **Registros de pensamiento**: Observe cómo la IA analiza el contenido, evalúa las reglas y decide las acciones.
*   **Detalles técnicos**: Vea las llamadas de API sin procesar, las duraciones del procesamiento y los estados de sincronización en segundo plano.
*   **Control**: Puede detener manualmente una sincronización activa directamente desde la terminal.

### 🕵️ Traza de IA (AI Trace)
Haga clic en el **icono del ojo** en cualquier tarjeta de correo electrónico para abrir el **Modal de Traza de IA**.
*   **Lógica de decisión**: Vea un desglose paso a paso de por qué la IA asignó una categoría o prioridad específica.
*   **Datos sin procesar**: Vea el prompt exacto enviado al LLM y la respuesta JSON sin procesar que devolvió.
*   **Estadísticas de rendimiento**: Revise el uso de tokens y el tiempo de procesamiento para ese correo electrónico específico.

---

## ⚡ Acciones rápidas

Tome el control con acciones de un solo clic disponibles en cada tarjeta de correo electrónico:
*   🗑️ **Eliminar / 📦 Archivar**: Limpieza instantánea.
*   ⭐ **Destacar / Marcar**: Marque elementos importantes para más tarde.
*   🔄 **Reprocesar**: Si ha actualizado sus reglas, puede pedirle a la IA que analice un correo electrónico nuevamente.
*   💬 **Comentarios**: Ayude a la IA a aprender informando categorizaciones o análisis de sentimientos incorrectos.

---

## 🔔 Notificaciones y retroalimentación

La aplicación utiliza retroalimentación multisensorial para mantenerlo informado sobre la actividad en segundo plano:
*   **Visual**: Insignias de estado en vivo y notificaciones emergentes.
*   **Audio**: Campanas sutiles y de alta calidad para nuevos correos electrónicos, alertas de alta prioridad y finalización de la sincronización.
*   **Háptica**: Retroalimentación física en dispositivos compatibles.

> **Nota**: Los ajustes de sonido y háptica se pueden personalizar en la **[Configuración de la cuenta](./ACCOUNT.md)**.

---

## 📈 Análisis e historial

Manténgase informado sobre el rendimiento de su agente:
*   **Historial de sincronización**: Vea un registro de las ejecuciones de sincronización recientes, incluido el número de correos electrónicos procesados y cualquier acción tomada.
*   **Estadísticas de eficiencia**: Vea los totales de eliminaciones, archivos y borradores automatizados a lo largo del tiempo.

---

**Siguiente paso:** [Creación de reglas de automatización](./AUTOMATION.md)