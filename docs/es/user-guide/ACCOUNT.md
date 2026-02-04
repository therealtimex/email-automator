# Cuenta y Privacidad

Gestione su perfil, su persona de IA y la configuración de seguridad dentro de la página **Configuración de la cuenta** (se accede a través del icono de perfil en la esquina superior derecha).

---

## 👤 Perfil y Experiencia
Personalice su interacción con la aplicación:
*   **Identidad**: Actualice su nombre de pantalla y cargue un avatar personalizado.
*   **Retroalimentación sensorial**: Active o desactive los **Efectos de sonido** y la **Retroalimentación háptica** para actividades en segundo plano (como el análisis de nuevos correos o la finalización de la sincronización).

---

## 🧬 Su Persona de IA
La **Persona** es el ajuste más crítico para obtener **Borradores inteligentes** de alta calidad. Actúa como la "Identidad" que la IA utiliza al redactar respuestas.

*   **Rol y contexto**: Defina su título profesional y la industria en la que trabaja.
*   **Tono de voz**: Especifique cómo desea sonar (por ejemplo, "Profesional pero amigable", "Conciso y directo").
*   **Estilo de respuesta**: Establezca preferencias para la longitud de la respuesta y el uso de la firma.
*   **Entidades de confianza**: Enumere remitentes VIP y dominios de confianza para ayudar a la IA a priorizar correctamente.

---

## 🗄️ Conexión con Supabase (BYOK)
Como parte del modelo **"Bring Your Own Key"**, puede monitorear y gestionar su conexión a su base de datos dedicada:
*   **Estado**: Vea la URL de su proyecto de Supabase actual y la versión del esquema.
*   **Centro de migración**: Compruebe si el esquema de su base de datos está actualizado.
*   **Desconectar**: Si necesita cambiar de proyecto, puede borrar su configuración aquí (esto cerrará su sesión y restablecerá el estado de la aplicación local).

---

## 🔐 Seguridad
*   **Gestión de contraseñas**: Actualice la contraseña de su cuenta local en cualquier momento.
*   **Cifrado**: Todas las credenciales del proveedor de correo electrónico (tokens de Gmail/Outlook) se cifran antes de almacenarse en su proyecto de Supabase.

---

## 🛡️ Privacidad y soberanía de datos
Email Automator está diseñado con una arquitectura que **prioriza la privacidad**. Sus datos se distribuyen de la siguiente manera:

| Tipo de dato | Ubicación | Acceso |
| :--- | :--- | :--- |
| **Metadatos de correo y registros** | Su proyecto de Supabase | Privado para usted |
| **Archivos de correo sin procesar (.eml)** | Su máquina local | Solo acceso fuera de línea |
| **Adjuntos de reglas** | Su almacenamiento de Supabase | Privado para usted |
| **Procesamiento de IA** | RealTimeX Desktop | Local/API directa |

**Importante**: Email Automator (la empresa) nunca tiene acceso a sus correos electrónicos, sus credenciales o sus registros de IA. Todo permanece dentro de su propia infraestructura privada.

---

**Siguiente paso:** [Solución de problemas y soporte](./TROUBLESHOOTING.md)