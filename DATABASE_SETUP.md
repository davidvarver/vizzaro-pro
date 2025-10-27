# 🗄️ Configuración de Base de Datos - Vizzaro Wallpaper

## 📊 Estado Actual

Tu aplicación ahora usa **Vercel KV** como base de datos centralizada para sincronizar datos entre todos los usuarios.

### ✅ Datos Sincronizados con Base de Datos:
- **Catálogo de Papeles Tapiz** - Todos los productos
- **Pedidos (Orders)** - Historial de pedidos de clientes
- **Usuarios** - Registro e inicio de sesión
- **Favoritos** - Proyectos guardados por cada usuario

### 📱 Datos Solo Locales (AsyncStorage):
- **Carrito de Compras** - Se mantiene local por diseño (datos temporales)
- **Sesión de Administrador** - Token de autenticación

---

## ⚙️ Configuración Requerida

### 1. Crear Base de Datos Vercel KV

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a la pestaña **Storage**
4. Haz clic en **Create Database**
5. Selecciona **KV** (Key-Value Store)
6. Dale un nombre: `vizzaro-wallpaper-db`
7. Haz clic en **Create**

### 2. Conectar a tu Proyecto

1. Después de crear la base de datos, haz clic en **Connect to Project**
2. Selecciona tu proyecto
3. Haz clic en **Connect**
4. Vercel agregará automáticamente las variables de entorno

### 3. Verificar Variables de Entorno

Ve a **Settings** → **Environment Variables** y verifica que existan:

```env
KV_REST_API_URL=https://your-kv-url.upstash.io
KV_REST_API_TOKEN=your_token_here
KV_REST_API_READ_ONLY_TOKEN=your_readonly_token_here
```

También necesitas estas variables para la app:

```env
EXPO_PUBLIC_API_URL=https://tu-proyecto.vercel.app
EXPO_PUBLIC_ADMIN_TOKEN=vizzaro_admin_secret_2025
ADMIN_SECRET_TOKEN=vizzaro_admin_secret_2025
```

### 4. Redesplegar

1. Ve a **Deployments**
2. Haz clic en los tres puntos del último deployment
3. Selecciona **Redeploy**
4. Espera a que termine

---

## 🔑 Estructura de Datos en KV

Tu base de datos almacena los siguientes "keys":

### `wallpapers_catalog`
```json
[
  {
    "id": "1",
    "name": "Papel Tapiz Moderno",
    "price": 299.99,
    "image": "...",
    "category": "Moderno",
    "inStock": true
  }
]
```

### `orders`
```json
[
  {
    "id": "1234567890",
    "customerName": "Juan Pérez",
    "customerEmail": "juan@example.com",
    "items": [...],
    "total": 599.98,
    "status": "pending",
    "createdAt": "2025-01-..."
  }
]
```

### `users`
```json
[
  {
    "id": "1234567890",
    "email": "usuario@example.com",
    "password": "hashed_password",
    "name": "Usuario",
    "createdAt": "2025-01-..."
  }
]
```

### `favorites` o `favorites_<userId>`
```json
[
  {
    "id": "1234567890",
    "name": "Mi Proyecto",
    "roomType": "Sala",
    "wallpapers": [...],
    "dateCreated": "2025-01-..."
  }
]
```

---

## 🔄 APIs Disponibles

### Catálogo
- `GET /api/catalog/get` - Obtener catálogo
- `POST /api/catalog/update` - Actualizar catálogo (requiere adminToken)

### Pedidos
- `GET /api/orders/get` - Obtener todos los pedidos
- `POST /api/orders/create` - Crear nuevo pedido
- `POST /api/orders/update` - Actualizar pedido (requiere adminToken)
- `POST /api/orders/delete` - Eliminar pedido (requiere adminToken)

### Usuarios
- `POST /api/users/register` - Registrar usuario
- `POST /api/users/login` - Iniciar sesión

### Favoritos
- `GET /api/favorites/get?userId=<id>` - Obtener favoritos de usuario
- `POST /api/favorites/update` - Actualizar favoritos

---

## ✅ Verificar que Todo Funciona

### Paso 1: Verificar Catálogo
1. Abre tu app
2. Ve a la sección de productos
3. Los productos deben cargarse desde la base de datos
4. En la consola verás: `[WallpapersContext] Loaded from API: X items`

### Paso 2: Crear un Pedido
1. Agrega productos al carrito
2. Completa el checkout
3. El pedido debe guardarse en la base de datos
4. En la consola verás: `[OrdersContext] Order created via API`

### Paso 3: Panel de Administración
1. Inicia sesión como admin (usuario: `admin`, contraseña: `admin123`)
2. Ve a **Órdenes** → Debes ver los pedidos sincronizados
3. Ve a **Catálogo** → Debes ver y poder editar productos
4. Los cambios se sincronizan para todos los usuarios

