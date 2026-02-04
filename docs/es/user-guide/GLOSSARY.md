# Glosario

Definiciones de términos comunes utilizados en Email Automator y el Asistente de configuración.

## Supabase
Una plataforma backend que proporciona una base de datos Postgres alojada, autenticación, almacenamiento y APIs. Email Automator utiliza Supabase como su base de datos y capa de autenticación.

## BYOK (Bring Your Own Key)
Un modelo de configuración en el que conectas tu propio proyecto de Supabase en lugar de usar un backend compartido. Esto mantiene tus datos en tu propia infraestructura.

## ID de proyecto de Supabase
El identificador único de su proyecto de Supabase (a menudo se muestra en la URL del proyecto o en la configuración).

## URL del proyecto de Supabase
La URL base de su proyecto de Supabase, utilizada por la aplicación para conectarse a la base de datos y a las APIs.

## Clave Anon (Clave API pública)
La clave API pública de su proyecto de Supabase. Es segura para su uso en el lado del cliente, pero sigue estando sujeta a la Seguridad de Nivel de Fila (RLS).

## Token de acceso
Un token de su cuenta de Supabase que permite que el asistente de configuración cree o gestione proyectos en su nombre (utilizado en el Inicio rápido).

## Aprovisionamiento gestionado (Inicio rápido)
El asistente de configuración utiliza su token de acceso para crear automáticamente un proyecto de Supabase, aplicar migraciones, desplegar Edge Functions e ingerir la base de conocimientos.

## Sincronización manual (Conectar proyecto existente)
Usted conecta un proyecto de Supabase existente proporcionando la URL del proyecto y la clave Anon. El asistente puede ejecutar las migraciones si se proporciona un token de acceso.

## Aprovisionamiento gestionado vs. Sincronización manual
El **Aprovisionamiento gestionado** crea un nuevo proyecto de Supabase para usted utilizando un token de acceso.
La **Sincronización manual** se conecta a un proyecto de Supabase existente utilizando su URL de proyecto y su clave Anon.

## Migración
Cambios en la base de datos que crean o actualizan tablas, vistas, funciones y políticas. Las migraciones mantienen el esquema de su base de datos alineado con la aplicación.

## Esquema
La estructura de su base de datos: tablas, columnas, tipos, índices, funciones y políticas.

## SQL
El lenguaje utilizado para definir y consultar estructuras de bases de datos y datos.

## Desajuste de versión (Version Mismatch)
Cuando la versión del esquema esperada por la aplicación difiere de la versión real de la base de datos. El asistente de configuración o la herramienta de migración le pedirán que normalice.

## Versión de la base de datos (Configuración de la cuenta)
La versión principal de la base de datos que se muestra en la Configuración de la cuenta. Se utiliza para guiar las migraciones y debe coincidir con la versión de Postgres de su proyecto de Supabase.

## Rollback
Revertir una migración. En Supabase, las reversiones son manuales y deben usarse con cuidado.

## RLS (Row Level Security)
Una característica de seguridad de Postgres que restringe qué filas puede leer o escribir un usuario. Supabase utiliza RLS para proteger los datos.

## Edge Functions
Funciones sin servidor alojadas por Supabase. Email Automator las utiliza para flujos de OAuth y operaciones seguras.

## Clave Service Role
Una potente clave de Supabase que omite RLS. Nunca debe exponerse a los clientes.

## Clave Anon vs. Clave Service Role
La **clave anon** es segura para el uso del cliente y respeta RLS. La **clave service role** omite RLS y solo debe usarse en servidores de confianza.

## RealTimeX Desktop
La aplicación local que proporciona servicios de IA (LLM, embeddings, TTS) utilizados por Email Automator.

## Persona digital
Un perfil que define su tono, estilo y preferencias para borradores y respuestas generados por IA.

## Tono de la Persona
El carácter emocional de las respuestas (por ejemplo, amigable, formal, directo).

## Estilo de la Persona
Las preferencias de estilo de escritura (por ejemplo, conciso, detallado, puntos clave).

