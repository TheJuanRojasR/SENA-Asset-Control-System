# Guía de Contribución a SENA Asset Control System

¡Gracias por tu interés en contribuir! Este documento describe el proceso, las convenciones y el flujo de trabajo que seguimos para mantener el proyecto ordenado y colaborativo.

---

## Índice

- [Flujo de trabajo con ramas](#flujo-de-trabajo-con-ramas)
- [Convenciones de Commits](#convenciones-de-commits)
- [Versionamiento Semántico](#versionamiento-semántico)
- [Estándares de código](#estándares-de-código)
- [Tests obligatorios](#tests-obligatorios)
- [Cierre de Issues y Co-Autores](#cierre-de-issues-y-co-autores)
- [Recursos adicionales](#recursos-adicionales)

---

## Flujo de trabajo con ramas

Usamos **Git Flow simplificado**:

| Rama | Propósito |
|------|-----------|
| `main` | Código en producción. Solo se actualiza mediante PRs aprobadas desde `develop`. |
| `develop` | Integración continua. Rama base para nuevas funcionalidades. |
| `dev<Nombre>` | Ramas personales de cada desarrollador (por ejemplo `devJoseph`, `devKevin`). |
| `feature/<descripción>` | (Opcional) para funcionalidades grandes que requieren varios commits. |
| `fix/<descripción>` | (Opcional) para correcciones puntuales. |

### Proceso de contribución

1. **Actualiza tu rama personal** desde `develop` antes de empezar:

   ```bash
   git checkout develop
   git pull origin develop
   git checkout devTuNombre
   git rebase develop
   ```

2. **Realiza tus cambios** siguiendo las convenciones de commits.

3. **Ejecuta tests y lint** antes de subir:

   ```bash
   make test
   make test-client
   make lint
   ```

4. **Sube tu rama** y crea un Pull Request hacia `develop`:

   ```bash
   git push origin devTuNombre
   ```

5. **Solicita revisión** de al menos un compañero del equipo antes de fusionar.

---

## Convenciones de Commits

Utilizamos una convención basada en [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/), adaptada para SENA Asset Control System.

La estructura del mensaje es:

```text
<type>(<scope>): <resumen breve>

<cuerpo del mensaje>

<footer>
```

- **`type`** : Tipo de cambio. Usa minúsculas.
  - **feat**: Nueva funcionalidad para el usuario.
  - **fix**: Corrección de errores para el usuario.
  - **docs**: Cambios en la documentación.
  - **style**: Formateo, sin cambios en la lógica.
  - **refactor**: Refactorización, sin añadir funcionalidad.
  - **test**: Añadir o actualizar pruebas.
  - **chore**: Tareas de mantenimiento.
  - **merge**: Fusión de ramas.
  - **release**: Creación de una nueva versión.

- **`scope`** : Módulo o área afectada (opcional si el cambio es global). Ejemplos: `client`, `server`, `auth`, `inventory`, `requests`, `loans`, `seed`, `docs`.

- **`resumen breve`** : Primera línea del mensaje, clara y concisa (máximo 70 caracteres), en tiempo presente, en minúsculas y sin punto final.

- **`cuerpo del mensaje`** : Descripción más detallada del cambio, explicando el motivo y contexto si es relevante. Deja una línea en blanco entre el resumen y el cuerpo. Cada línea máximo 80 caracteres.

- **`footer`** : Información adicional: cierre de issues (`Closes #número`), co-autores (`co-authored-by: Nombre <correo>`), breaking changes (`BREAKING CHANGE: ...`) o referencias a tareas.

### Ejemplo

```text
feat(inventory): agregar ensamblaje de ítems compuestos

Permite vincular unidades hijas a una unidad padre mediante
parentUnitId, con endpoints de assemble/disassemble/detail.

Closes #12
co-authored-by: Juan Rojas <juan@sena.edu.co>
```

---

## Versionamiento Semántico

El proyecto sigue [SemVer 2.0.0](https://semver.org/lang/es/):

- **X**: `major` - Cambios incompatibles a nivel de API o funcionalidades principales.
- **Y**: `minor` - Nuevas funcionalidades compatibles con versiones anteriores.
- **Z**: `patch` - Correcciones de errores y mejoras menores.

Etiqueta las versiones siguiendo el formato estándar: `vX.Y.Z`.  
Por ejemplo: `v1.2.3`.

---

## Estándares de código

- **Frontend**: React + JSX, Material-UI para componentes base, TailwindCSS para utilidades, ESLint + Prettier.
- **Backend**: ES Modules, arquitectura por capas (routes → controllers → services → repositories), Prisma ORM, validaciones con Zod.
- **Idioma**: español para nombres de usuario, mensajes de error y documentación; inglés para nombres de variables, funciones y código.
- Husky ejecuta `lint-staged` antes de cada commit: ESLint --fix y Prettier --write.

---

## Tests obligatorios

Todo cambio que afecte lógica de negocio debe ir acompañado de tests que pasen.

```bash
# Backend
make test

# Frontend
make test-client

# Lint
make lint
```

Los PRs que no pasen tests o lint no serán fusionados.

---

## Cierre de Issues y Co-Autores

- Para cerrar issues, usa `Closes #número` en el footer del commit o en la descripción del PR.
- Para co-autores, agrega `co-authored-by: Nombre <correo>` en el footer del commit.

---

## Recursos adicionales

- [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/)
- [Semantic Versioning](https://semver.org/lang/es/)
- [Guía de Git Commit Messages](https://chris.beams.io/posts/git-commit/)
- [AGENTS.md](./AGENTS.md) — Contexto técnico para agentes de código.
