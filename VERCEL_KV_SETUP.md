# 🔧 Configuración de Vercel KV

## ⚠️ IMPORTANTE: Base de datos no configurada

Actualmente tu aplicación **NO tiene configurada la base de datos Vercel KV**, por lo que los cambios en el catálogo no se guardan permanentemente.

## 📋 Pasos para configurar Vercel KV

### 1. Crear una base de datos KV en Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Haz clic en la pestaña **Storage**
3. Haz clic en **Create Database**
4. Selecciona **KV** (Key-Value Store)
5. Dale un nombre a tu base de datos (ej: `vizzaro-wallpaper-db`)
6. Haz clic en **Create**

### 2. Conectar la base de datos a tu proyecto

1. Después de crear la base de datos, Vercel te mostrará las variables de entorno
2. Haz clic en **Connect to Project**
3. Selecciona tu proyecto `vizzaro-wallpaper`
4. Haz clic en **Connect**

### 3. Verificar las variables de entorno

1. Ve a **Settings** → **Environment Variables**
2. Verifica que existan estas variables:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

### 4. Actualizar el archivo .env local (opcional)

Si quieres probar localmente, copia las variables de entorno a tu archivo `.env`:

```env
KV_REST_API_URL=https://your-kv-url.upstash.io
KV_REST_API_TOKEN=your_token_here
```

### 5. Redesplegar tu aplicación

1. Ve a la pestaña **Deployments**
2. Haz clic en los tres puntos del último deployment
3. Selecciona **Redeploy**
4. Espera a que termine el deployment

## ✅ Verificar que funciona

Después de configurar Vercel KV:

1. Ve al panel de administración de tu app
2. Intenta agregar, editar o eliminar un producto
3. Recarga la página
4. Los cambios deberían persistir

## 🔍 Solución de problemas

### Error: "Failed to fetch"

**Causa**: Las rutas API no están respondiendo correctamente.

**Solución**:
1. Verifica que las variables de entorno estén configuradas en Vercel
2. Redesplega la aplicación
3. Revisa los logs en Vercel Dashboard → Functions

### Error: "No autorizado"

**Causa**: El token de administrador no coincide.

**Solución**:
1. Verifica que `ADMIN_SECRET_TOKEN` esté configurado en Vercel
2. Debe ser el mismo valor que `EXPO_PUBLIC_ADMIN_TOKEN`
3. Valor actual: `your_admin_secret_here`

### Los cambios no se guardan

**Causa**: Vercel KV no está configurado o las variables de entorno no están disponibles.

**Solución**:
1. Sigue los pasos de configuración arriba
2. Asegúrate de redesplegar después de agregar las variables
3. Verifica en los logs que diga "KV configured, saving to database"

## 📚 Recursos adicionales

- [Documentación de Vercel KV](https://vercel.com/docs/storage/vercel-kv)
- [Guía de configuración](https://vercel.com/docs/storage/vercel-kv/quickstart)

## 💡 Notas importantes

- **Sin KV configurado**: La app funciona pero los cambios solo se guardan localmente en cada dispositivo
- **Con KV configurado**: Los cambios se sincronizan entre todos los usuarios
- **Costo**: Vercel KV tiene un plan gratuito con límites generosos para proyectos pequeños
