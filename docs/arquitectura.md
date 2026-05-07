
# Arquitectura del Sistema

## 1. Introducción

Este documento describe la arquitectura del **Sistema de Gestión de Inventario y Solicitudes de Equipos del Ambiente 104 del SENA Quiriguá**.  
La arquitectura definida busca garantizar mantenibilidad, trazabilidad, control de acceso por roles y una correcta separación de responsabilidades entre los diferentes componentes del sistema.

---

## 2. Tipo de Arquitectura

El sistema se basa en una **arquitectura monolítica en capas**, implementada bajo el **patrón Modelo–Vista–Controlador (MVC)** y expuesta mediante una **API REST** para la comunicación entre el frontend y el backend.

Este enfoque fue seleccionado por su simplicidad, claridad estructural y adecuación al alcance del proyecto, el cual está orientado a un único ambiente institucional.

---

## 3. Enfoque Arquitectónico General

La arquitectura del sistema se fundamenta en los siguientes principios:

- Separación clara de responsabilidades
- Desacoplamiento entre frontend y backend
- Control de acceso basado en roles (Administrador y Solicitante)
- Centralización de la lógica de negocio
- Persistencia relacional de datos
- Trazabilidad y auditoría de acciones
- Escalabilidad funcional futura

---

## 4. Capas de la Arquitectura

### 4.1 Capa de Presentación (Frontend)

Es la capa responsable de la interacción directa con los usuarios del sistema.

**Funciones principales:**
- Autenticación y cierre de sesión
- Visualización del catálogo de equipos
- Creación y seguimiento de solicitudes
- Visualización del buzón de solicitudes
- Panel de administración (inventario y usuarios)
- Visualización de reportes básicos

**Características:**
- Consume la API REST del backend
- No contiene lógica de negocio crítica
- Presenta la información según el rol del usuario

---

### 4.2 Capa de Aplicación y Lógica de Negocio (Backend)

Esta capa concentra la lógica central del sistema y expone los servicios mediante endpoints REST.

**Funciones principales:**
- Gestión de inventario (crear, modificar, dar de baja y consultar equipos)
- Gestión del ciclo de vida de las solicitudes
- Gestión de usuarios y roles
- Validación de reglas de negocio
- Gestión de estados de solicitudes
- Envío de notificaciones
- Registro de auditoría de acciones

**Componentes típicos:**
- Controladores (Controllers)
- Servicios (Services)
- DTOs
- Validaciones
- Seguridad y autenticación

---

### 4.3 Capa de Persistencia (Datos)

Encargada del almacenamiento y recuperación de la información del sistema.

**Funciones principales:**
- Almacenamiento de usuarios, equipos y solicitudes
- Gestión de relaciones entre entidades
- Registro histórico de acciones y cambios de estado

**Características:**
- Uso de base de datos relacional
- Acceso a datos mediante ORM
- Integridad referencial y consistencia de datos

---

## 5. Componentes Transversales

Los siguientes componentes afectan a múltiples capas del sistema:

### 5.1 Autenticación y Autorización
- Control de acceso por roles
- Restricción de funcionalidades según perfil

### 5.2 Auditoría y Trazabilidad
- Registro de acciones por usuario
- Historial de solicitudes y cambios de estado
- Seguimiento de entregas y devoluciones

### 5.3 Notificaciones
- Notificación de creación de solicitudes
- Aprobación o rechazo
- Vencimiento de plazos
- Confirmación de devolución

---

## 6. Flujo General del Sistema

1. El usuario accede al sistema desde un navegador web.
2. El frontend envía solicitudes HTTP a la API REST.
3. El backend valida autenticación y permisos.
4. Se aplican las reglas de negocio correspondientes.
5. Se consulta o actualiza la base de datos.
6. Se registra la acción en el sistema de auditoría.
7. Se generan notificaciones si aplica.
8. El backend responde al frontend con el resultado.

---

## 7. Modelo de Estados de Solicitud

Las solicitudes de equipos manejan el siguiente ciclo de vida:

- **Pendiente**: solicitud creada y en espera de revisión.
- **Aprobada**: solicitud autorizada por el administrador.
- **Rechazada**: solicitud denegada.
- **Entregada**: equipo entregado al solicitante.
- **Devuelta**: equipo devuelto y disponible nuevamente.

La transición entre estados es controlada exclusivamente por el backend.

---

## 8. Justificación de la Arquitectura

La arquitectura monolítica en capas fue seleccionada debido a:

- Alcance controlado del proyecto
- Número limitado de usuarios
- Facilidad de implementación y mantenimiento
- Claridad para fines académicos
- Posibilidad de evolución futura

Este enfoque permite una correcta organización del código, facilita la trazabilidad de procesos y asegura una base sólida para futuras mejoras.

---

## 9. Escalabilidad y Evolución Futura

La arquitectura propuesta permite:

- Incorporar nuevos módulos funcionales
- Integrar nuevos roles de usuario
- Migrar a una arquitectura distribuida si el sistema crece
- Integrar servicios externos en futuras fases

---

## 10. Conclusión

La arquitectura definida proporciona una solución sólida, clara y alineada con los objetivos del proyecto, garantizando control, trazabilidad y eficiencia en la gestión del inventario y las solicitudes de equipos del Ambiente 104 del SENA Quiriguá.
