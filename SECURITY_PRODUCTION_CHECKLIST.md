# Security & Production Checklist ✅

Este documento confirma las mejoras de seguridad implementadas para tu app Vizzaro Wallpaper.

## ✅ Completado

### 1. ✅ Validación Estricta con Zod
- **Implementado:** Schemas de validación en `api/_schemas.js`
- **Cobertura:** 
  - Login/registro de usuarios
  - Creación de pedidos
  - Actualización de catálogo y colecciones
  - Verificación de emails
- **Beneficios:** Rechaza datos malformados con errores descriptivos (422)

### 2. ✅ Operaciones Atómicas en Base de Datos
- **Antes:** Read-modify-write causaba race conditions
- **Ahora:** 
  - Orders usan `lpush` para agregar a listas por usuario
  - Catalog guarda items individuales por ID
  - Evita pérdida de datos en escrituras concurrentes
- **Archivos:** `api/orders/create.js`, `api/catalog/update.js`

### 3. ✅ Autenticación JWT Completa
- **Middleware:** `api/_authMiddleware.js` con `verifyToken` y `requireAuth`
- **Endpoints Protegidos:**
  - `/api/orders/*` - Requiere JWT válido
  - `/api/favorites/*` - Requiere JWT válido
  - `/api/catalog/update` - Requiere admin token
- **Features:**
  - Tokens con expiración (7 días)
  - Verificación de firma JWT
  - Headers `Authorization: Bearer <token>`
  - Usuarios solo acceden a sus propios datos

### 4. ✅ CORS Endurecido
- **Antes:** Permitía `*` en producción
- **Ahora:**
  - Producción: Solo dominios whitelistados
    - `https://www.vizzarowallpaper.com`
    - `https://vizzarowallpaper.com`
  - Dev: Localhost + dominios de producción
  - Variable de entorno: `ALLOWED_ORIGINS` (CSV)
- **Archivo:** `api/_cors.js`

### 5. ✅ Rate Limiting + IP Blocking
- **Features:**
  - Límites por endpoint y por IP
  - Conteo de violaciones
  - Bloqueo automático tras 3 violaciones en 1 minuto
  - Duración de bloqueo: 15 minutos
  - Headers `X-RateLimit-*` en respuestas
- **Límites:**
  - Auth/Login: 5 req/min
  - Email: 3 req/min
  - Otros endpoints: 30 req/min
- **Archivo:** `api/_rateLimit.js`

### 6. ✅ Monitoreo con Sentry
- **Instalado:** `@sentry/react-native`
- **Configuración:** `sentry.config.ts`
- **Inicialización:** `app/_layout.tsx`
- **Para activar:**
  1. Crea cuenta en https://sentry.io
  2. Agrega `EXPO_PUBLIC_SENTRY_DSN` a `.env`
  3. Deploy variables en Vercel
- **Beneficios:**
  - Tracking de crashes en producción
  - Stack traces detallados
  - Alertas en tiempo real

---

## 🔧 Variables de Entorno Requeridas para Producción

Asegúrate de configurar estas en Vercel → Settings → Environment Variables:

```bash
# JWT Secret (CRÍTICO - genera uno único)
JWT_SECRET=tu_secreto_super_seguro_y_largo_aqui_2025

# Admin Token (CRÍTICO - cambia el default)
ADMIN_SECRET_TOKEN=tu_token_de_admin_seguro_2025

# Vercel KV (si aún no está)
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...

# CORS (opcional - defaults a producción)
ALLOWED_ORIGINS=https://www.vizzarowallpaper.com,https://vizzarowallpaper.com

# Sentry (opcional pero recomendado)
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

---

## 📊 Arquitectura de Seguridad

```
Cliente (Mobile/Web)
    ↓ JWT Token in Authorization header
    ↓
CORS Check (_cors.js)
    ↓
Rate Limiting (_rateLimit.js) → IP Blocking si excede límites
    ↓
JWT Verification (_authMiddleware.js) → 401 si inválido/expirado
    ↓
Zod Validation (_schemas.js) → 422 si datos inválidos
    ↓
Business Logic (endpoints)
    ↓
Vercel KV (operaciones atómicas)
    ↓
Response + Error Tracking (Sentry)
```

---

## 🚨 Próximos Pasos Recomendados

1. **Cambiar Secrets de Producción:**
   - Genera `JWT_SECRET` con al menos 64 caracteres aleatorios
   - Genera `ADMIN_SECRET_TOKEN` único
   - Agrega a Vercel env vars

2. **Configurar Sentry:**
   - Crear proyecto en sentry.io
   - Copiar DSN a `EXPO_PUBLIC_SENTRY_DSN`

3. **Testing de Seguridad:**
   - Intentar acceder a `/api/orders/get` sin token → debe dar 401
   - Hacer 6+ requests/min a login → debe bloquear IP
   - Intentar crear order con token de otro usuario → debe dar 403

4. **Monitoring en Producción:**
   - Revisar logs en Vercel Dashboard
   - Configurar alertas en Sentry
   - Monitor rate limit violations

---

## 📝 Notas Técnicas

### JWT Flow
1. User hace login → backend genera JWT con `userId`, `email`, `name`
2. Frontend guarda token en AsyncStorage
3. Todas las requests protegidas envían `Authorization: Bearer <token>`
4. Backend verifica firma y extrae `userId` del payload
5. Endpoints validan que el usuario solo acceda a sus propios datos

### Race Conditions Resueltas
- **Antes:** `GET all orders → modify array → SET all orders` (no atómico)
- **Ahora:** `LPUSH order:user:{userId} {orderId}` (atómico)
- Múltiples usuarios pueden crear orders simultáneamente sin conflictos

### Rate Limiting Inteligente
- Cuenta violaciones acumulativas
- Threshold: 3 violaciones = bloqueo de 15 minutos
- Cleanup automático cada minuto
- Compatible con proxies (lee `x-forwarded-for`)

---

## ✅ Confirmación Final

**Todos los puntos del checklist original están completos:**

- [x] Validación estricta con Zod
- [x] Operaciones atómicas en DB
- [x] JWT/session tokens implementados
- [x] CORS endurecido (sin wildcards en prod)
- [x] Rate limiting + IP blocking
- [x] Sentry configurado para monitoreo

**Estado:** ✅ LISTO PARA PRODUCCIÓN

Recuerda cambiar los secrets antes del deploy final.
