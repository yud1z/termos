const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const pty = require('node-pty');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static('public'));

// Store active terminals
const terminals = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Create a new terminal when client requests it
  socket.on('createTerminal', (data) => {
    const { windowId, cols = 80, rows = 24 } = data;
    
    // Spawn a new PTY process
    const term = pty.spawn(process.env.SHELL || 'bash', [], {
      name: 'xterm-color',
      cols: cols,
      rows: rows,
      cwd: process.env.HOME,
      env: process.env
    });

    // Store terminal reference
    terminals.set(windowId, { pty: term, socket: socket });

    // Handle terminal output
    term.onData((data) => {
      socket.emit('terminalData', { windowId, data });
    });

    // Handle terminal exit
    term.onExit((code, signal) => {
      socket.emit('terminalExit', { windowId, code, signal });
      terminals.delete(windowId);
    });

    console.log(`Terminal created for window ${windowId}`);
  });

  // Handle terminal input
  socket.on('terminalInput', (data) => {
    const { windowId, input } = data;
    const terminal = terminals.get(windowId);
    
    if (terminal && terminal.pty) {
      terminal.pty.write(input);
    }
  });

  // Handle terminal resize
  socket.on('terminalResize', (data) => {
    const { windowId, cols, rows } = data;
    const terminal = terminals.get(windowId);
    
    if (terminal && terminal.pty) {
      terminal.pty.resize(cols, rows);
    }
  });

  // Handle terminal close
  socket.on('closeTerminal', (data) => {
    const { windowId } = data;
    const terminal = terminals.get(windowId);
    
    if (terminal && terminal.pty) {
      terminal.pty.kill();
      terminals.delete(windowId);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Clean up terminals for this socket
    for (const [windowId, terminal] of terminals.entries()) {
      if (terminal.socket === socket) {
        terminal.pty.kill();
        terminals.delete(windowId);
      }
    }
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Web Terminal server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
