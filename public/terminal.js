class WebTerminator {
    constructor() {
        this.socket = io();
        this.terminals = new Map();
        this.activeWindowId = null;
        this.windowCounter = 0;
        this.clipboard = '';
        this.draggedWindow = null;
        this.resizedWindow = null;
        this.resizeDirection = null;
        this.windowCommands = new Map(); // Track commands for each window
        this.isResizingTaskbar = false;
        this.taskbarResizeStart = 0;
        
        this.init();
    }

    init() {
        this.setupSocketHandlers();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.createInitialWindow();
    }

    setupSocketHandlers() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            document.querySelector('.status').textContent = 'Connected';
            document.querySelector('.status').style.color = '#4caf50';
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            document.querySelector('.status').textContent = 'Disconnected';
            document.querySelector('.status').style.color = '#ff4444';
        });

        this.socket.on('terminalData', (data) => {
            const terminal = this.terminals.get(data.windowId);
            if (terminal && terminal.xterm) {
                terminal.xterm.write(data.data);
            }
        });

        this.socket.on('terminalExit', (data) => {
            console.log(`Terminal ${data.windowId} exited with code ${data.code}`);
            this.closeTerminal(data.windowId);
        });
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('newWindowBtn').addEventListener('click', () => {
            this.createNewWindow();
        });

        document.getElementById('closeWindowBtn').addEventListener('click', () => {
            if (this.activeWindowId) {
                this.closeTerminal(this.activeWindowId);
            }
        });

        // Global mouse events for dragging and resizing
        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });

        document.addEventListener('mouseup', () => {
            this.handleMouseUp();
        });

        // Taskbar resize functionality
        this.setupTaskbarResize();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            console.log('Key pressed:', e.key, 'Alt:', e.altKey, 'Ctrl:', e.ctrlKey, 'Shift:', e.shiftKey);
            
            // Alt+Q for window switching
            if (e.altKey && e.key === 'q') {
                e.preventDefault();
                e.stopPropagation();
                console.log('Alt+Q pressed, switching windows');
                this.switchToNextWindow();
                return;
            }

            // Ctrl+T for new window
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                this.createNewWindow();
            }

            // Ctrl+W for close window
            if (e.ctrlKey && e.key === 'w') {
                e.preventDefault();
                if (this.activeWindowId) {
                    this.closeTerminal(this.activeWindowId);
                }
            }

            // Ctrl+C for copy (when text is selected)
            if (e.ctrlKey && e.key === 'c') {
                this.handleCopy();
            }

            // Ctrl+Shift+V for paste
            if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.handlePaste();
            }
        });

        // Also listen for keydown on the body to catch events that might be captured by xterm
        document.body.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 'q') {
                e.preventDefault();
                e.stopPropagation();
                console.log('Alt+Q pressed on body, switching windows');
                this.switchToNextWindow();
            }
        }, true);
    }

    createInitialWindow() {
        this.createNewWindow();
    }

    createNewWindow() {
        const windowId = `window_${++this.windowCounter}`;
        const windowElement = this.createWindowElement(windowId);
        
        // Position the window
        const offset = (this.windowCounter - 1) * 30;
        windowElement.style.left = `${100 + offset}px`;
        windowElement.style.top = `${100 + offset}px`;
        windowElement.style.width = '600px';
        windowElement.style.height = '400px';
        
        // Add to desktop
        const desktop = document.getElementById('desktop');
        desktop.appendChild(windowElement);
        
        // Create xterm instance
        const xterm = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#000000',
                foreground: '#ffffff',
                cursor: '#ffffff',
                selection: '#4a9eff'
            }
        });

        // Add addons
        const fitAddon = new FitAddon.FitAddon();
        xterm.loadAddon(fitAddon);
        
        const webLinksAddon = new WebLinksAddon.WebLinksAddon();
        xterm.loadAddon(webLinksAddon);

        // Open terminal in the window
        const terminalContent = windowElement.querySelector('.terminal-content');
        xterm.open(terminalContent);
        fitAddon.fit();

        // Store terminal reference
        this.terminals.set(windowId, {
            xterm: xterm,
            fitAddon: fitAddon,
            element: windowElement,
            isMaximized: false,
            isMinimized: false,
            originalPosition: { left: '100px', top: '100px', width: '600px', height: '400px' }
        });

        // Initialize command tracking
        this.windowCommands.set(windowId, 'bash');
        this.updateTaskbar();

        // Set as active window
        this.setActiveWindow(windowId);

        // Create terminal on server
        this.socket.emit('createTerminal', {
            windowId: windowId,
            cols: xterm.cols,
            rows: xterm.rows
        });

        // Handle terminal input
        xterm.onData((data) => {
            this.socket.emit('terminalInput', {
                windowId: windowId,
                input: data
            });
            
            // Track commands (simple approach - track when Enter is pressed)
            if (data === '\r' || data === '\n') {
                this.updateWindowCommand(windowId);
            }
        });

        // Handle terminal resize
        xterm.onResize((size) => {
            this.socket.emit('terminalResize', {
                windowId: windowId,
                cols: size.cols,
                rows: size.rows
            });
        });

        // Focus the terminal
        xterm.focus();

        return windowId;
    }

    createWindowElement(windowId) {
        const windowElement = document.createElement('div');
        windowElement.className = 'terminal-window';
        windowElement.id = windowId;
        
        windowElement.innerHTML = `
            <div class="terminal-window-header">
                <span class="terminal-window-title">Terminal ${windowId.split('_')[1]}</span>
                <div class="terminal-window-controls">
                    <button class="window-control-btn minimize" title="Minimize">─</button>
                    <button class="window-control-btn maximize" title="Maximize">□</button>
                    <button class="window-control-btn close" title="Close">×</button>
                </div>
            </div>
            <div class="terminal-content"></div>
            <div class="resize-handle n"></div>
            <div class="resize-handle s"></div>
            <div class="resize-handle e"></div>
            <div class="resize-handle w"></div>
            <div class="resize-handle ne"></div>
            <div class="resize-handle nw"></div>
            <div class="resize-handle se"></div>
            <div class="resize-handle sw"></div>
        `;

        // Setup window controls
        const minimizeBtn = windowElement.querySelector('.minimize');
        const maximizeBtn = windowElement.querySelector('.maximize');
        const closeBtn = windowElement.querySelector('.close');
        const header = windowElement.querySelector('.terminal-window-header');

        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.minimizeWindow(windowId);
        });

        maximizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.maximizeWindow(windowId);
        });

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTerminal(windowId);
        });

        // Setup dragging
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.terminal-window-controls')) return;
            this.startDragging(windowId, e);
        });

        // Setup resizing
        const resizeHandles = windowElement.querySelectorAll('.resize-handle');
        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const direction = handle.className.split(' ').find(cls => cls !== 'resize-handle');
                console.log('Resize started:', direction, 'for window:', windowId);
                this.startResizing(windowId, direction, e);
            });
        });

        // Setup window focus
        windowElement.addEventListener('mousedown', () => {
            this.setActiveWindow(windowId);
        });

        return windowElement;
    }

    setActiveWindow(windowId) {
        // Remove active class from all windows
        document.querySelectorAll('.terminal-window').forEach(win => {
            win.classList.remove('active');
        });

        // Add active class to selected window
        const windowElement = document.getElementById(windowId);
        if (windowElement) {
            windowElement.classList.add('active');
            this.activeWindowId = windowId;
            
            // Bring to front
            windowElement.style.zIndex = this.getHighestZIndex() + 1;

            // Add a brief highlight effect
            windowElement.style.boxShadow = '0 0 20px rgba(74, 158, 255, 0.5)';
            setTimeout(() => {
                windowElement.style.boxShadow = '';
            }, 300);

            // Focus the terminal
            const terminal = this.terminals.get(windowId);
            if (terminal && terminal.xterm) {
                terminal.xterm.focus();
            }

            // Update all taskbar items to reflect the new active window
            this.updateAllTaskbarItems();
        }
    }

    getHighestZIndex() {
        const windows = document.querySelectorAll('.terminal-window');
        let highest = 10;
        windows.forEach(window => {
            const zIndex = parseInt(window.style.zIndex) || 10;
            if (zIndex > highest) highest = zIndex;
        });
        return highest;
    }

    switchToNextWindow() {
        const windowIds = Array.from(this.terminals.keys());
        console.log('Available windows:', windowIds);
        console.log('Current active window:', this.activeWindowId);
        
        if (windowIds.length === 0) {
            console.log('No windows available');
            return;
        }

        let currentIndex = windowIds.indexOf(this.activeWindowId);
        if (currentIndex === -1) currentIndex = 0;

        const nextIndex = (currentIndex + 1) % windowIds.length;
        const nextWindowId = windowIds[nextIndex];
        
        console.log(`Switching from window ${this.activeWindowId} to ${nextWindowId}`);
        this.setActiveWindow(nextWindowId);
        
        // Ensure the taskbar reflects the change
        this.updateAllTaskbarItems();
    }

    minimizeWindow(windowId) {
        const terminal = this.terminals.get(windowId);
        if (!terminal) return;

        terminal.isMinimized = true;
        terminal.element.classList.add('minimized');
        this.updateTaskbarItem(windowId);
    }

    maximizeWindow(windowId) {
        const terminal = this.terminals.get(windowId);
        if (!terminal) return;

        if (terminal.isMaximized) {
            // Restore
            terminal.isMaximized = false;
            terminal.element.classList.remove('maximized');
            terminal.element.style.left = terminal.originalPosition.left;
            terminal.element.style.top = terminal.originalPosition.top;
            terminal.element.style.width = terminal.originalPosition.width;
            terminal.element.style.height = terminal.originalPosition.height;
        } else {
            // Maximize
            terminal.isMaximized = true;
            terminal.originalPosition = {
                left: terminal.element.style.left,
                top: terminal.element.style.top,
                width: terminal.element.style.width,
                height: terminal.element.style.height
            };
            terminal.element.classList.add('maximized');
        }

        // Refit terminal
        if (terminal.fitAddon) {
            setTimeout(() => terminal.fitAddon.fit(), 100);
        }
    }

    closeTerminal(windowId) {
        const terminal = this.terminals.get(windowId);
        if (!terminal) return;

        // Remove from server
        this.socket.emit('closeTerminal', { windowId: windowId });

        // Clean up xterm
        if (terminal.xterm) {
            terminal.xterm.dispose();
        }

        // Remove from DOM
        if (terminal.element) {
            terminal.element.remove();
        }

        // Remove from terminals map
        this.terminals.delete(windowId);
        
        // Remove from commands map
        this.windowCommands.delete(windowId);

        // Update taskbar
        this.updateTaskbar();

        // If this was the active window, switch to another
        if (this.activeWindowId === windowId) {
            const remainingWindows = Array.from(this.terminals.keys());
            if (remainingWindows.length > 0) {
                this.setActiveWindow(remainingWindows[0]);
            } else {
                this.activeWindowId = null;
            }
        }

        // If no windows left, create a new one
        if (this.terminals.size === 0) {
            this.createNewWindow();
        }
    }

    startDragging(windowId, e) {
        const terminal = this.terminals.get(windowId);
        if (!terminal || terminal.isMaximized) return;

        this.draggedWindow = windowId;
        this.dragOffset = {
            x: e.clientX - terminal.element.offsetLeft,
            y: e.clientY - terminal.element.offsetTop
        };

        this.setActiveWindow(windowId);
    }

    startResizing(windowId, direction, e) {
        const terminal = this.terminals.get(windowId);
        if (!terminal || terminal.isMaximized) {
            console.log('Cannot resize: terminal not found or maximized');
            return;
        }

        console.log('Starting resize for window:', windowId, 'direction:', direction);
        
        this.resizedWindow = windowId;
        this.resizeDirection = direction;
        this.resizeStart = {
            x: e.clientX,
            y: e.clientY,
            left: terminal.element.offsetLeft,
            top: terminal.element.offsetTop,
            width: terminal.element.offsetWidth,
            height: terminal.element.offsetHeight
        };

        console.log('Resize start position:', this.resizeStart);
        this.setActiveWindow(windowId);
    }

    setupTaskbarResize() {
        const resizeHandle = document.getElementById('taskbarResizeHandle');
        if (!resizeHandle) return;

        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.startTaskbarResize(e);
        });
    }

    startTaskbarResize(e) {
        this.isResizingTaskbar = true;
        this.taskbarResizeStart = e.clientX;
        
        const resizeHandle = document.getElementById('taskbarResizeHandle');
        if (resizeHandle) {
            resizeHandle.classList.add('resizing');
        }
        
        console.log('Taskbar resize started');
    }

    handleMouseMove(e) {
        if (this.draggedWindow) {
            this.handleDrag(e);
        } else if (this.resizedWindow) {
            this.handleResize(e);
        } else if (this.isResizingTaskbar) {
            this.handleTaskbarResize(e);
        }
    }

    handleDrag(e) {
        const terminal = this.terminals.get(this.draggedWindow);
        if (!terminal) return;

        const newLeft = e.clientX - this.dragOffset.x;
        const newTop = e.clientY - this.dragOffset.y;

        // Keep window within desktop bounds
        const desktop = document.getElementById('desktop');
        const maxLeft = desktop.offsetWidth - terminal.element.offsetWidth;
        const maxTop = desktop.offsetHeight - terminal.element.offsetHeight;

        terminal.element.style.left = `${Math.max(0, Math.min(newLeft, maxLeft))}px`;
        terminal.element.style.top = `${Math.max(0, Math.min(newTop, maxTop))}px`;
    }

    handleResize(e) {
        const terminal = this.terminals.get(this.resizedWindow);
        if (!terminal) {
            console.log('No terminal found for resize');
            return;
        }

        const deltaX = e.clientX - this.resizeStart.x;
        const deltaY = e.clientY - this.resizeStart.y;

        let newLeft = this.resizeStart.left;
        let newTop = this.resizeStart.top;
        let newWidth = this.resizeStart.width;
        let newHeight = this.resizeStart.height;

        const direction = this.resizeDirection;
        console.log('Resizing:', direction, 'deltaX:', deltaX, 'deltaY:', deltaY);

        if (direction.includes('e')) {
            newWidth = Math.max(400, this.resizeStart.width + deltaX);
        }
        if (direction.includes('w')) {
            const widthChange = Math.min(deltaX, this.resizeStart.width - 400);
            newLeft = this.resizeStart.left + widthChange;
            newWidth = this.resizeStart.width - widthChange;
        }
        if (direction.includes('s')) {
            newHeight = Math.max(300, this.resizeStart.height + deltaY);
        }
        if (direction.includes('n')) {
            const heightChange = Math.min(deltaY, this.resizeStart.height - 300);
            newTop = this.resizeStart.top + heightChange;
            newHeight = this.resizeStart.height - heightChange;
        }

        // Apply the new dimensions
        terminal.element.style.left = `${newLeft}px`;
        terminal.element.style.top = `${newTop}px`;
        terminal.element.style.width = `${newWidth}px`;
        terminal.element.style.height = `${newHeight}px`;

        console.log('New dimensions:', { left: newLeft, top: newTop, width: newWidth, height: newHeight });

        // Refit terminal
        if (terminal.fitAddon) {
            terminal.fitAddon.fit();
        }
    }

    handleTaskbarResize(e) {
        const taskbar = document.getElementById('taskbar');
        if (!taskbar) return;

        const deltaX = e.clientX - this.taskbarResizeStart;
        const currentWidth = parseInt(getComputedStyle(taskbar).width);
        const newWidth = Math.max(150, Math.min(500, currentWidth + deltaX));

        taskbar.style.width = `${newWidth}px`;
        this.taskbarResizeStart = e.clientX;
    }

    handleMouseUp() {
        if (this.draggedWindow) {
            console.log('Drag ended for window:', this.draggedWindow);
        }
        if (this.resizedWindow) {
            console.log('Resize ended for window:', this.resizedWindow);
        }
        if (this.isResizingTaskbar) {
            console.log('Taskbar resize ended');
            const resizeHandle = document.getElementById('taskbarResizeHandle');
            if (resizeHandle) {
                resizeHandle.classList.remove('resizing');
            }
        }
        
        this.draggedWindow = null;
        this.resizedWindow = null;
        this.resizeDirection = null;
        this.isResizingTaskbar = false;
    }

    handleCopy() {
        const activeTerminal = this.terminals.get(this.activeWindowId);
        if (activeTerminal && activeTerminal.xterm) {
            const selection = activeTerminal.xterm.getSelection();
            if (selection) {
                this.clipboard = selection;
                // Copy to system clipboard if possible
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(selection).catch(console.error);
                }
            }
        }
    }

    handlePaste() {
        const activeTerminal = this.terminals.get(this.activeWindowId);
        if (activeTerminal && activeTerminal.xterm) {
            // Try to get from system clipboard first
            if (navigator.clipboard) {
                navigator.clipboard.readText().then(text => {
                    activeTerminal.xterm.paste(text);
                }).catch(() => {
                    // Fallback to local clipboard
                    if (this.clipboard) {
                        activeTerminal.xterm.paste(this.clipboard);
                    }
                });
            } else if (this.clipboard) {
                // Fallback to local clipboard
                activeTerminal.xterm.paste(this.clipboard);
            }
        }
    }

    updateTaskbar() {
        const windowList = document.getElementById('windowList');
        windowList.innerHTML = '';

        this.terminals.forEach((terminal, windowId) => {
            const listItem = this.createTaskbarItem(windowId);
            windowList.appendChild(listItem);
        });
    }

    createTaskbarItem(windowId) {
        const terminal = this.terminals.get(windowId);
        if (!terminal) return null;

        const listItem = document.createElement('div');
        listItem.className = 'window-list-item';
        listItem.id = `taskbar-${windowId}`;
        
        // Set active state based on current active window
        if (windowId === this.activeWindowId) {
            listItem.classList.add('active');
        }
        
        if (terminal.isMinimized) {
            listItem.classList.add('minimized');
        }

        const command = this.windowCommands.get(windowId) || 'bash';
        
        listItem.innerHTML = `
            <div class="window-list-item-title">Terminal ${windowId.split('_')[1]}</div>
            <div class="window-list-item-command">${command}</div>
            <button class="window-list-item-close" title="Close">×</button>
        `;

        // Setup click handler
        listItem.addEventListener('click', (e) => {
            if (e.target.classList.contains('window-list-item-close')) {
                e.stopPropagation();
                this.closeTerminal(windowId);
            } else {
                this.setActiveWindow(windowId);
                if (terminal.isMinimized) {
                    this.restoreWindow(windowId);
                }
            }
        });

        return listItem;
    }

    updateTaskbarItem(windowId) {
        const listItem = document.getElementById(`taskbar-${windowId}`);
        if (!listItem) return;

        const terminal = this.terminals.get(windowId);
        if (!terminal) return;

        // Update active state
        listItem.classList.toggle('active', windowId === this.activeWindowId);
        listItem.classList.toggle('minimized', terminal.isMinimized);

        // Update command
        const commandElement = listItem.querySelector('.window-list-item-command');
        const command = this.windowCommands.get(windowId) || 'bash';
        commandElement.textContent = command;
    }

    updateAllTaskbarItems() {
        this.terminals.forEach((terminal, windowId) => {
            this.updateTaskbarItem(windowId);
        });
    }

    updateWindowCommand(windowId) {
        const terminal = this.terminals.get(windowId);
        if (!terminal || !terminal.xterm) return;

        // Get the current line content (simple approach)
        const buffer = terminal.xterm.buffer.active;
        const line = buffer.getLine(buffer.baseY + buffer.cursorY);
        if (line) {
            const command = line.translateToString().trim();
            if (command) {
                this.windowCommands.set(windowId, command);
                this.updateTaskbarItem(windowId);
            }
        }
    }

    restoreWindow(windowId) {
        const terminal = this.terminals.get(windowId);
        if (!terminal) return;

        terminal.isMinimized = false;
        terminal.element.classList.remove('minimized');
        this.updateTaskbarItem(windowId);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WebTerminator();
});
