// Importar node-fetch versión 2 (CommonJS)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { SPOTIFY_CONFIG } = require('../config/spotify');

class TokenManager {
  static tokenExpirationTime = null;
  static refreshTimeout = null;

  static async refreshToken(refreshToken) {
    try {
      console.log('Starting token refresh process...');
      const clientId = SPOTIFY_CONFIG.clientId;
      const clientSecret = SPOTIFY_CONFIG.clientSecret;
      const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      // Hacer la petición a Spotify para refrescar el token
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authString}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from Spotify API:', errorData);
        throw new Error(errorData.error_description || 'Failed to refresh token');
      }

      const data = await response.json();
      console.log('New token received from Spotify');

      const expiresIn = data.expires_in;
      this.tokenExpirationTime = Date.now() + (expiresIn * 1000);

      // Programar próxima renovación 5 minutos antes de expirar
      this.scheduleTokenRefresh(expiresIn);

      return {
        access_token: data.access_token,
        expires_at: this.tokenExpirationTime,
        refresh_token: data.refresh_token || refreshToken // Mantener el refresh_token anterior si no se recibe uno nuevo
      };
    } catch (error) {
      console.error('Error in TokenManager.refreshToken:', error);
      throw error;
    }
  }

  static scheduleTokenRefresh(expiresIn) {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Programar la renovación 5 minutos antes de que expire
    const refreshTime = (expiresIn - 300) * 1000;
    if (refreshTime > 0) {
      this.refreshTimeout = setTimeout(async () => {
        try {
          console.log('Auto-refreshing token...');
          await this.refreshToken();
        } catch (error) {
          console.error('Error in auto-refresh:', error);
        }
      }, refreshTime);
    }
  }

  static clearRefreshTimeout() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }
}

module.exports = TokenManager;
