# Spotify Web Player

Reproductor web minimalista integrado con la API de Spotify, utilizando el Web Playback SDK.

## Características principales

- Reproducción de música desde Spotify
- Control básico (play/pause, siguiente/anterior)
- Visualización de información de la canción actual
- Renovación automática de tokens de acceso
- Sincronización en tiempo real con Socket.IO

## Requisitos previos

- Node.js (v16 o superior)
- Cuenta de desarrollador en Spotify
- Credenciales de la API de Spotify (Client ID y Client Secret)

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/WilsonKari/Spotify_WebPlaybackSDK.git
cd spotify-web-player
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar las variables de entorno:
```bash
cp .env.example .env
```

4. Editar el archivo `.env` con tus credenciales de Spotify.

## Configuración

El archivo `.env` debe contener:

```env
SPOTIFY_CLIENT_ID=tu_client_id
SPOTIFY_CLIENT_SECRET=tu_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
SESSION_SECRET=una_clave_secreta_fuerte
```

## Uso

1. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

2. Abrir en el navegador:
```
http://localhost:3000
```

3. Iniciar sesión con tu cuenta de Spotify.

## Estructura del proyecto

```
.
├── config/            # Configuración de la API
├── public/            # Archivos estáticos y frontend
│   ├── css/           # Estilos CSS
│   ├── js/            # Lógica del frontend
│   └── index.html     # Página principal
├── routes/            # Rutas de Express
├── socket/            # Configuración de Socket.IO
├── utils/             # Utilidades y helpers
├── .env.example       # Plantilla de variables de entorno
├── .gitignore         # Archivos ignorados por Git
├── index.js           # Punto de entrada de la aplicación
├── package.json       # Dependencias y scripts
└── README.md          # Documentación del proyecto
```

## Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.
