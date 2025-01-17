const express = require('express');
const path = require('path');
const session = require('express-session');
const { createServer } = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/player');
const SocketHandler = require('./socket/socketHandler');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(session({
  secret: 'your-secret-key', // Cambiar esto en producción
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Cambiar a true en producción si usas HTTPS
}));

const port = 8081;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(authRoutes);
app.use(playerRoutes);

// Initialize Socket.IO handler
new SocketHandler(io);

httpServer.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
