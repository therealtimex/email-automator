# Automatización y Auto-Pilot

La pestaña **Auto-Pilot** es el centro neurálgico para gestionar el comportamiento de su agente de IA. Consolida las "Reglas del sistema" (interruptores globales) y una biblioteca de **26 reglas inteligentes integradas** junto con sus propias "Reglas personalizadas".

---

## 🛡️ Reglas integradas del sistema

Email Automator viene con 26 reglas preconfiguradas diseñadas por expertos en IA para manejar los desafíos comunes de la bandeja de entrada. Estas se organizan en categorías funcionales para ayudarlo a mantenerse organizado.

### 📧 Organización del correo electrónico
*   **Newsletter Sweeper**: Archiva automáticamente boletines y correos de marketing para mantener limpia su bandeja de entrada.
*   **Receipt Organizer**: Clasifica automáticamente recibos y confirmaciones de pedidos.
*   **CC Organizer**: Etiqueta correos electrónicos donde está en copia (CC) para un triaje rápido.
*   **Cold Outreach Filter**: Mueve los correos de ventas fríos a una carpeta separada.
*   **Social Noise**: Minimiza las notificaciones de LinkedIn y redes sociales.
*   **Stack Overflow Digests**: Archiva automáticamente resúmenes técnicos a menos que requieran atención inmediata.

### 🚨 Prioridad y alertas
*   **VIP Urgent Messages**: Destaca mensajes urgentes de partes interesadas clave (CEOs, miembros de la junta).
*   **Critical Alerts**: Saca a la superficie incidentes de producción y alertas críticas P0/P1.
*   **Urgent Support Tickets**: Resalta problemas de clientes de alta prioridad que necesitan acción inmediata.

### 💻 Desarrollo
*   **GitHub Mentions**: Rastrea cuando se le menciona específicamente en Pull Requests o Issues.
*   **CI/CD Failures**: Resalta fallos de compilación y despliegue de herramientas como CircleCI o GitHub Actions.
*   **Code Review Requests**: Organiza las solicitudes entrantes para revisiones de código.
*   **Dependabot Noise**: Archiva automáticamente actualizaciones de dependencias de baja prioridad mientras mantiene visibles las alertas de seguridad.
*   **Monitoring Alerts**: Organiza alertas de monitoreo y registro no urgentes.

### 💼 Ventas y negocios
*   **Hot Leads**: Prioriza respuestas de prospectos con alta intención basadas en sentimientos positivos.
*   **Follow-up Reminders**: Rastrea respuestas de prospectos que solicitan específicamente un seguimiento.
*   **Referrals & Intros**: Asegura que nunca se pierda una introducción o referencia cálida.
*   **Contracts & Proposals**: Resalta comunicaciones contractuales importantes y documentos legales.
*   **Objections & Concerns**: Marca correos electrónicos que expresan inquietudes o dudas para un manejo cuidadoso.
*   **Nurture Campaigns**: Archiva correos de campañas de goteo automatizadas para priorizar respuestas personales.
*   **Financial Updates**: Mantiene fácilmente accesibles los informes de ingresos y las actualizaciones presupuestarias trimestrales.

### ⚙️ Operaciones
*   **Internal Requests**: Organiza solicitudes entre equipos y elementos de acción.
*   **Vendor Communications**: Rastrea facturas, envíos y actualizaciones relacionadas con proveedores.
*   **System Alerts**: Organiza notificaciones de infraestructura y del sistema.
*   **Meeting Invites**: Separa las invitaciones de calendario para una gestión más fácil de la programación.
*   **Weekly Reports**: Clasifica automáticamente informes de estado regulares y actualizaciones de progreso.

---

## 🛠️ Creación de reglas personalizadas

Las reglas personalizadas le permiten crear flujos de trabajo precisos impulsados por la IA. Puede crear, editar y gestionar estas directamente en la pestaña **Auto-Pilot**.

### 1. Condiciones (El "Si")
Puede combinar metadatos y condiciones impulsadas por la IA:
*   **Información de IA**: Categoría (p. ej., Newsletter, Recibo, Personal), Sentimiento (Positivo, Negativo, Neutral) o Prioridad (Alta, Media, Baja).
*   **Metadatos**: Dominio del remitente (p. ej., `github.com`), palabras clave específicas en el asunto o nombre del remitente.
*   **Filtro de retención**: "Solo actuar si el correo electrónico es más antiguo que X días". Esto es perfecto para limpiar boletines o notificaciones antiguas.

### 2. Acciones (El "Entonces")
Elija qué sucede cuando un correo electrónico coincide con sus condiciones:
*   **Archivar / Eliminar**: Mantenga limpia su bandeja de entrada automáticamente.
*   **Destacar / Marcar**: Resalte elementos importantes para revisión manual.
*   **Borrador**: La acción más poderosa. Le dice a la IA que prepare una respuesta.

---

## ✍️ Contexto inteligente y Ghostwriting

Cuando utiliza la acción de **Borrador**, puede proporcionar a la IA instrucciones específicas para asegurar que la respuesta satisfaga sus necesidades:

*   **Instrucciones de Ghostwriting**: Dígale a la IA *cómo* responder (p. ej., "Sea amable pero firme al rechazar la invitación" o "Pregunte por su disponibilidad el próximo martes").
*   **Adjuntos de reglas**: Puede cargar documentos estándar (como una lista de precios o una biografía) que la IA incluirá automáticamente como adjuntos cada vez que esta regla active un borrador.

---

## 🚀 La pestaña Auto-Pilot

La pestaña **Auto-Pilot** proporciona una vista panorámica de su motor de automatización.
*   **Vista agrupada**: Las reglas se organizan por su intención principal.
*   **Interruptores rápidos**: Habilite o deshabilite reglas instantáneamente sin eliminarlas.
*   **Indicadores de estado**: Vea qué reglas están activas actualmente y cuántos correos electrónicos han procesado.

---

## 💡 Mejores prácticas

*   **Comience de forma pasiva**: Configure sus primeras reglas para **Destacar** o **Archivar** en lugar de **Eliminar** hasta que confíe en la categorización de la IA.
*   **Use la retención para el ruido**: Use una regla como: `Si Categoría = Newsletter Y Antigüedad > 30 Días ENTONCES Eliminar`. Esto evita que sus boletines "leídos" saturen su archivo para siempre.
*   **Refine con comentarios**: Si una regla no coincide correctamente, use el icono de **Comentarios** en el Panel de control para mejorar la comprensión de la IA de ese tipo específico de correo electrónico.

---

**Siguiente paso:** [Gestión de cuenta y seguridad](./ACCOUNT.md)