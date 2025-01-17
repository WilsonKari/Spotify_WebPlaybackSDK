import { showError, hideError } from './errorHandler.js';
import { updateTrackInfo } from './trackInfo.js';
import { socket } from './socket.js';

let player;
let token;
let isPlaying = false;
let progressInterval;
let tokenCounterInterval;
let tokenExpirationTime;

// Función para formatear el tiempo en minutos:segundos
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function callRefreshToken() {
    try {
        console.log('Requesting token refresh...');
        const response = await fetch('/refresh-token', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to refresh token');
        }

        const data = await response.json();
        if (!data.token) {
            throw new Error('No token received from server');
        }

        // Actualizar el token global
        token = data.token;
        console.log('New token received (first 15 chars):', token.substring(0, 15));

        // Actualizar el token en el reproductor
        if (player) {
            player._options.getOAuthToken = cb => { cb(token); };
            await player.connect();
        }

        // Reiniciar el contador con el nuevo token
        startTokenCounter(data.expires_in, token);

        // Emitir evento de token actualizado
        window.dispatchEvent(new CustomEvent('spotify_token_refreshed', {
            detail: { token: token }
        }));

        hideError();
        return token;
    } catch (error) {
        console.error('Error refreshing token:', error);
        showError(`Failed to refresh token: ${error.message}`);
        
        // Si hay un error de autenticación, redirigir al login
        if (error.message.includes('auth')) {
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        }
        return null;
    }
}

function startTokenCounter(expiresIn, currentToken) {
    if (tokenCounterInterval) {
        clearInterval(tokenCounterInterval);
    }

    // Calcular el tiempo de expiración
    tokenExpirationTime = Date.now() + (expiresIn * 1000);

    // Mostrar preview del token
    const tokenPreview = document.getElementById('tokenPreview');
    if (tokenPreview && currentToken) {
        // Mostrar los primeros 15 caracteres del token
        const tokenDisplay = `${currentToken.substring(0, 15)}...`;
        tokenPreview.textContent = tokenDisplay;
        
        // Efecto visual de actualización
        tokenPreview.classList.add('updated');
        setTimeout(() => {
            tokenPreview.classList.remove('updated');
        }, 1000);
    }

    // Actualizar el contador cada segundo
    tokenCounterInterval = setInterval(() => {
        const now = Date.now();
        const timeLeft = tokenExpirationTime - now;

        if (timeLeft <= 0) {
            document.getElementById('tokenTimer').textContent = '00:00';
            clearInterval(tokenCounterInterval);
            return;
        }

        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const tokenTimer = document.getElementById('tokenTimer');
        tokenTimer.textContent = formattedTime;

        // Cambiar color según el tiempo restante
        if (timeLeft < 30000) { // menos de 30 segundos
            tokenTimer.style.color = '#ff4444';
        } else if (timeLeft < 300000) { // menos de 5 minutos
            tokenTimer.style.color = '#ffa500';
        } else {
            tokenTimer.style.color = '#fff';
        }

        // Renovar token automáticamente 5 minutos antes de que expire
        if (timeLeft < 300000 && timeLeft > 290000) {
            console.log('Auto-refreshing token...');
            callRefreshToken();
        }
    }, 1000);
}

async function getToken() {
    try {
        const response = await fetch('/get-token');
        const data = await response.json();

        if (response.ok && data.token) {
            // Iniciar el contador con el tiempo de expiración (3600 segundos por defecto)
            startTokenCounter(3600, data.token);
            return data.token;
        }

        // Intenta refrescar el token si la respuesta es 401
        if (response.status === 401) {
            const refreshResponse = await fetch('/refresh-token', {
                method: 'POST'
            });

            if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                // Reiniciar el contador con el nuevo token
                startTokenCounter(refreshData.expires_in, refreshData.token);
                return refreshData.token;
            } else {
                // Si la renovación falla, redirige al login
                const refreshErrorData = await refreshResponse.json();
                console.error('Error refreshing token:', refreshErrorData);
                showError('Session expired, redirecting to login...');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return null;
            }
        }

        // Maneja otros errores
        const message = data.message || 'Authentication required';
        showError(message);
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        throw new Error(message);
    } catch (error) {
        console.error('Error getting token:', error);
        showError('Failed to retrieve or refresh token.');
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        return null;
    }
}

async function verifyTokenBeforeAction(action) {
    try {
        // Solo verificar si el token actual es válido basado en el tiempo de expiración
        const now = Date.now();
        const timeLeft = tokenExpirationTime - now;
        
        if (timeLeft <= 0) {
            // Solo si el token ha expirado, intentamos obtener uno nuevo
            const newToken = await getToken();
            if (!newToken) return false;
        }
        
        // Ejecutar la acción
        await action();
        return true;
    } catch (error) {
        console.error('Error in action:', error);
        if (error.message.includes('401')) {
            showError('Session expired, redirecting to login...');
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        }
        return false;
    }
}

