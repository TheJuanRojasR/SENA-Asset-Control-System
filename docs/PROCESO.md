# Proceso de construcción — SENA Inventario

> Bitácora de construcción del Sistema de Gestión de Inventario para el SENA, Ambiente 104, sede Quirigüá.

## 1. Contexto y objetivo

Construir un sistema web moderno, rápido y mantenible que permita:

- A instructores: solicitar equipos y materiales del ambiente 104.
- A administradores: gestionar instructores, catálogo, inventario, aprobar solicitudes y registrar préstamos/devoluciones.
- Al sistema: generar alertas de stock, auditoría de movimientos y notificaciones.

## 2. Decisiones arquitectónicas iniciales

| Decisión | Justificación |
|----------|---------------|
| Monorepo ligero con `client/` y `server/` | Facilita despliegue local con Docker Compose. |
| Node.js + Express + Prisma + MySQL | Stack JavaScript unificado, tipado de Prisma y migraciones controladas. |
| React + Vite + Material-UI + TailwindCSS | DX rápida, componentes sólidos de MUI y utilidades de Tailwind. |
| ReactBits para animaciones/componentes visuales | A petición del usuario, integrado de forma controlada sin romper la identidad SENA. |
| Autenticación JWT con refresh token | Stateless, escalable y compatible con cookies httpOnly. |
| Roles ADMIN / INSTRUCTOR | Simplifica permisos y cubre los mockups entregados. |
| Docker Compose local | Entorno reproducible para desarrollo y pruebas. |
| Orquestador de agentes en `.ai/` | Herramienta interna para que futuros desarrolladores deleguen cambios con contexto. |

## 3. Estructura del repositorio

```
sena-inventario/
├── .ai/                 # Orquestación de agentes
├── client/              # React SPA
├── server/              # Express API + Prisma
├── docs/                # Documentación y ADRs
├── docker-compose.yml
└── Makefile
```

## 4. Fases ejecutadas

### Fase 0 — Fundamentos
- [x] Creación de carpetas del monorepo.
- [x] Configuración de Docker Compose (MySQL 8, API, cliente).
- [x] Variables de entorno en `.env` y `.env.example`.
- [x] Configuración de ESLint, Prettier, Husky y lint-staged.
- [x] `.gitignore` inicial.

### Fase 1 — Backend base y autenticación
- [x] `package.json` del servidor con Express, Prisma, JWT, Zod, etc.
- [x] Esquema Prisma con usuarios, ambientes, categorías, ítems, unidades, solicitudes, movimientos y notificaciones.
- [x] Middlewares: autenticación, autorización por roles, validación con Zod, manejador de errores.
- [x] Servicios y repositorios de autenticación y usuarios.
- [x] Endpoints protegidos:
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `POST /api/users` (admin)
  - `GET /api/users` (admin)
  - `GET /api/users/:id` (admin)
  - `PUT /api/users/:id` (admin)
  - `DELETE /api/users/:id` (admin)
- [x] Seed del administrador por defecto (`admin@sena.edu.co` / `AdminSENA2024`) y ambiente 104.

### Fase 2 — Frontend base y autenticación
- [x] `package.json` del cliente con React, Vite, MUI, Tailwind, Zustand, React Query, Framer Motion.
- [x] Configuración de tema SENA (colores y logo).
- [x] Layout con Navbar, Sidebar colapsable y rutas protegidas.
- [x] Página de login con fondo `DotField` interactivo y validación.
- [x] Dashboards modernos para admin e instructor con tarjetas animadas.
- [x] Integración con API mediante axios (interceptores para token y refresh).
- [x] Store de autenticación con Zustand + persistencia parcial.

### Fase 3 — CRUDs funcionales (admin)
- [x] CRUD de instructores (con turno y foto opcional).
- [x] CRUD de ambientes.
- [x] CRUD de categorías.
- [x] CRUD de ítems con generación automática de seriales genéricos.
- [x] CRUD de unidades de inventario (seriales, estados, ambientes).

### Fase 4 — Catálogo, carrito y solicitudes
- [x] Catálogo para instructores con filtros y carrito.
- [x] Store de carrito con Zustand.
- [x] Flujo completo de solicitudes:
  - Crear solicitud desde carrito.
  - Admin: aprobar, rechazar, empacar, entregar, completar.
  - Instructor: ver mis solicitudes y cancelar pendientes.
- [x] Bandeja de solicitudes y pantalla de revisión para admin.
- [x] Auditoría de movimientos (`LOAN`, `RETURN`).

### Fase 5 — Préstamos reales e ítems compuestos
- [x] Modelo de préstamo por unidad (`RequestItemUnit` con `loanedAt`, `returnedAt`, `returnedById`, `physicalStateReturned`).
- [x] Estado intermedio `PARTIALLY_RETURNED` para solicitudes.
- [x] Endpoints de préstamos: `GET /api/loans`, `POST /api/loans/return`.
- [x] Pantalla de préstamos para administrador con devolución individual y por combo.
- [x] Modelo de ítems compuestos (`ItemComponent`, `parentUnitId` en `InventoryUnit`).
- [x] Endpoints de ensamblaje/desensamblaje: `POST /api/inventory/:id/assemble`, `POST /api/inventory/:id/disassemble`, `GET /api/inventory/:id/detail`.
- [x] Formulario de ítems con sección de componentes y ensamblaje desde el inventario.
- [x] Seed completo con ítems simples, componentes, torres ensambladas y solicitudes de ejemplo.

