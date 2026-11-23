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
│   ├── user-stories/       # Especificación funcional: 13 documentos
│   ├── historia/           # Bitácora y reportes de bugs (histórico)
│   └── mockups/            # Material de diseño
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

- Los equipos se controlan con unidades seriadas para trazabilidad; los consumibles, por cantidad
  (`RN-INV-06`).
- Los ítems compuestos se modelan con `ItemComponent` y `parentUnitId`.
- Los préstamos reales se registran en `RequestItemUnit` con fechas y estado físico.
- **Expiración automática de reservas**: `server/src/services/reservationCleanup.service.js`
  arranca un `node-cron` desde `app.js` (expresión `0 * * * *` por defecto) y cancela las
  solicitudes pendientes más antiguas que `RESERVATION_TIMEOUT_HOURS` (24 por defecto). El
  negocio fija otra regla —2 días con corte a las 23:59, `RN-SOL-07`—, así que ese parámetro
  está en deuda con la especificación.
- **Las reglas de negocio no están en este archivo: están en
  [`docs/user-stories/00-contexto-negocio.md`](docs/user-stories/00-contexto-negocio.md).**
  Cuando este documento y la especificación difieren, la especificación es la fuente y el
  código es la deuda; las contradicciones conocidas están registradas en §9 de ese documento.
- La implementación de cada módulo se especifica en `docs/user-stories/`: autenticación (01),
  usuarios (02), ambientes (03), ítems (04), inventario (05), solicitudes (06), préstamos (07),
  catálogo (08), categorías (10), movimientos (11) y paneles (12). El índice está en
  [`docs/user-stories/README.md`](docs/user-stories/README.md).
- No se envían correos: no hay servicio de correo configurado (`RN-NOT-02`).
- CORS acepta `http://localhost:5173` y `http://127.0.0.1:5173` (configurable en `CLIENT_URL`).

## 10. Reparto del equipo y verificación

- **Procesos del equipo** —cadencia de sprints, tablero, definición de listo y terminado, reglas
  de PR y métricas—: [`.ai/procesos.md`](.ai/procesos.md).

- **El trabajo vive en las issues de GitHub**, no en este archivo: cada persona filtra por su
  assignee (`gh issue list --assignee @me --state open`) y ahí está el cuerpo completo de la
  historia con sus criterios. El índice de módulos, historias y criterios es el issue `#81`.
- **Reglas de trabajo** —roles, qué módulo verifica cada quien, propiedad de los archivos
  compartidos, definición de terminado de un criterio y regla de independencia—:
  [`.ai/reparto.md`](.ai/reparto.md).
- **Prompt global para agentes**: [`.ai/agentes/global.prompt.md`](.ai/agentes/global.prompt.md).
  El orquestador (`.ai/orquestador.mjs`) lo antepone a cualquier tarea, así que el rol de cada
  agente no repite el contexto del sistema.
- **Un criterio se marca `OK` o `GAP` solo cuando su test corre**, nunca por lectura de código, y el
  test lleva el id del criterio en el nombre (`it('AC-INV-04-1 …')`).
- **Nadie certifica lo que arregló**: quien arregla abre o cierra el `DEF-*`, y quien verifica ese
  módulo firma el veredicto en la tabla de trazabilidad de `docs/user-stories/`.
- El orden lo fija el grafo de dependencias de las épicas (`blocked_by`): `01 → 10 · 03 · 02 → 04 →
  05 → 08 · 06 → 07 → 11 → 12`.

## 11. Contacto / autores

Ver `README.md` y `CONTRIBUTING.md` para más detalles sobre autores y flujo de colaboración.
