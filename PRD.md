# PRD - Kairos Platform

## 1. Visión General
Kairos es una plataforma interna de gestión del conocimiento y métricas de rendimiento para equipos de alto impacto. Permite centralizar la actividad comercial, el aprendizaje continuo y la colaboración mediante un sistema de gamificación basado en puntos y evidencias documentales.

## 2. Objetivos del Producto
- **Centralización**: Un único lugar para registrar visitas, tesis, y actividad comercial.
- **Visibilidad**: Dashboards en tiempo real para el seguimiento de objetivos individuales y de equipo.
- **Gamificación**: Sistema de puntos (LP, CV, CP, SH) para incentivar la participación.
- **Inteligencia**: Asistente de IA para interactuar con la base de conocimiento generada.

## 3. Funcionalidades Detalladas

### 3.1. Gestión de Conocimiento (Tesis/Ensayos)
- **Carga de Documentos**: Los usuarios pueden subir archivos PDF acompañados de metadatos (título, categoría, etiquetas).
- **Tipos de Aportación**:
    - **Molécula**: Ensayos de mayor profundidad (4-11 puntos).
    - **Libro**: Resúmenes o aportaciones breves (1-3 puntos).
- **Document Explorer**: Buscador avanzado de documentos con previsualización de PDF.
- **Comentarios**: Sistema de feedback para fomentar la discusión en cada tesis.

### 3.2. Métricas de Rendimiento (Indicadores)
- **CV (Corporate Visits)**: Registro de visitas comerciales con metadatos de impacto.
- **LP (Learning Points)**: Puntos acumulados por la creación de contenido y aprendizaje.
- **CP (Community Points)**: Reconocimiento por aportaciones a la comunidad (escala 1-3).
- **SH (Sharing)**: Registro de actividades de compartición de conocimiento.
- **Financiero**: Seguimiento opcional de ingresos y beneficios asociados a la actividad.

### 3.3. Dashboard de Analíticas
- **Visualización Temporal**: Gráficos de evolución de métricas (7 días, 30 días, 90 días o histórico).
- **Tabla de Miembros**: Ranking y detalle de aportaciones por cada integrante del equipo (excluyendo perfiles administrativos/externos definidos).
- **Historial de Actividad**: Log detallado de todas las acciones realizadas por el equipo.

### 3.4. Integraciones
- **Clockify**: Sincronización automática de tiempos por proyecto y usuario.
- **Supabase**: Base de datos en tiempo real y almacenamiento de archivos (S3 bucket).
- **Google Drive**: Sincronización bidireccional de documentos para respaldo.
- **IA (Kairos AI)**: Motor RAG (Retrieval-Augmented Generation) para responder preguntas basadas en las tesis subidas.

## 4. Arquitectura Técnica
- **Frontend**: React 18+ con Vite.
- **Estilo**: CSS Vanilla y Tailwind (según configuración) con Framer Motion para micro-animaciones premium.
- **Backend**: Supabase (PostgreSQL + Auth + Storage).
- **Visualización**: Recharts para el motor de gráficos.
- **Iconografía**: Lucide React.

## 5. Seguridad y Acceso
- **Autenticación**: Basada en lista blanca (`WHITELIST`) de emails institucionales.
- **Persistencia**: Sesión persistente mediante `localStorage` para evitar logueos recurrentes.
- **Privacidad**: Control de visualización de métricas sensibles.

## 6. Reglas de Negocio
- **Deduplicación**: El sistema evita registros duplicados de métricas en la misma fecha para el mismo usuario.
- **Validación de CV**: Cada subida de CV cuenta como 1 unidad (+ metadatos).
- **Normalización**: Sincronización de nombres de Clockify mediante mapas de usuario para corregir discrepancias de codificación.
