# 📋 Instrucciones de Deploy - Vizzaro Wallpaper

## ✅ Cambios Realizados

He actualizado el backend para usar la **REST API de Vercel KV** directamente en lugar del SDK `@vercel/kv`. Esto resuelve los problemas de conexión y sincronización.

### Archivos Modificados:

1. **`api/catalog/get.js`** - Ahora usa fetch con la REST API de KV
2. **`api/catalog/update.js`** - Ahora usa fetch con la REST API de KV
3. **`contexts/WallpapersContext.tsx`** - URL actualizada a `https://www.vizzarowallpaper.com`
4. **`.env`** - URL actualizada a `https://www.vizzarowallpaper.com`

## 🚀 Pasos para Deploy

### 1. Verificar Variables de Entorno en Vercel

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables** y asegúrate de que estas variables estén configuradas:

```
KV_REST_API_URL=https://your-kv-instance.kv.vercel-storage.com
KV_REST_API_TOKEN=your_actual_token_here
ADMIN_SECRET_TOKEN=vizzaro_admin_secret_2025
```

⚠️ **IMPORTANTE**: Las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` deben tener los valores reales de tu Vercel KV, NO los placeholders.

### 2. Hacer el Deploy

En Vercel:

1. Ve a tu proyecto
2. Click en **Deployments**
3. Click en los **3 puntos** del último deployment
4. Selecciona **"Redeploy"**
5. ✅ **MARCA** la opción **"Clear build cache"**
6. Click en **"Redeploy"**

### 3. Verificar que Funciona

Una vez que el deploy termine:

#### A. Verificar el endpoint GET:
```bash
curl https://www.vizzarowallpaper.com/api/catalog/get
```

Deberías ver:
```json
{
  "success": true,
  "catalog": [...],
  "timestamp": 1234567890,
  "usingKV": true
}
```

⚠️ **Verifica que `"usingKV": true`** - Si es `false`, las variables de entorno no están configuradas correctamente.

#### B. Probar desde el Admin Panel:

1. Inicia sesión como admin
2. Ve a **Gestión de Catálogo**
3. Intenta **eliminar** un producto
4. Intenta **editar** un producto
5. Intenta **subir un Excel**

Todos los cambios deberían reflejarse inmediatamente en el catálogo público.

## 🔍 Debugging

Si algo no funciona, revisa los logs en Vercel:

1. Ve a tu proyecto en Vercel
2. Click en **Deployments**
3. Click en el deployment activo
4. Click en **"Functions"**
5. Busca los logs de `/api/catalog/get` y `/api/catalog/update`

Busca estos mensajes:

### ✅ Logs Correctos:
```
[Catalog GET] KV URL configured: true
[Catalog GET] KV Token configured: true
[Catalog GET] Fetching from KV REST API...
[Catalog GET] KV fetch successful, catalog exists: true
```

```
[Catalog UPDATE] KV URL configured: true
[Catalog UPDATE] KV Token configured: true
[Catalog UPDATE] Saving to KV using REST API...
[Catalog UPDATE] Catalog saved successfully to KV
```

### ❌ Logs con Problemas:
```
[Catalog GET] KV URL configured: false
[Catalog GET] KV Token configured: false
```

Si ves esto, significa que las variables de entorno no están configuradas correctamente en Vercel.

## 🔧 Solución de Problemas Comunes

### Problema 1: "Failed to fetch"
**Causa**: CORS o URL incorrecta
**Solución**: Verifica que `EXPO_PUBLIC_API_URL` en Vercel apunte a `https://www.vizzarowallpaper.com`

### Problema 2: "No autorizado"
**Causa**: Token de admin incorrecto
**Solución**: Verifica que `ADMIN_SECRET_TOKEN` en Vercel sea correcto.

### Problema 3: "Base de datos no configurada"
**Causa**: Variables de KV no configuradas
**Solución**: Configura `KV_REST_API_URL` y `KV_REST_API_TOKEN` en Vercel

### Problema 4: Los cambios no se reflejan
**Causa**: Cache del navegador o AsyncStorage
**Solución**: 
1. Limpia el cache del navegador (Ctrl+Shift+R)
2. En la app móvil, cierra y vuelve a abrir
3. Verifica que el timestamp en `/api/catalog/get` cambie después de cada actualización

## 📝 Notas Importantes

1. **No uses el archivo `.env` local** - Las variables de entorno deben estar en Vercel
2. **Siempre usa "Clear build cache"** cuando hagas redeploy después de cambiar variables de entorno
3. **El catálogo se actualiza cada 30 segundos** automáticamente en el frontend
4. **Los cambios en el admin deben verse inmediatamente** en el catálogo público

## ✅ Checklist Final

- [ ] Variables de entorno configuradas en Vercel
- [ ] Deploy con "Clear build cache" completado
- [ ] `/api/catalog/get` responde con `"usingKV": true`
- [ ] Puedo eliminar productos desde el admin
- [ ] Puedo editar productos desde el admin
- [ ] Puedo subir Excel desde el admin
- [ ] Los cambios se reflejan en el catálogo público
- [ ] El botón de eliminar funciona correctamente

---

Si después de seguir estos pasos todavía hay problemas, avísame y revisaremos los logs de Vercel juntos.