### Paso 4: Registro de Usuarios
1. Registra un nuevo usuario
2. Verifica el código por email
3. El usuario se guarda en la base de datos
4. En la consola verás: `[AuthContext] User registered via API`

---

## 🐛 Solución de Problemas

### Error: "Base de datos no configurada"
**Causa**: Vercel KV no está configurado o las variables no están disponibles.

**Solución**:
1. Verifica que creaste la base de datos KV en Vercel
2. Verifica que las variables estén en Settings → Environment Variables
3. Redesplega la aplicación
4. Espera unos minutos para que los cambios se apliquen

### Los cambios no se sincronizan
**Causa**: La app no puede conectarse a la API.

**Solución**:
1. Verifica que `EXPO_PUBLIC_API_URL` esté configurado correctamente
2. Debe ser la URL de tu proyecto en Vercel (ej: `https://tu-proyecto.vercel.app`)
3. NO incluyas `/api/` al final
4. Redesplega y limpia la caché del navegador

### Error: "No autorizado" al actualizar catálogo
**Causa**: El token de administrador no coincide.

**Solución**:
1. Verifica que tanto `ADMIN_SECRET_TOKEN` como `EXPO_PUBLIC_ADMIN_TOKEN` tengan el mismo valor
2. Valor por defecto: `vizzaro_admin_secret_2025`
3. Puedes cambiarlo por uno más seguro
4. Cierra sesión y vuelve a iniciar sesión como admin

### Los pedidos antiguos no aparecen
**Causa**: Los pedidos estaban solo en AsyncStorage local.

**Solución**:
- Los pedidos anteriores solo existen en el dispositivo donde se crearon
- Los nuevos pedidos se guardarán en la base de datos y serán visibles desde cualquier lugar
- Si quieres migrar pedidos antiguos, contáctame

### Error de red al crear pedido
**Causa**: No hay conexión a internet o el servidor no responde.

**Solución**:
1. La app tiene un sistema de fallback
2. Si no puede conectarse a la API, guarda localmente
3. Cuando recupere la conexión, los datos se sincronizarán automáticamente
4. Verifica tu conexión a internet

---

## 🔐 Seguridad

### Tokens de Administrador
- Cambia `ADMIN_SECRET_TOKEN` por un valor único y seguro
- No compartas el token con nadie
- Si crees que está comprometido, cámbialo inmediatamente

### Passwords de Usuarios
⚠️ **IMPORTANTE**: Las contraseñas actualmente se guardan en texto plano.

**Para producción, debes**:
1. Implementar hashing de contraseñas (bcrypt)
2. Usar tokens JWT para autenticación
3. Implementar HTTPS en todas las APIs

### Permisos
- Solo los administradores pueden modificar el catálogo
- Solo los administradores pueden actualizar/eliminar pedidos
- Los usuarios solo pueden ver sus propios favoritos

---

## 📈 Monitoreo

### Ver Logs en Vercel
1. Ve a tu proyecto en Vercel
2. Haz clic en **Functions**
3. Selecciona una función (ej: `api/orders/get.js`)
4. Verás los logs en tiempo real

### Datos en Vercel KV
1. Ve a **Storage** en tu proyecto
2. Haz clic en tu base de datos KV
3. Usa la pestaña **Data Browser** para ver los datos
4. Puedes ver, editar y eliminar keys manualmente

---

## 🚀 Próximos Pasos para Producción

### Mejoras Recomendadas:

1. **Seguridad**
   - [ ] Implementar hashing de contraseñas
   - [ ] Usar tokens JWT
   - [ ] Rate limiting en las APIs
   - [ ] Validación de inputs

2. **Performance**
   - [ ] Implementar paginación en pedidos
   - [ ] Caché de catálogo
   - [ ] Optimización de imágenes

3. **Features**
   - [ ] Notificaciones push cuando cambia el estado del pedido
   - [ ] Panel de analytics para administradores
   - [ ] Exportar pedidos a CSV/Excel
   - [ ] Búsqueda y filtros avanzados

4. **Backup**
   - [ ] Configurar backups automáticos de KV
   - [ ] Sistema de recuperación de datos

---

## 💡 Tips

- **Durante desarrollo**: Usa `console.log` extensivamente para debuggear
- **Antes de publicar**: Cambia todos los tokens por valores seguros
- **Testing**: Prueba en modo incógnito para simular nuevos usuarios
- **Monitoreo**: Revisa los logs diariamente en los primeros días

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en la consola del navegador
2. Revisa los logs de las funciones en Vercel
3. Verifica que todas las variables de entorno estén configuradas
4. Asegúrate de haber redesplegado después de cada cambio

---

## ✨ ¡Listo para Producción!

Una vez que hayas:
- ✅ Configurado Vercel KV
- ✅ Verificado que todas las APIs funcionan
- ✅ Probado crear pedidos, usuarios y editar catálogo
- ✅ Cambiado los tokens por valores seguros

**Tu app estará lista para publicar** y todos los datos estarán sincronizados en la nube. 🎉
