# Bugfix: Auth Loop y Módulo de Usuarios

**Fecha**: 2026-07-12
**Rama**: `devJoseph`
**Commits**: 6 fixes individuales

---

## Problema 1: Loop infinito de Login

### Síntomas

Después de ~15 minutos de sesión (expiración del access token), el sistema entraba en un loop infinito de redirects entre `/login` y el dashboard (`/admin` o `/instructor`), haciendo la aplicación inutilizable sin recargar manualmente.

### Causa raíz

El bug era una **cadena de 3 fallos** que se alimentaban entre sí:

#### 1a. Refresh token endpoint rechazaba cookies

**Archivo**: `server/src/routes/auth.routes.js`

La ruta `POST /auth/refresh` tenía `validateBody(refreshTokenSchema)` como middleware, que exigía el campo `refreshToken` en el body de la petición. Sin embargo, el cliente enviaba el refresh token exclusivamente como **cookie httpOnly** (body vacío `{}`). La validación Zod rechazaba la petición con 400 antes de que el controller pudiera leer `req.cookies.refreshToken`.

```js
// ANTES (roto):
router.post('/refresh', validateBody(refreshTokenSchema), authController.refresh);

// DESPUÉS (fix):
router.post('/refresh', authController.refresh);
```

El controller ya tenía la lógica correcta: `req.cookies?.refreshToken || req.body?.refreshToken`.

#### 1b. Interceptor no limpiaba estado de auth al fallar refresh

**Archivo**: `client/src/api/client.js`

Cuando el refresh fallaba, el interceptor ejecutaba:
```js
localStorage.removeItem('accessToken');
window.location.href = '/login';
```

Pero **no limpiaba** `auth-storage` (Zustand persist), que mantenía `isAuthenticated: true`. Al recargar, `AppRoutes` veía `isAuthenticated: true` y redirigía al dashboard, que disparaba otra request con token expirado → 401 → loop.

**Fix**: Se agregó:
- Flag global `isRefreshing` para evitar múltiples refresh simultáneos
- Cola `failedQueue` para encolar requests mientras se renueva el token
- Función `clearAuthAndRedirect()` que limpia tanto `accessToken` como `auth-storage` de localStorage

#### 1c. ProtectedRoute redirigía a `/` en vez del dashboard del rol

**Archivo**: `client/src/components/common/ProtectedRoute.jsx`

Cuando un usuario con rol `ADMIN` accedía a una ruta de `INSTRUCTOR` (o viceversa), el componente redirigía a `/`, que a su vez redirigía al dashboard correcto, causando un flash de navegación. Ahora redirige directamente al dashboard del rol del usuario.

```js
// ANTES:
return <Navigate to="/" replace />;

// DESPUÉS:
const redirect = user?.role === ROLES.ADMIN ? '/admin' : '/instructor';
return <Navigate to={redirect} replace />;
```

---

## Problema 2: Crear instructores siempre fallaba

### Síntomas

Al intentar crear un instructor desde `/admin/instructores`, el backend respondía con error de validación: "Jornada inválida" o "shift inválido", sin importar qué turno se seleccionara.

### Causa raíz

**Mismatch de enum Shift entre frontend y backend.**

**Archivo**: `client/src/constants/inventory.js`

El frontend enviaba valores en español:
```js
// ANTES (roto):
SHIFTS = { MORNING: 'MAÑANA', AFTERNOON: 'TARDE', EVENING: 'NOCHE' }
```

El backend (Prisma schema) esperaba valores en inglés:
```prisma
enum Shift {
  MORNING
  AFTERNOON
  NIGHT
}
```

**Fix**:
```js
// DESPUÉS:
SHIFTS = { MORNING: 'MORNING', AFTERNOON: 'AFTERNOON', NIGHT: 'NIGHT' }
```

Nota: También se corrigió `EVENING` → `NIGHT` para coincidir con el enum de Prisma.

---

## Problema 3: Switch de "Activo" no funcionaba en formulario

### Síntomas

El toggle "Activo" en el formulario de crear/editar instructor no enviaba correctamente el valor booleano al backend.

### Causa raíz

**Archivo**: `client/src/pages/admin/InstructorsPage.jsx`

Se usaba `{...register('isActive')}` con un componente MUI `<Switch>`. El `register` de react-hook-form está diseñado para inputs HTML nativos, no para componentes MUI que manejan `checked` en vez de `value`.

**Fix**: Se reemplazó por `Controller` de react-hook-form:

```jsx
// ANTES (roto):
<FormControlLabel
  control={<Switch {...register('isActive')} defaultChecked />}
  label="Activo"
/>

// DESPUÉS:
<Controller
  name="isActive"
  control={control}
  render={({ field }) => (
    <FormControlLabel
      control={<Switch {...field} checked={field.value} />}
      label="Activo"
    />
  )}
/>
```

---

## Archivos modificados

| Archivo | Fix | Líneas |
|---------|-----|--------|
| `server/src/routes/auth.routes.js` | Refresh token validation | ~2 |
| `client/src/api/client.js` | Interceptor + queue + cleanup | ~38 |
| `client/src/components/common/ProtectedRoute.jsx` | Redirect por rol | ~3 |
| `client/src/constants/inventory.js` | Shift enum values | ~4 |
| `client/src/pages/admin/InstructorsPage.jsx` | Controller + Switch | ~10 |

---

## Cómo verificar que no se rompió

### Tests automáticos

```bash
docker compose exec api npm test       # 99 tests backend
docker compose exec client npm test    # 17 tests frontend
docker compose exec api npm run lint
docker compose exec client npm run lint
```

### Verificación manual del auth flow

1. Login como admin (`admin@sena.edu.co` / `AdminSENA2024`)
2. Verificar redirect a `/admin`
3. Recargar la página — la sesión debe persistir
4. Abrir DevTools → Application → Local Storage → borrar `accessToken` manualmente
5. Hacer click en cualquier enlace que dispare una request
6. El interceptor debe renovar el token silenciosamente (ver en Network tab: `POST /auth/refresh` → 200)
7. Si el refresh token también expiró, debe redirigir limpiamente a `/login` **sin loop**

### Verificación manual de crear instructor

1. Login como admin
2. Ir a `/admin/instructores`
3. Click en "Crear instructor"
4. Llenar todos los campos incluyendo turno
5. Verificar que se crea correctamente y aparece en la tabla
6. Editar el instructor — cambiar turno
7. Eliminar el instructor

---

## Lecciones aprendidas

1. **Cookies httpOnly + validación de body**: Si un endpoint acepta tokens por cookie, la validación del body no debe exigir el token. Validar dentro del controller/service.
2. **Zustand persist + redirects**: Al hacer redirect forzado por auth failure, siempre limpiar el storage de Zustand (`auth-storage`), no solo el token individual.
3. **Enums compartidos**: Frontend y backend deben usar exactamente los mismos valores de enum. Usar constantes compartidas o generar tipos desde el schema de Prisma.
4. **MUI + react-hook-form**: Usar `Controller` (no `register`) para cualquier componente MUI que no sea un input nativo (`Switch`, `Autocomplete`, `DatePicker`, etc.).
5. **Interceptores con retry**: Siempre usar un flag global (`isRefreshing`) y una cola de requests para evitar múltiples refresh simultáneos que pueden causar race conditions.