window.onSpotifyWebPlaybackSDKReady = async () => {
    token = await getToken();
    if (!token) return;
    
    player = new Spotify.Player({
        name: 'Minimal Spotify Player',
        getOAuthToken: async cb => {
            try {
                const token = await getToken();
                cb(token);
            } catch (error) {
                console.error('Error getting token for player:', error);
                showError('Session expired, reconnecting...');
                await reconnectPlayer();
            }
        },
        volume: 0.5
    });

    // Listener para actualizar el token cuando se refresque
    window.addEventListener('spotify_token_refreshed', async (event) => {
        try {
            const newToken = event.detail.token;
            token = newToken;
            
            // Actualizar el token en el player
            player._options.getOAuthToken = cb => { cb(newToken); };
            
            // Reconectar el player si es necesario
            if (!player._options.connect) {
                await player.connect();
            }
            
            console.log('Player token updated successfully');
        } catch (error) {
            console.error('Error updating player token:', error);
            showError('Error updating player, trying to reconnect...');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    });

    async function reconnectPlayer() {
        try {
            const newToken = await getToken();
            if (newToken) {
                if (player) {
                    await player.disconnect();
                    player._options.getOAuthToken = cb => { cb(newToken); };
                    await player.connect();
                    hideError();
                }
            } else {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Failed to reconnect player:', error);
            window.location.href = '/login';
        }
    }

    async function getToken() {
        try {
            const response = await fetch('/get-token');
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Intentar renovar el token
                    const refreshResponse = await fetch('/refresh-token', { method: 'POST' });
                    if (refreshResponse.ok) {
                        const refreshData = await refreshResponse.json();
                        // Reiniciar el contador con el nuevo token
                        startTokenCounter(refreshData.expires_in, refreshData.token);
                        return refreshData.token;
                    }
                }
                throw new Error(data.message || 'Authentication required');
            }
            
            // Iniciar el contador con el tiempo de expiración (3600 segundos por defecto)
            startTokenCounter(3600, data.token);
            return data.token;
        } catch (error) {
            throw error;
        }
    }

    player.addListener('initialization_error', ({ message }) => {
        console.error('Failed to initialize:', message);
        showError('Failed to initialize player');
    });

    player.addListener('authentication_error', ({ message }) => {
        console.error('Failed to authenticate:', message);
        showError('Authentication failed, redirecting to login...');
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
    });

    player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        hideError();
    });

    player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID is not ready:', device_id);
        showError('Player device is not ready');
    });

    player.addListener('player_state_changed', state => {
        if (!state) {
            updateTrackInfo(null);
            return;
        }

        const { 
            track_window: { current_track, next_tracks },
            paused,
            position,
            duration,
            shuffle,
            device_volume
        } = state;

        if (current_track) {
            const trackInfo = {
                id: current_track.id,
                name: current_track.name,
                duration: duration,
                artists: current_track.artists.map(artist => artist.name),
                image_url: current_track.album.images[0]?.url || '',
                album: {
                    name: current_track.album.name,
                    images: current_track.album.images
                },
                position: position,
                shuffle: shuffle,
                next_tracks: next_tracks.map(track => ({
                    name: track.name,
                    artists: track.artists.map(artist => artist.name),
                    duration: track.duration_ms
                }))
            };
            
            updateTrackInfo(trackInfo);
            isPlaying = !paused;
            document.getElementById('playButton').textContent = 
                isPlaying ? 'Pause' : 'Play';

            // Actualizar la barra de progreso
            if (isPlaying) {
                clearInterval(progressInterval);
                let currentPosition = position;
                
                progressInterval = setInterval(() => {
                    currentPosition += 1000; // Incrementar 1 segundo
                    if (currentPosition <= duration) {
                        const progress = document.querySelector('progress');
                        const currentTimeElement = document.querySelector('.current-time');
                        if (progress && currentTimeElement) {
                            progress.value = currentPosition;
                            currentTimeElement.textContent = formatTime(currentPosition);
                        }
                    }
                }, 1000);
            } else {
                clearInterval(progressInterval);
            }
            
            // Emit track info to server
            if (socket && socket.connected) {
                socket.emit('track_info_updated', { track: trackInfo });
            }
        }
    });

    await player.connect();
};

window.togglePlay = async () => {
    await verifyTokenBeforeAction(async () => {
        await player.togglePlay();
        isPlaying = !isPlaying;
        document.getElementById('playButton').textContent = 
            isPlaying ? 'Pause' : 'Play';
    });
};

window.nextTrack = async () => {
    await verifyTokenBeforeAction(async () => {
        await player.nextTrack();
    });
};

window.previousTrack = async () => {
    await verifyTokenBeforeAction(async () => {
        await player.previousTrack();
    });
};

document.getElementById('refreshToken').addEventListener('click', callRefreshToken);
