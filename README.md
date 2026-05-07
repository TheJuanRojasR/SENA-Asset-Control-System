# SENA Asset Control System
Sistema web para la gestión de inventario y solicitudes de equipos del Ambiente 104 del SENA Quiriguá, con trazabilidad, control por roles y automatización de procesos.


## Arquitectura

El sistema utiliza una arquitectura monolítica en capas basada en el patrón MVC,
con frontend desacoplado y backend expuesto mediante una API REST.  
Incluye control de acceso por roles, gestión de estados y auditoría completa.

📎 La arquitectura detallada se encuentra en: **/docs/arquitectura.md**

## Estructura del Proyecto

El repositorio se organiza de la siguiente manera:

```text
/
├── README.md
├── CONTRIBUTING.md
├── LICENSE
├── /docs
│   ├── marco-teorico.md
│   └── arquitectura.md
├── /frontend
│   └── Código fuente del frontend
└── /backend
    └── Código fuente del backend
```


## 🛠️ Stack Tecnológico
 
### Frontend
- **[React](https://react.dev)** `version` — Framework UI
- **[JavaScript](https://)** `version` — Tipado estático

### Backend
- **[Node.js](https://nodejs.org)** `version` — Runtime
- **[Express](https://expressjs.com)** `version` — API REST
- **[](https://)** `version` — Base de datos

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
Este proyecto es de uso **interno**. Por el momento solo los miembros del equipo
pueden contribuir. Si formas parte del equipo, contacta a alguno de los
[autores](#-autores) para obtener acceso al repositorio.

---
 
## 📄 Licencia
 
Este proyecto está bajo la licencia **[En revision](./LICENSE)** —
consulta el archivo `LICENSE` para más detalles.
 
---