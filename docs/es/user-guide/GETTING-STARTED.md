# Primeros pasos

Bienvenido a **Email Automator**, su asistente de correo electrónico personal impulsado por IA. Esta guía le ayudará a configurar la aplicación utilizando el modelo **"Bring Your Own Key" (BYOK)**, que garantiza que sus datos permanezcan bajo su control dentro de su propia infraestructura de Supabase.

## 🛠 Requisitos previos

Antes de comenzar, asegúrese de tener lo siguiente:

1.  **RealTimeX Desktop**: Instalado y en funcionamiento. Esto es necesario para el procesamiento de IA (LLM) y las capacidades de texto a voz (TTS).
2.  **Cuenta de Supabase**: Una cuenta gratuita o de pago en [supabase.com](https://supabase.com).

---

## 🚀 Configuración rápida con el asistente

El **Asistente de configuración** integrado es la forma recomendada de comenzar. Automatiza el trabajo técnico pesado.

### 1. Compra y lanzamiento
*   Abra **RealTimeX Desktop**.
*   Vaya a la pestaña **Marketplace** → **Local Apps**.
*   Busque **"Email Automator"** y cómprelo (o actívelo si ya es de su propiedad).
*   Una vez comprado, haga clic en **Launch** (Lanzar) desde su lista de aplicaciones locales.

### 2. Ejecutar el asistente de configuración
En el primer lanzamiento, la aplicación le guiará a través de la configuración inicial:

*   **Elija una ruta de configuración**:
    *   **Aprovisionamiento gestionado (Recomendado)**: Proporcione un **Token de acceso de Supabase**. El asistente creará automáticamente un nuevo proyecto, ejecutará las migraciones de la base de datos, desplegará las Edge Functions e ingerirá la base de conocimientos inicial.
    *   **Conectar proyecto existente**: Utilice un proyecto de Supabase existente proporcionando su **URL del proyecto** y su **Clave Anon**. Opcionalmente, puede proporcionar un token de acceso aquí para que el asistente ejecute las migraciones por usted.

### 3. Crear su cuenta
Una vez que la base de datos esté lista, se le pedirá que cree su cuenta de usuario local e inicie sesión para acceder al **Panel de control**.

---

## 🔍 Cómo encontrar sus credenciales de Supabase

Si elige conectar un proyecto existente manualmente, puede encontrar sus credenciales en el [Panel de control de Supabase](https://supabase.com/dashboard):

1.  Seleccione su proyecto.
2.  Vaya a **Settings** (Configuración) → **API**.
3.  **URL del proyecto**: Copie la URL que se encuentra en "Project URL".
4.  **Clave API**: Copie la clave **anon (public)** en "Project API keys".

> [!WARNING]
> **Nota de seguridad**: Nunca use la clave `service_role`. Tiene privilegios de omisión administrativa total y nunca debe exponerse en aplicaciones del lado del cliente.

---

## 🪪 Generación de un token de acceso

Un token de acceso permite que el asistente de configuración gestione sus proyectos de Supabase (creación, migraciones, despliegue de funciones) en su nombre.

1.  En su panel de control de Supabase, vaya a **Account** (Cuenta) → **Access Tokens** (Tokens de acceso).
2.  Haga clic en **Generate new token**, asígnele un nombre (por ejemplo, "Email Automator") y copie el resultado.
3.  Pegue este token en el asistente de configuración cuando se le solicite.

---

**Siguiente paso:** [Configure sus cuentas de correo electrónico](./CONFIGURATION.md)  
**Glosario:** [Términos comunes](./GLOSSARY.md)