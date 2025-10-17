# 📧 Configuración de Email para Wallpaper Store

## ✅ Completado

### 1. WhatsApp
- **Número configurado**: +1 (732) 664-6800
- **Ubicación**: Todos los botones de WhatsApp en la app
- **Estado**: ✅ Funcionando

---

## 📨 Configuración de Emails (Pendiente)

Para que los emails funcionen, necesitas configurar un servicio de envío de emails. Te recomiendo **Resend** por su facilidad de uso.

### Opción 1: Resend (Recomendado)

#### Paso 1: Crear cuenta en Resend
1. Ve a [resend.com](https://resend.com)
2. Crea una cuenta gratuita
3. Verifica tu email

#### Paso 2: Obtener API Key
1. En el dashboard de Resend, ve a "API Keys"
2. Crea una nueva API Key
3. Copia la key (empieza con `re_`)

#### Paso 3: Configurar dominio (Opcional pero recomendado)
1. En Resend, ve a "Domains"
2. Agrega tu dominio
3. Configura los registros DNS según las instrucciones
4. Espera la verificación (puede tomar unos minutos)

#### Paso 4: Configurar variables de entorno
Crea o edita el archivo `.env` en la raíz del proyecto:

```env
EXPO_PUBLIC_EMAIL_API_URL=https://api.resend.com/emails
EXPO_PUBLIC_EMAIL_API_KEY=re_tu_api_key_aqui
```

#### Paso 5: Actualizar el código de envío de emails
El código ya está preparado para Resend, pero necesitas ajustar el formato del body:

En `contexts/AuthContext.tsx` y `contexts/OrdersContext.tsx`, cambia:

```typescript
body: JSON.stringify({
  to: email,
  subject: 'Asunto',
  html: '...',
}),
```

Por:

```typescript
body: JSON.stringify({
  from: 'Wallpaper Store <onboarding@resend.dev>', // o tu dominio verificado
  to: email,
  subject: 'Asunto',
  html: '...',
}),
```

---

### Opción 2: SendGrid

#### Paso 1: Crear cuenta
1. Ve a [sendgrid.com](https://sendgrid.com)
2. Crea una cuenta gratuita (100 emails/día gratis)

#### Paso 2: Obtener API Key
1. En Settings → API Keys
2. Crea una nueva API Key con permisos de "Mail Send"
3. Copia la key (empieza con `SG.`)

#### Paso 3: Verificar remitente
1. Ve a Settings → Sender Authentication
2. Verifica tu email o dominio

#### Paso 4: Configurar variables de entorno
```env
EXPO_PUBLIC_EMAIL_API_URL=https://api.sendgrid.com/v3/mail/send
EXPO_PUBLIC_EMAIL_API_KEY=SG.tu_api_key_aqui
```

#### Paso 5: Actualizar el código
Necesitarás adaptar el formato del body para SendGrid (diferente a Resend).

---

### Opción 3: Mailgun, AWS SES, etc.
Similar a las opciones anteriores, necesitas:
1. Crear cuenta
2. Obtener API Key
3. Configurar variables de entorno
4. Adaptar el formato del body según la API

---

## 🧪 Modo de Prueba (Actual)

**Sin configuración de email**, la app funciona en modo simulado:

### Registro de usuarios:
- El código de verificación se muestra en la **consola del navegador/terminal**
- Busca: `📧 CÓDIGO DE VERIFICACIÓN`
- Copia el código de 6 dígitos y úsalo en la app

### Confirmación de compras:
- Las órdenes se crean correctamente
- Se muestra en consola: `⚠️ Email API no configurada`
- Los usuarios NO reciben email de confirmación

---

## 🔍 Verificar que funciona

### Después de configurar:

1. **Registro de usuario**:
   - Registra un nuevo usuario
   - Deberías recibir un email con el código de 6 dígitos
   - Verifica en consola: `✅ Email de verificación enviado a: email@ejemplo.com`

2. **Confirmación de compra**:
   - Completa una compra
   - El cliente debería recibir un email con:
     - Número de pedido
     - Detalles de productos
     - Total
     - Información de contacto (WhatsApp)
   - Verifica en consola: `✅ Email de confirmación enviado a: email@ejemplo.com`

---

## 📋 Resumen de lo implementado

### ✅ Funcionalidades completadas:

1. **WhatsApp**
   - Botón de ayuda con número +1 (732) 664-6800
   - Funciona en móvil y web

2. **Sistema de registro con verificación**
   - Código de 6 dígitos
   - Expira en 10 minutos
   - Opción de reenviar código
   - Email HTML profesional con diseño responsive

3. **Confirmación de compras por email**
   - Email automático al crear orden
   - Incluye todos los detalles del pedido
   - Diseño profesional con gradientes
   - Link directo a WhatsApp para soporte

4. **Modo simulado**
   - Funciona sin configuración
   - Códigos en consola para desarrollo
   - Fácil de probar

---

## 🚀 Próximos pasos

1. Elige un servicio de email (Resend recomendado)
2. Crea cuenta y obtén API Key
3. Configura variables de entorno
4. Prueba enviando un email de registro
5. Verifica que llegue correctamente
6. Prueba una compra completa

---

## ❓ Preguntas frecuentes

**P: ¿Cuánto cuesta?**
R: Resend tiene plan gratuito (100 emails/día). SendGrid también (100 emails/día).

**P: ¿Necesito un dominio?**
R: No es obligatorio, pero es recomendado para mejor deliverability. Puedes usar el dominio de prueba de Resend.

**P: ¿Los emails van a spam?**
R: Con dominio verificado y buenas prácticas, no. Sin dominio, puede pasar.

**P: ¿Puedo usar Gmail?**
R: No es recomendado para producción. Gmail tiene límites muy bajos y puede bloquear tu cuenta.

---

## 📞 Soporte

Si tienes problemas con la configuración, revisa:
1. Que las variables de entorno estén correctas
2. Que la API Key tenga los permisos necesarios
3. Los logs en la consola para ver errores específicos
4. La documentación del servicio de email que elegiste
