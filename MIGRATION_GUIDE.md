# 🌐 Guía de Migración: Dominio y Correo

Sigue estos pasos para mover tu Dominio (ej. `midominio.com`) y configuración de Resend del proyecto antiguo al nuevo (`vizzaro-pro`).

## 1. Migrar el Dominio (Vercel)

⚠️ **Importante**: Un dominio no puede estar en dos proyectos de Vercel al mismo tiempo.

1.  **En el Proyecto VIEJO**:
    *   Ve al Dashboard de Vercel > Proyecto Antiguo > **Settings**.
    *   Ve a **Domains**.
    *   Busca tu dominio (ej. `decorwall.mx` o `vizzaro.com`) y haz clic en **Edit** > **Remove**.
    *   *El sitio viejo dejará de responder en ese dominio.*

2.  **En el Proyecto NUEVO (`vizzaro-pro`)**:
    *   Ve a Settings > **Domains**.
    *   Escribe tu dominio y haz clic en **Add**.
    *   Vercel verificará los DNS. Si no has cambiado de proveedor DNS, debería ser automático. Si te pide cambios, actualiza tus registros DNS (A record o CNAME) según indique Vercel.

## 2. Configurar Resend (Correos)

1.  **Verificar Dominio en Resend**:
    *   Entra a [Resend.com](https://resend.com) > **Domains**.
    *   Asegúrate de que el estado sea **Verified**.
    *   Si moviste el dominio a otro proveedor DNS, podrías necesitar actualizar los registros `MX` y `TXT` que te da Resend.

2.  **Conectar al Proyecto Nuevo**:
    *   Ve a Vercel > Proyecto Nuevo (`vizzaro-pro`) > **Settings** > **Environment Variables**.
    *   Asegúrate de tener las siguientes variables (si no, agrégalas):
        *   `RESEND_API_KEY`: Tu llave de Resend (empieza con `re_`).
        *   `FROM_EMAIL`: El remitente verificado (ej. `ventas@tudominio.com`).
            *   *Nota*: Si no tienes esta variable, el sistema intentará usar `onboarding@resend.dev`, que solo funciona para correos de prueba.

## 3. Actualizar el Código (Yo lo haré)

Una vez que tengas el dominio conectado, **necesito que me digas cuál es** (ej. `www.vizzaro.com`).

Yo actualizaré:
*   `sitemap.xml`: Para que Google indexe `vizzaro.com/producto` y no `vizzaro-pro.vercel.app`.
*   `Etiquetas SEO`: Para que los links en redes sociales apunten al dominio real.
