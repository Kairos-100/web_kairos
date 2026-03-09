# Kairos - Knowledge & Performance Dashboard

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

Kairos es una plataforma premium diseñada para la gestión del conocimiento y el seguimiento de métricas de rendimiento en equipos de alto rendimiento.

## 🚀 Características Principales

- **Dashboard de Métricas**: Visualización en tiempo real de CV, LP, CP y Compartición.
- **Gestión de Conocimiento**: Repositorio de tesis y ensayos con indexación para IA.
- **Kairos AI**: Asistente inteligente integrado para consultar la base de conocimiento.
- **Integración con Clockify**: Sincronización automática de tiempos de proyecto.
- **Diseño Premium**: Interfaz moderna con micro-animaciones dinámicas y modo oscuro integrado.

## 🛠️ Stack Tecnológico

- **Frontend**: React 18, Vite, Lucide Icons, Recharts.
- **Estado/Animaciones**: Framer Motion.
- **Backend**: Supabase (DB + Storage).
- **IA**: RAG Engine integrado.

## 📦 Configuración e Instalación

1.  **Clonar el repositorio**:
    ```bash
    git clone https://github.com/Kairos-100/web_kairos.git
    cd web_kairos
    ```

2.  **Instalar dependencias**:
    ```bash
    npm install
    ```

3.  **Variables de Entorno**:
    Crea un archivo `.env` en la raíz con:
    ```env
    VITE_SUPABASE_URL=tu_url_supabase
    VITE_SUPABASE_ANON_KEY=tu_anon_key
    ```

4.  **Ejecutar en desarrollo**:
    ```bash
    npm run dev
    ```

## 📄 Documentación de Producto
Para una visión detallada de las especificaciones, reglas de negocio y arquitectura, consulta el [PRD Detallado](./PRD.md).

---
© 2024 Kairos - Impulsando el conocimiento compartido.
