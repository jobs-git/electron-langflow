const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-features', 'UseChromeOSDirectVideoDecoder');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,VaapiVideoEncoder,Vulkan');
app.commandLine.appendSwitch('use-vulkan');
app.commandLine.appendSwitch('use-angle', 'vulkan');
app.commandLine.appendSwitch('enable-gpu');
app.commandLine.appendSwitch('use-dGPU');
app.commandLine.appendSwitch('force_high_performance_gpu');

let main;
let loadingWindow;

function getWindowState() {
    try {
        const windowState = fs.readFileSync(path.join(app.getPath('userData'), 'window-state.json'));
        return JSON.parse(windowState);
    } catch (error) {
        return { width: 800, height: 600, isMaximized: false, isMinimized: false, x: undefined, y: undefined };
    }
}

function saveWindowState(window) {
    const windowState = {
        x: window.getBounds().x,
        y: window.getBounds().y,
        width: window.getBounds().width,
        height: window.getBounds().height,
        isMaximized: window.isMaximized(),
        isMinimized: window.isMinimized()
    };
    fs.writeFileSync(path.join(app.getPath('userData'), 'window-state.json'), JSON.stringify(windowState));
}

function createLoadingScreen() {
    loadingWindow = new BrowserWindow({
        width: 540,
        height: 300,
        frame: false,
        transparent: true,
        webPreferences: {
            enableRemoteModule: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
        center: true,
    });

    loadingWindow.loadFile(path.join(__dirname, 'loading.html'));
    loadingWindow.on('closed', () => (loadingWindow = null));
}

function createWindow() {
    const windowState = getWindowState();

    main = new BrowserWindow({
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            enableHardwareAcceleration: true
        },
        autoHideMenuBar: true,
        show: false
    });

    main.loadURL('http://127.0.0.1:7860');

    main.webContents.on('did-finish-load', () => {
        setTimeout(() => {
            if (loadingWindow) {
                loadingWindow.close();
            }
            main.show();

            if (windowState.isMaximized) {
                main.maximize();
            } else if (windowState.isMinimized) {
                main.minimize();
            }
        }, 2000); // LangFlow takes sometime to load
    });

    const menuTemplate = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'Ctrl+R',
                    click: () => {
                        main.reload();
                    }
                },
                {
                    label: 'Quit',
                    accelerator: 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    main.on('close', (event) => {
        if (!main.isMinimized()) {
            saveWindowState(main);
        }
    });

    main.on('closed', () => {
        main = null;
    });

    main.on('resize', () => saveWindowState(main));
    main.on('move', () => saveWindowState(main));
    main.on('maximize', () => saveWindowState(main));
    main.on('unmaximize', () => saveWindowState(main));
    main.on('minimize', () => saveWindowState(main));
    main.on('restore', () => saveWindowState(main));
}

app.whenReady().then(() => {
    createLoadingScreen();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
