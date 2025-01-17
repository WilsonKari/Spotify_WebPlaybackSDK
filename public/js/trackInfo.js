function formatTime(ms) {
    if (!ms || isNaN(ms)) return '0:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function updateTrackInfo(track) {
    const trackInfoElement = document.getElementById('trackInfo');
    const upcomingTracksElement = document.querySelector('.upcoming-tracks ul');
    
    if (!track) {
        trackInfoElement.querySelector('.track-title').textContent = 'No song currently playing';
        trackInfoElement.querySelector('.track-artist').textContent = '';
        trackInfoElement.querySelector('.album-art').src = '';
        trackInfoElement.querySelector('progress').value = 0;
        trackInfoElement.querySelector('.current-time').textContent = '0:00';
        trackInfoElement.querySelector('.total-time').textContent = '0:00';
        upcomingTracksElement.innerHTML = '';
        return;
    }

    // Actualizar información de la canción actual
    const trackTitle = trackInfoElement.querySelector('.track-title');
    const trackArtist = trackInfoElement.querySelector('.track-artist');
    const albumArt = trackInfoElement.querySelector('.album-art');
    const progressBar = trackInfoElement.querySelector('progress');
    const currentTime = trackInfoElement.querySelector('.current-time');
    const totalTime = trackInfoElement.querySelector('.total-time');

    trackTitle.textContent = track.name;
    trackArtist.textContent = track.artists.join(', ');
    albumArt.src = track.album.images[0]?.url || '';
    progressBar.max = track.duration;
    progressBar.value = track.position;
    currentTime.textContent = formatTime(track.position);
    totalTime.textContent = formatTime(track.duration);

    // Actualizar lista de próximas canciones
    console.log('Next tracks:', track.next_tracks);
    upcomingTracksElement.innerHTML = track.next_tracks
        .slice(0, 5) // Mostrar máximo 5 próximas canciones
        .map(nextTrack => `
            <li>
                <span class="track-name">${nextTrack.name}</span>
                <span class="track-artist">${nextTrack.artists.join(', ')}</span>
                <span class="track-duration">${formatTime(nextTrack.duration_ms || nextTrack.duration || nextTrack.track?.duration_ms)}</span>
            </li>
        `)
        .join('');
}
