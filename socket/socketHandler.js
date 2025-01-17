class SocketHandler {
  constructor(io) {
    this.io = io;
    this.setupSocketEvents();
  }

  setupSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log('Client connected');

      socket.on('track_info_updated', (trackInfo) => {
        console.log('Server received track_info_updated:', trackInfo);
        // Broadcast the track info to all connected clients including sender
        console.log('Broadcasting player_state_update:', trackInfo);
        socket.broadcast.emit('player_state_update', trackInfo.track);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });
  }
}

module.exports = SocketHandler;
