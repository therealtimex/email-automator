# Configuración

La pestaña **Configuración** es el centro de mando de Email Automator. Aquí, conectará a sus proveedores de correo electrónico, definirá el comportamiento de su IA y configurará las reglas que impulsan la automatización.

---

## 📧 Cuentas de correo electrónico (BYOK)

Email Automator sigue un modelo **"Bring Your Own Key" (BYOK)**. Usted proporciona sus propias credenciales de OAuth, garantizando que el acceso a sus datos permanezca totalmente bajo su control.

### 🔴 Configuración de Gmail (OAuth 2.0)
1.  **Google Cloud Console**: Cree un proyecto y habilite la **API de Gmail**.
2.  **Pantalla de consentimiento**: Configure la pantalla de consentimiento de OAuth y agregue su correo electrónico como **Usuario de prueba**.
3.  **Credenciales**: Cree un **ID de cliente de OAuth 2.0** (Tipo: Aplicación web).
    *   **URI de redireccionamiento autorizada**: `https://<vuestra-ref-proyecto>.supabase.co/functions/v1/auth-gmail/callback`
4.  **Conectar**: En Email Automator, haga clic en **Connect Gmail**.
5.  **Autorizar**: Pegue su ID de cliente y el Secreto (o cargue el JSON), luego siga el enlace para autorizar su cuenta.

### 🔵 Configuración de Outlook (Código de dispositivo)
1.  **Portal de Azure**: Registre una nueva aplicación en **App Registrations** (Registros de aplicaciones).
2.  **Tipo de cuenta**: Seleccione "Cuentas en cualquier directorio organizativo y cuentas personales de Microsoft".
3.  **Autenticación**: Asegúrese de que "Permitir flujos de clientes públicos" esté configurado en **Sí**.
4.  **Conectar**: En Email Automator, haga clic en **Connect Outlook** e introduzca su **ID de cliente**.
5.  **Autorizar**: Siga el aviso de **Código de dispositivo** en su navegador para completar el inicio de sesión.

---

## 📅 Alcance y límites de sincronización

Antes de iniciar su primera sincronización, configure los límites para garantizar el rendimiento y la rentabilidad:

*   **Sincronizar desde**: Elija la fecha de inicio (por ejemplo, "Desde ahora" o una fecha histórica específica).
*   **Máximo de correos**: Establezca el número máximo de correos electrónicos a procesar en un solo lote (Predeterminado: 50).
*   **Intervalo de sincronización**: Defina la frecuencia con la que el programador en segundo plano debe buscar nuevos correos (por ejemplo, cada 15 minutos).

> [!TIP]
> **Empiece poco a poco**: Para su primera ejecución, recomendamos configurar "Sincronizar desde" en "Ahora" y "Máximo de correos" entre 10 y 20 para verificar que sus reglas funcionan según lo previsto.

---

## 🤖 Automatización y Auto-Pilot

La gestión del comportamiento de su IA —incluida la creación de reglas personalizadas, el cambio de automatizaciones del sistema y la configuración de políticas de retención — se ha consolidado en la pestaña **[Auto-Pilot](./AUTOMATION.md)**.

---

## 🧠 Configuración del sistema e IA

### Configuración del proveedor
Email Automator detecta los modelos disponibles a través de **RealTimeX Desktop**.
*   **Proveedor de LLM**: Elija su motor de IA preferido (por ejemplo, OpenAI, Anthropic o modelos locales).
*   **Modelo de embedding**: Se utiliza para el sistema RAG (Generación aumentada por recuperación) para ayudar a la IA a comprender su contexto específico.

### Voz y accesibilidad (TTS)
Habilite **Texto a voz** para que la IA lea resúmenes o alertas importantes en voz alta.
*   **Hablar automáticamente**: Lee automáticamente las notificaciones de alta prioridad.
*   **Perfil de voz**: Elija entre varias voces de alta calidad disponibles a través de RealTimeX.

---

**Siguiente paso:** [Monitoreo del Panel de control](./DASHBOARD.md)