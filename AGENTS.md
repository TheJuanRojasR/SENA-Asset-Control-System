# AGENTS.md — SENA Asset Control System

> Contexto y guía de trabajo para agentes de código que colaboren en este proyecto.

## 1. Propósito del proyecto

Sistema web para gestionar el inventario y las solicitudes de equipos del **Ambiente 104 del SENA Quirigüá**.
Soporta dos roles: **ADMIN** e **INSTRUCTOR**, con trazabilidad completa por serial, préstamos/devoluciones reales e ítems compuestos.

## 2. Arquitectura y estructura

Monorepo ligero con Docker Compose:

```text
/
├── client/                 # React + Vite + Material-UI + TailwindCSS
│   ├── src/
│   │   ├── api/            # Clientes axios por dominio
│   │   ├── components/     # Componentes reutilizables (ui, common)
│   │   ├── pages/          # Páginas por rol (admin/, instructor/)
│   │   ├── stores/         # Zustand stores (auth, cart)
│   │   ├── constants/      # Colores SENA, estados, roles
│   │   └── utils/          # Helpers de API
│   └── tests/              # Tests con Vitest + Testing Library
├── server/                 # Node.js + Express + Prisma + MySQL
│   ├── src/
│   │   ├── config/         # Variables de entorno
│   │   ├── controllers/    # Controladores HTTP
│   │   ├── middlewares/    # Auth, roles, errores
│   │   ├── routes/         # Rutas de la API
│   │   ├── services/       # Lógica de negocio
│   │   ├── repositories/   # Acceso a datos con Prisma
│   │   ├── validations/    # Esquemas Zod
│   │   └── utils/          # Helpers
│   ├── prisma/
│   │   ├── schema.prisma   # Modelo de datos
│   │   ├── migrations/     # Migraciones SQL
│   │   └── seeders/        # Seed de datos de prueba
│   └── tests/              # Tests de integración con Jest
├── docs/
│   ├── PROCESO.md          # Bitácora de construcción
│   └── Mockup_Sena_Inventario.pdf
├── .ai/                    # Orquestador de agentes
├── docker-compose.yml
├── Makefile
├── README.md
└── CONTRIBUTING.md
```

## 3. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18, Vite, Material-UI 5, TailwindCSS, Framer Motion, React Query, Zustand, React Hook Form, Zod |
| Backend | Node.js 20, Express, Prisma ORM, MySQL 8, JWT, Socket.io (preparado), Swagger |
| Calidad | ESLint, Prettier, Husky, lint-staged, Jest, Vitest, Testing Library |
| Infra | Docker Compose |

## 4. Cómo levantar el proyecto

Requisitos: Docker + Docker Compose.

```bash
# Copiar variables de entorno
cp .env.example .env

# Levantar todo
docker compose up -d --build

# Ver logs
docker compose logs -f
```

Servicios resultantes:

- Cliente: http://localhost:5173
- API: http://localhost:4000
- Swagger: http://localhost:4000/api-docs
- Adminer: http://localhost:8080 (servidor `db`, usuario `root`, pass `root`)
- MySQL expuesto en: localhost:3307

Credenciales de prueba:

- Admin: `admin@sena.edu.co` / `AdminSENA2024`
- Instructores: `cmendoza@sena.edu.co`, `mgomez@misena.edu.co`, `ltorres@misena.edu.co` / `Instructor2024`

## 5. Base de datos y seed

```bash
# Crear BD de tests (solo primera vez)
docker compose exec db mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS sena_inventario_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON sena_inventario_test.* TO 'sena_user'@'%'; FLUSH PRIVILEGES;"

# Resetear dev con seed completo
docker compose exec api sh -c "export DATABASE_URL=\$MIGRATE_DATABASE_URL && npx prisma migrate reset --force"

# Generar cliente Prisma
docker compose exec api npx prisma generate

# Nueva migración
docker compose exec api sh -c "export DATABASE_URL=\$MIGRATE_DATABASE_URL && npx prisma migrate dev --name <nombre>"
```

