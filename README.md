# SENA Asset Control System
Sistema web para la gestión de inventario y solicitudes de equipos del Ambiente 104 del SENA Quiriguá, con trazabilidad, control por roles y automatización de procesos.


## Arquitectura

El sistema utiliza una **arquitectura n-capas**, separando las responsabilidades en capas independientes que se comunican de forma unidireccional:

| Capa | Descripción |
|------|-------------|
| **Presentación** | Interfaz de usuario (React), consume la API REST |
| **Aplicación** | Controladores y rutas HTTP (Express), orquesta los casos de uso |
| **Negocio** | Lógica de negocio, reglas de validación, gestión de estados y roles |
| **Acceso a datos** | Repositorios y modelos, abstracción sobre la base de datos |
| **Infraestructura** | Base de datos, servicios externos, almacenamiento |

Incluye control de acceso por roles, gestión de estados y auditoría completa.

📎 La arquitectura detallada se encuentra en: **/docs/arquitectura.md**

## Estructura del Proyecto

```text
/
├── README.md
├── CONTRIBUTING.md
├── LICENSE
├── /docs
│   ├── marco-teorico.md
│   └── arquitectura.md
├── /frontend
│   └── /src
│       ├── /components        # Capa de Presentación — componentes UI
│       ├── /pages             # Capa de Presentación — vistas por ruta
│       └── /services          # Cliente HTTP hacia la API
└── /backend
    └── /src
        ├── /routes            # Capa de Aplicación — definición de endpoints
        ├── /controllers       # Capa de Aplicación — manejo de peticiones HTTP
        ├── /services          # Capa de Negocio — lógica y reglas del dominio
        ├── /repositories      # Capa de Acceso a Datos — consultas y persistencia
        ├── /models            # Capa de Acceso a Datos — esquemas y entidades
        └── /config            # Capa de Infraestructura — BD, variables de entorno
```

## 🛠️ Stack Tecnológico
 
### Frontend
- **[React](https://react.dev)** `version` — Framework UI
- **[JavaScript](https://)** `version` — Tipado estático

### Backend
- **[Node.js](https://nodejs.org)** `version` — Runtime
- **[Express](https://expressjs.com)** `version` — API REST
- **[MySQL](https://)** `version` — Base de datos

### DevOps / Infraestructura
- **Docker** — Contenerización
- **GitHub Actions** — CI/CD
- **AWS / GCP / Azure** — Cloud hosting
---
 
## ⚙️ Prerrequisitos
 
Asegúrate de tener instalado:
 
- [Node.js](https://nodejs.org) `version`
- [Docker](https://docker.com) `version`
- [Git](https://git-scm.com) `version`

## ☁️ Despliegue
 
### Build de producción
 
```bash
# Build de producción
npm run build
 
# Despliegue con Docker
docker build -t nombre-proyecto .
docker push registry/nombre-proyecto:latest
```
 
### Ambientes disponibles
 
- **Desarrollo** — `http://localhost:3000` · rama `develop`
- **Producción** — `https://app.com` · rama `main`

 
---
 
## 🧪 Ejecución de Pruebas
 
### Pruebas Unitarias
```bash
npm run test:unit
```
 
### Pruebas de Integración
```bash
npm run test:integration
```
 
### Pruebas End-to-End (E2E)
```bash
npm run test:e2e
```
 
### Cobertura de Código
```bash
npm run test:coverage
```
 
El reporte de cobertura se genera en `/coverage/index.html`
>[!NOTE]
> Umbral mínimo requerido: **80%** de cobertura
---
 
## 📖 Documentación
 
La documentación completa del proyecto está disponible en la carpeta **`/docs`**, incluyendo:
 
- Arquitectura del sistema
- Diagramas de flujo
---
 
## 👥 Autores
 
- **[TheJuanRojasR](https://github.com/TheJuanRojasR)** — Rol o Actividad
- **[julian-david-parada-gil](https://github.com/julian-david-parada-gil)** — Rol o Actividad
- **[joseph12n](https://github.com/joseph12n)** — Rol o Actividad
- **[KevinSRDev](https://github.com/KevinSRDev)** — Rol o Actividad

---
 

## 🤝 Contribución
Para conocer el flujo de trabajo, convenciones de ramas, estándares de código y proceso
de revisión, consulta el archivo **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

---
 
## 📄 Licencia
 
Este proyecto está bajo la licencia **[En revision](./LICENSE)** —
consulta el archivo `LICENSE` para más detalles.
 
---
