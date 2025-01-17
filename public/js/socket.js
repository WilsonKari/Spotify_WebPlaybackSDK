// Initialize Socket.IO client
export const socket = io();

// Listen for player state updates from other clients
socket.on('connect', () => {
    console.log('Socket.IO connected');
});
socket.on('player_state_update', (trackInfo) => {
    console.log('player_state_update received', trackInfo);
    console.log('Track Name:', trackInfo.track.name);
    console.log('Artists:', trackInfo.track.artists);
    console.log('Album Art URL:', trackInfo.track.albumArtUrl);
    const playButton = document.getElementById('playButton');
    playButton.textContent = trackInfo.isPlaying ? 'Pause' : 'Play';
});