## Voz de la Persona
El "sonido" general de su escritura, incluyendo el fraseo y el ritmo.

## Firma de la Persona
Un cierre estandarizado utilizado en las respuestas (nombre, cargo, empresa).

## Rol de la Persona
Su cargo o puesto de trabajo, utilizado para dar forma al encuadre de la respuesta.

## Empresa de la Persona
El nombre de la organización utilizado en las respuestas cuando sea apropiado.

## Idioma de la Persona
El idioma principal para los borradores generados.

## API Express
El backend local que maneja la sincronización de correos, el procesamiento de IA y la ejecución de la automatización.

## Realtime (Supabase)
Actualizaciones en vivo desde la base de datos a la aplicación. Se utiliza para reflejar nuevos correos electrónicos, el estado de la sincronización o la actividad sin refrescar la página.

## LLM (Large Language Model)
Un modelo de IA utilizado para el análisis y la generación de respuestas (por ejemplo, categorización, redacción de borradores).

## Modelo de embedding
Un modelo que convierte el texto en vectores para la búsqueda sémántica. Utilizado por la base de conocimientos y RAG.

## Embeddings
Representaciones vectoriales de texto utilizadas para la búsqueda sémántica en la base de conocimientos.

## RAG (Retrieval-Augmented Generation)
Un método que recupera la documentación relevante y la entrega a la IA para que las respuestas se mantengan basadas en sus documentos.

## Ingestión de la base de conocimientos
El proceso de convertir la documentación en embeddings consultables y almacenarlos en la base de datos.

## TTS (Text-to-Speech)
Convierte las respuestas de la IA en audio hablado (texto a voz).

## Proveedor de TTS vs. Voz
El proveedor es el servicio que genera el habla; la voz es el locutor/persona específico dentro de ese proveedor.

## OAuth
Un estándar de autorización que permite que la aplicación acceda a su cuenta de correo electrónico sin almacenar su contraseña.

## Pantalla de consentimiento de OAuth
La pantalla donde usted otorga permiso a Email Automator para acceder a su cuenta de correo electrónico.

## Token de acceso (OAuth)
Un token de corta duración utilizado para llamar a las APIs de los proveedores de correo electrónico. Caduca y se renueva automáticamente.

## Token de actualización (Refresh Token)
Un token de larga duración utilizado para obtener nuevos tokens de acceso sin volver a autenticarse.

## API de Gmail
La API oficial de Google para acceder a los datos de Gmail y enviar correos electrónicos.

## Microsoft Graph
La API de Microsoft para los datos de Outlook y Microsoft 365 (correo, calendario, contactos).

## IMAP / SMTP
Protocolos de correo electrónico. IMAP lee el correo; SMTP envía el correo. (Email Automator utiliza las APIs de los proveedores en lugar de IMAP/SMTP sin procesar).

## Registro de aplicación (Microsoft)
Una configuración de aplicación en Azure que proporciona credenciales para el acceso a Microsoft Graph.

## ID de cliente (Client ID)
El identificador público de su aplicación OAuth (Google/Microsoft).

## Secreto de cliente (Client Secret)
Un secreto privado para su aplicación OAuth. Trátelo como una contraseña.

## URI de redireccionamiento
La URL de retorno a la que el proveedor de correo electrónico envía a los usuarios después de la autorización de OAuth.

## Flujo de código de dispositivo (Device Code Flow)
Un flujo de OAuth en el que usted se autentica en un navegador utilizando un código corto, a menudo utilizado para aplicaciones de escritorio.

## ID de inquilino (Tenant ID)
El identificador de inquilino de Microsoft. Utilice "common" para multi-inquilino o un ID de inquilino específico para acceso exclusivo de la organización.

## Alcance de sincronización
Define cuánto historial sincronizar (por ejemplo, los últimos X días) y qué cuentas están incluidas.

## Etiquetas (Gmail) / Carpetas (Outlook)
Constructos de organización en los proveedores de correo electrónico. Las etiquetas marcan los mensajes; las carpetas los organizan en contenedores.