### Fase 6 — Próximos pasos
- [ ] Notificaciones en tiempo real con Socket.io.
- [ ] Reportes e historial de movimientos por ítem.
- [ ] Tests E2E con Playwright.
- [ ] Perfil de usuario editable.
- [ ] Despliegue en producción documentado.

## 5. Endpoints de la API

### Autenticación
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Usuarios (admin)
- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

### Ambientes (admin)
- `GET /api/environments`
- `POST /api/environments`
- `GET /api/environments/:id`
- `PUT /api/environments/:id`
- `DELETE /api/environments/:id`

### Categorías
- `GET /api/categories`
- `POST /api/categories` (admin)
- `GET /api/categories/:id`
- `PUT /api/categories/:id` (admin)
- `DELETE /api/categories/:id` (admin)

### Ítems
- `GET /api/items`
- `POST /api/items` (admin)
- `GET /api/items/:id`
- `PUT /api/items/:id` (admin)
- `DELETE /api/items/:id` (admin)

### Inventario
- `GET /api/inventory`
- `GET /api/inventory/low-stock`
- `POST /api/inventory` (admin)
- `GET /api/inventory/:id`
- `PUT /api/inventory/:id` (admin)
- `DELETE /api/inventory/:id` (admin)
- `GET /api/inventory/:id/detail` (admin)
- `POST /api/inventory/:id/assemble` (admin)
- `POST /api/inventory/:id/disassemble` (admin)

### Ítems compuestos
- `GET /api/items/:id/components`
- `POST /api/items/:id/components` (admin)
- `PUT /api/items/:id/components/:componentId` (admin)
- `DELETE /api/items/:id/components/:componentId` (admin)

### Solicitudes
- `GET /api/requests`
- `POST /api/requests` (instructor)
- `GET /api/requests/:id`
- `PUT /api/requests/:id/approve` (admin)
- `PUT /api/requests/:id/reject` (admin)
- `PUT /api/requests/:id/pack` (admin)
- `PUT /api/requests/:id/deliver` (admin)
- `PUT /api/requests/:id/complete` (admin)
- `DELETE /api/requests/:id` (instructor, solo PENDING)

### Préstamos
- `GET /api/loans`
- `POST /api/loans/return` (admin)

## 6. Cómo levantar el proyecto

```bash
# Desde la raíz del proyecto
docker compose up -d --build

# Ver logs
docker compose logs -f

# Crear la base de datos de tests (solo la primera vez)
docker compose exec db mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS sena_inventario_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON sena_inventario_test.* TO 'sena_user'@'%'; FLUSH PRIVILEGES;"

# Reiniciar base de datos con seed (usar root para migraciones)
docker compose exec api sh -c "export DATABASE_URL=\$MIGRATE_DATABASE_URL && npx prisma migrate reset --force"

# Ejecutar tests (el backend usa automáticamente DATABASE_URL_TEST cuando NODE_ENV=test)
docker compose exec api npm test
docker compose exec client npm test

# Ejecutar lint
docker compose exec api npm run lint
docker compose exec client npm run lint
```

- API: http://localhost:4000
- Documentación Swagger: http://localhost:4000/api-docs
- Cliente: http://localhost:5173
- Adminer (gestor visual de MySQL): http://localhost:8080
  - Servidor: `db`
  - Usuario: `root`
  - Contraseña: `root`
  - Base de datos: `sena_inventario_dev`
- MySQL local expuesto en el puerto `3307` (configurable en `.env`)

## 7. Credenciales iniciales

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `admin@sena.edu.co` | `AdminSENA2024` | Administrador |
| `cmendoza@sena.edu.co` | `Instructor2024` | Instructor (turno mañana) |
| `mgomez@misena.edu.co` | `Instructor2024` | Instructor (turno tarde) |
| `ltorres@misena.edu.co` | `Instructor2024` | Instructor (turno noche) |

## 8. Uso del orquestador de agentes

Ver `.ai/README.md` para instrucciones de uso.

## 9. Notas

- Los correos institucionales no están configurados aún; se dejó preparado el lugar para un servicio SMTP local cuando se apruebe.
- El sistema está pensado para funcionar localmente en Docker; el despliegue en producción se documentará más adelante.
- Todos los ítems, incluso los de consumo, se manejan con unidades seriadas para mantener trazabilidad completa.
- El backend ahora usa una base de datos de tests separada (`sena_inventario_test`) configurada en `DATABASE_URL_TEST`, evitando que los tests borren los datos de desarrollo.
- El seed es idempotente: puede ejecutarse varias veces sin duplicar usuarios, categorías, ítems ni solicitudes.
- CORS está configurado para aceptar tanto `http://localhost:5173` como `http://127.0.0.1:5173` (separados por coma en `CLIENT_URL`).
