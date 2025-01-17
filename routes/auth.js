const express = require('express');
const router = express.Router();
const TokenManager = require('../utils/tokenManager');
const { SPOTIFY_CONFIG, spotifyApi, SCOPES } = require('../config/spotify');

router.get('/login', (req, res) => {
  const authorizeURL = spotifyApi.createAuthorizeURL(SCOPES);
  res.redirect(authorizeURL);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;
    
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);
    
    // Almacenar tokens en la sesión del servidor
    req.session.spotifyTokens = {
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000
    };
    
    res.redirect('/');
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.redirect('/?error=auth_failed');
  }
});

router.get('/get-token', async (req, res) => {
  try {
    const token = await TokenManager.getValidToken();
    if (token) {
      res.json({ token });
    } else {
      res.status(401).json({ 
        error: 'auth_required',
        message: 'Please log in to Spotify'
      });
    }
  } catch (error) {
    res.status(401).json({ 
      error: 'auth_required',
      message: 'Please log in to Spotify'
    });
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    if (!req.session.spotifyTokens || !req.session.spotifyTokens.refresh_token) {
      console.error('No refresh token found in session');
      return res.status(401).json({
        error: 'auth_required',
        message: 'No refresh token available'
      });
    }

    const { refresh_token } = req.session.spotifyTokens;
    console.log('Attempting to refresh token...');
    
    const refreshedToken = await TokenManager.refreshToken(refresh_token);
    
    if (!refreshedToken || !refreshedToken.access_token) {
      console.error('No valid token received from refresh');
      return res.status(401).json({
        error: 'auth_required',
        message: 'Failed to obtain new token'
      });
    }

    // Actualizar los tokens en la sesión
    req.session.spotifyTokens = {
      access_token: refreshedToken.access_token,
      refresh_token: refreshedToken.refresh_token || refresh_token,
      expires_at: refreshedToken.expires_at
    };

    console.log('Token refreshed successfully');
    console.log('New access token (first 15 chars):', refreshedToken.access_token.substring(0, 15));

    res.json({ 
      token: refreshedToken.access_token,
      expires_in: Math.floor((refreshedToken.expires_at - Date.now()) / 1000)
    });
  } catch (error) {
    console.error('Error in /refresh-token:', error);
    res.status(500).json({
      error: 'server_error',
      message: error.message || 'Failed to refresh token'
    });
  }
});

module.exports = router;