El seed es idempotente; puede ejecutarse varias veces sin duplicar datos clave.

## 6. Cómo testear

```bash
# Backend
docker compose exec api npm test

# Frontend
docker compose exec client npm test

# Lint
docker compose exec api npm run lint
docker compose exec client npm run lint

# O desde la raíz (Makefile)
make test
make test-client
make lint   # si existe el target
```

La base de datos de tests es `sena_inventario_test`; los tests de backend la usan automáticamente cuando `NODE_ENV=test` gracias a `DATABASE_URL_TEST`.

## 7. Convenciones de trabajo

- **Ramas**: `main` producción, `develop` integración, `dev<Nombre>` ramas personales.
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`).
- **Estilo**: ESLint + Prettier. Husky ejecuta lint-staged antes de cada commit.
- **Tests**: todo cambio que afecte lógica debe ir acompañado de tests que pasen.

## 8. Cómo extender el sistema

### Agregar un nuevo CRUD en el backend

1. Definir modelo en `server/prisma/schema.prisma` y migrar.
2. Crear validación en `server/src/validations/<dominio>.validation.js`.
3. Crear repositorio en `server/src/repositories/<dominio>.repository.js`.
4. Crear servicio en `server/src/services/<dominio>.service.js`.
5. Crear controlador en `server/src/controllers/<dominio>.controller.js`.
6. Crear rutas en `server/src/routes/<dominio>.routes.js`.
7. Exportar en `server/src/routes/index.js`.
8. Agregar tests en `server/tests/integration/<dominio>.test.js`.

### Agregar una nueva página en el frontend

1. Crear página en `client/src/pages/<rol>/<NombrePage>.jsx`.
2. Crear API client en `client/src/api/<dominio>.api.js`.
3. Usar `PageContainer`, `DataTable`, `DashboardCard`, `ConfirmDialog`, `Toast`.
4. Registrar ruta en `client/src/routes/AppRoutes.jsx`.
5. Agregar enlace en `Sidebar` si aplica.
6. Agregar tests en `client/tests/` si hay lógica nueva.

### Escalabilidad / próximos procesos sugeridos

- Notificaciones en tiempo real con Socket.io (infra ya lista en `app.js`).
- Reportes de movimientos y préstamos por ítem/instructor.
- Tests E2E con Playwright.
- Perfil de usuario editable.
- Importación masiva de inventario desde Excel/CSV.
- Alertas automáticas por correo o dashboard cuando stock esté bajo.

## 9. Notas importantes

- Todos los ítems tienen unidades seriadas para trazabilidad.
- Los ítems compuestos se modelan con `ItemComponent` y `parentUnitId`.
- Los préstamos reales se registran en `RequestItemUnit` con fechas y estado físico.
- **Reserva inmediata de stock**: crear una solicitud (PENDING) reserva unidades
  (`AVAILABLE` → `RESERVED`) en la misma transacción; cancelar/rechazar las libera.
  Detalle en `docs/MEJORAS_CARRITO.md` (Parte 2).
- **Expiración de reservas**: `reservationCleanup.service.js` (node-cron, cada hora +
  pasada al arrancar) cancela solicitudes PENDING con más de 24 h y libera sus
  unidades. Configurable con `RESERVATION_TIMEOUT_HOURS` y `RESERVATION_CLEANUP_CRON`.
- La API de ítems retorna `available` y, para compuestos, `complete`/`incomplete`
  con el detalle de componentes faltantes por unidad.
- No se envían correos por ahora; se dejó preparado el lugar para un servicio SMTP.
- CORS acepta `http://localhost:5173` y `http://127.0.0.1:5173` (configurable en `CLIENT_URL`).

## 10. Contacto / autores

Ver `README.md` y `CONTRIBUTING.md` para más detalles sobre autores y flujo de colaboración.
