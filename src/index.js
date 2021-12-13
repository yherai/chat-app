const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const {
  generateMessage,
  generateLocationMessage,
} = require('./utils/messages');
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require('./utils/users');

const app = express();

const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

io.on('connection', (socket) => {
  console.log('New websocket connection');

  socket.on('join', (options, ackCallback) => {
    const { user, error } = addUser({ id: socket.id, ...options });

    if (error) {
      return ackCallback(error);
    }

    const { username, room } = user;

    socket.join(room);

    socket.emit('message', generateMessage('Admin', 'Welcome!'));

    socket.broadcast
      .to(room)
      .emit('message', generateMessage('Admin', `${username} has joined!`));

    ackCallback();
  });

  socket.on('sendMessage', (message, ackCallback) => {
    const filter = new Filter();

    if (filter.isProfane(message)) {
      return ackCallback('Profanity is not allowed');
    }

    const user = getUser(socket.id);

    io.to(user.room).emit('message', generateMessage(user.username, message));

    ackCallback();
  });

  socket.on('sendLocation', (location, ackCallback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit(
      'locationMessage',
      generateLocationMessage(
        user.username,
        `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
      )
    );

    ackCallback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        generateMessage('Admin', `${user.username} has left!`)
      );
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up and runing at port ${port}`);
});
