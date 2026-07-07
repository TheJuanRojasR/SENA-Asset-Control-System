# SENA Asset Control System

Sistema web para la gestión de inventario y solicitudes de equipos del **Ambiente 104 del SENA Quirigüá**, con trazabilidad por serial, control por roles (ADMIN / INSTRUCTOR), préstamos/devoluciones reales e ítems compuestos.

## Arquitectura

El proyecto usa una arquitectura de **monorepo ligero** separado en cliente, servidor e infraestructura:

| Capa | Tecnología | Ubicación |
|------|------------|-----------|
| **Frontend** | React 18 + Vite + Material-UI 5 + TailwindCSS | `client/` |
| **Backend** | Node.js 20 + Express + Prisma ORM + MySQL 8 | `server/` |
| **Infraestructura** | Docker Compose | `docker-compose.yml` |

El backend está organizado por dominios: rutas, controladores, servicios, repositorios, validaciones con Zod y middlewares de autenticación/roles.

Incluye control de acceso por roles, gestión de estados de solicitudes, auditoría de movimientos (`LOAN`, `RETURN`) y documentación Swagger.

📎 La bitácora de construcción se encuentra en: **[/docs/PROCESO.md](./docs/PROCESO.md)**.

## Estructura del Proyecto

```text
/
├── client/                 # React SPA
│   ├── src/
│   │   ├── api/            # Clientes axios por dominio
│   │   ├── components/     # Componentes reutilizables
│   │   ├── pages/          # Páginas por rol
│   │   ├── stores/         # Zustand stores
│   │   ├── constants/      # Colores SENA, estados, roles
│   │   └── utils/          # Helpers de API
│   └── tests/              # Tests con Vitest + Testing Library
├── server/                 # Express API
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

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** — Framework UI
- **Vite** — Build tool
- **Material-UI 5** — Componentes
- **TailwindCSS** — Utilidades de estilo
- **Framer Motion** — Animaciones
- **React Query** — Manejo de datos asíncronos
- **Zustand** — Estado global
- **React Hook Form + Zod** — Formularios y validación

### Backend
- **Node.js 20** — Runtime
- **Express** — API REST
- **Prisma ORM** — Acceso a datos y migraciones
- **MySQL 8** — Base de datos
- **JWT** — Autenticación
- **Socket.io** — Preparado para notificaciones en tiempo real
- **Swagger** — Documentación de API

### DevOps / Infraestructura
- **Docker Compose** — Entorno de desarrollo
- **ESLint + Prettier + Husky** — Calidad de código
- **Jest + Vitest + Testing Library** — Tests

---

## ⚙️ Prerrequisitos

- [Docker](https://docker.com)
- [Docker Compose](https://docs.docker.com/compose/)
- [Git](https://git-scm.com)

> No es necesario tener Node.js ni MySQL instalados localmente; todo corre dentro de contenedores Docker.

---

## 🚀 Cómo levantar el proyecto

```bash
# 1. Clonar el repositorio y ubicarse en la raíz
git clone git@github.com:TheJuanRojasR/SENA-Asset-Control-System.git
cd SENA-Asset-Control-System

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar todos los servicios
docker compose up -d --build

# 4. Ver logs (opcional)
docker compose logs -f
```

Servicios disponibles:

| Servicio | URL |
|----------|-----|
| Cliente | http://localhost:5173 |
| API | http://localhost:4000 |
| Swagger | http://localhost:4000/api-docs |
| Adminer (MySQL visual) | http://localhost:8080 |
| MySQL local | `localhost:3307` |

Credenciales de prueba:

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `admin@sena.edu.co` | `AdminSENA2024` | Administrador |
| `cmendoza@sena.edu.co` | `Instructor2024` | Instructor (mañana) |
| `mgomez@misena.edu.co` | `Instructor2024` | Instructor (tarde) |
| `ltorres@misena.edu.co` | `Instructor2024` | Instructor (noche) |

### Comandos útiles

```bash
# Resetear base de datos con seed completo
make db-reset

# Generar cliente Prisma
docker compose exec api npx prisma generate

# Nueva migración
docker compose exec api sh -c "export DATABASE_URL=\$MIGRATE_DATABASE_URL && npx prisma migrate dev --name <nombre>"
```

---

## 🧪 Ejecución de Pruebas

```bash
# Backend
make test
# o
docker compose exec api npm test

# Frontend
make test-client
# o
docker compose exec client npm test

# Lint
make lint
# o
docker compose exec api npm run lint
docker compose exec client npm run lint
```

La base de datos de tests es `sena_inventario_test` y está configurada en `DATABASE_URL_TEST`. Los tests de backend la usan automáticamente cuando `NODE_ENV=test`.

---

## 📖 Documentación

- **Bitácora de construcción**: [`docs/PROCESO.md`](./docs/PROCESO.md)
- **Guía para agentes de código**: [`AGENTS.md`](./AGENTS.md)
- **Guía de contribución**: [`CONTRIBUTING.md`](./CONTRIBUTING.md)

---

## 👥 Autores

- **[TheJuanRojasR](https://github.com/TheJuanRojasR)**
- **[julian-david-parada-gil](https://github.com/julian-david-parada-gil)**
- **[joseph12n](https://github.com/joseph12n)**
- **[KevinSRDev](https://github.com/KevinSRDev)**

---

## 🤝 Contribución

Para conocer el flujo de trabajo, convenciones de ramas, estándares de código y proceso de revisión, consulta el archivo **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

---

## 📄 Licencia

Este proyecto está bajo licencia **En revisión** — consulta el archivo `LICENSE` para más detalles.
