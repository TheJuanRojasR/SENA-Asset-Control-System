# Orquestador de Agentes — SENA Inventario

Esta carpeta contiene la herramienta interna de orquestación de agentes de IA para el proyecto. Su objetivo es que cualquier desarrollador futuro pueda delegar cambios a agentes especializados con contexto completo del sistema.

## Estructura

```
.ai/
├── orquestador.mjs       # Script que lee tareas y genera prompts listos
├── agentes/              # Prompts base por especialidad
│   ├── explore.prompt.md
│   ├── dba.prompt.md
│   ├── backend.prompt.md
│   ├── frontend.prompt.md
│   ├── qa.prompt.md
│   └── docs.prompt.md
└── tareas/               # Tareas concretas a delegar
    └── tarea-*.json
```

## Agentes disponibles

| Agente | Responsabilidad | Ejemplo de tarea |
|--------|-----------------|------------------|
| `explore` | Explorar el código, mockups o requerimientos y resumir. | "Mapear la página de aprobación de solicitudes del PDF a endpoints y componentes". |
| `dba` | Diseñar migraciones, índices y seeders. | "Crear modelo de préstamos con seriales". |
| `backend` | Construir endpoints, servicios y repositorios. | "CRUD de categorías con validación Zod". |
| `frontend` | Crear páginas, componentes y stores. | "Pantalla de catálogo con filtros". |
| `qa` | Generar factories, fixtures y tests. | "Tests E2E del flujo de devolución". |
| `docs` | Actualizar README, ADRs y documentación de API. | "Documentar endpoints de solicitudes". |

## Cómo usar

1. Crea o elige una tarea en `.ai/tareas/`.
2. Ejecuta el orquestador:

```bash
node .ai/orquestador.mjs .ai/tareas/tarea-00-ejemplo.json
```

3. El script generará un prompt completo que puedes copiar y pegar en tu asistente de IA (por ejemplo, OpenCode, ChatGPT, Claude).
4. El agente debe devolver archivos, cambios y el comando de verificación.
5. Registra el resultado en `docs/PROCESO.md`.

## Formato de una tarea

```json
{
  "id": "T00",
  "agente": "backend",
  "objetivo": "Crear CRUD de categorías",
  "contexto": "Se requiere que el admin pueda crear, listar, editar y eliminar categorías de ítems.",
  "archivos_afectados": [
    "server/prisma/schema.prisma",
    "server/src/routes/category.routes.js",
    "server/src/controllers/category.controller.js",
    "server/src/services/category.service.js",
    "server/src/repositories/category.repository.js",
    "server/src/validations/category.validation.js"
  ],
  "criterios_aceptacion": [
    "El admin puede crear una categoría con nombre único.",
    "El admin puede listar categorías activas.",
    "No se permite eliminar una categoría con ítems asociados."
  ],
  "verificacion": "docker compose exec api npm test"
}
```

## Reglas para agentes

- Seguir la estructura de carpetas existente.
- Usar Prisma para acceso a datos.
- Validar entradas con Zod.
- Proteger rutas con `authenticate` y `authorize`.
- Escribir tests de integración para endpoints nuevos.
- No romper la identidad visual del SENA.
- Documentar cambios en `docs/PROCESO.md`.
