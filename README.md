# Web Terminator - Multi-Window Web Terminal

A web-based terminal emulator with desktop-style multi-window support, inspired by the Terminator terminal. Access your terminal from any web browser with features like window management, taskbar, and easy window switching.

## Features

- **Desktop-Style Multi-Window**: Create multiple terminal windows that behave like desktop applications
- **Resizable Windows**: Drag and resize windows like a real desktop OS
- **Window Controls**: Minimize, maximize, and close windows with proper controls
- **Left Sidebar Taskbar**: 
  - Scrollable list of all open windows
  - Shows current/last command for each window
  - Click to switch between windows
  - Resizable sidebar (150px - 500px width)
- **Easy Window Switching**: Use Alt+Q to cycle through windows quickly
- **Copy-Paste**: 
  - Ctrl+C to copy selected text
  - Ctrl+Shift+V to paste text
- **Keyboard Shortcuts**:
  - `Ctrl+T`: New window
  - `Ctrl+W`: Close current window
  - `Alt+Q`: Switch to next window
- **Window Management**:
  - **Drag**: Click and drag window headers to move windows
  - **Resize**: Drag any edge or corner to resize windows
  - **Minimize**: Click `─` button to hide windows
  - **Maximize**: Click `□` button for full-screen mode
  - **Close**: Click `×` button to close windows
- **Responsive Design**: Works on desktop and mobile devices
- **Real Terminal**: Uses PTY (pseudo-terminal) for authentic terminal experience
- **Modern UI**: Dark theme with smooth animations and transitions

## Installation

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- Linux/macOS (for PTY support)

### Setup

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```
   
   Or use the provided script:
   ```bash
   ./start.sh
   ```

4. **Open your browser** and navigate to:
   ```
   http://localhost:3002
   ```

## Usage

### Basic Operations

- **New Window**: Click the `+` button or press `Ctrl+T`
- **Close Window**: Click the `×` button in the window header or press `Ctrl+W`
- **Switch Windows**: Press `Alt+Q` or click windows in the taskbar
- **Minimize Window**: Click the `─` button in window header
- **Maximize Window**: Click the `□` button in window header

### Window Management

- **Move Windows**: Click and drag the window header (title bar)
- **Resize Windows**: Drag any edge or corner of the window
- **Focus Windows**: Click on any window to bring it to front
- **Taskbar Navigation**: Click any window in the left sidebar to switch to it

### Copy and Paste

1. **Copy**: Select text in any terminal window and press `Ctrl+C`
2. **Paste**: Press `Ctrl+Shift+V` in any terminal window

### Taskbar Features

- **Window List**: Shows all open terminals in the left sidebar
- **Command Tracking**: Displays the current/last command for each window
- **Active Window**: Blue highlight shows the currently active window
- **Resizable Sidebar**: Drag the handle between taskbar and desktop to resize
- **Quick Access**: Click any window in the taskbar to switch to it
- **Close from Taskbar**: Click the `×` button on taskbar items to close windows

## Development

### Running in Development Mode

```bash
npm run dev
```

This will start the server with nodemon for automatic restarts during development.

### Project Structure

```
web-terminator/
├── server.js          # Node.js server with Socket.IO and PTY
├── public/
│   ├── index.html     # Main HTML file
│   ├── styles.css     # CSS styles
│   └── terminal.js    # Frontend JavaScript
├── package.json       # Dependencies and scripts
├── start.sh           # Startup script
└── README.md          # This file
```

### Dependencies

- **Backend**: Express.js, Socket.IO, node-pty
- **Frontend**: xterm.js, Socket.IO client
- **Development**: nodemon

## Features in Detail

### Desktop-Style Interface
- **Window Positioning**: Windows can be moved anywhere on the desktop
- **Z-Index Management**: Active windows come to the front
- **Bounds Checking**: Windows stay within the desktop area
- **Visual Feedback**: Active windows have blue borders and highlights

### Taskbar System
- **Real-time Updates**: Taskbar reflects current window states
- **Command Display**: Shows the last executed command for each window
- **State Management**: Tracks active, minimized, and command states
- **Scrollable List**: Handles many windows with smooth scrolling

### Window Controls
- **Minimize**: Hides windows (can be restored from taskbar)
- **Maximize**: Full-screen mode with restore functionality
- **Close**: Properly terminates terminal processes
- **Resize Handles**: 8 resize handles (N, S, E, W, NE, NW, SE, SW)

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in `server.js` or kill the process using the port
2. **Permission denied**: Make sure you have the necessary permissions to spawn processes
3. **Terminal not responding**: Check the browser console for error messages
4. **Windows not resizing**: Make sure you're dragging the resize handles on window edges

### Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## Security Notes

- This application runs real terminal processes on your system
- Only use on trusted networks
- Consider implementing authentication for production use
- The current implementation doesn't persist sessions across browser refreshes

## License

MIT License - feel free to use and modify as needed.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

---

**Note**: This is a development tool and should not be used in production without proper security measures.
