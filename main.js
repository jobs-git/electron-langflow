const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch ('no-sandbox');
app.commandLine.appendSwitch ('ozone-platform-hint', 'auto');
app.commandLine.appendSwitch ('enable-zero-copy');
app.commandLine.appendSwitch ('disable-features', 'UseChromeOSDirectVideoDecoder');
app.commandLine.appendSwitch ('enable-features', 'VaapiVideoDecoder,VaapiVideoEncoder,Vulkan');
app.commandLine.appendSwitch ('use-vulkan');
app.commandLine.appendSwitch ('use-angle', 'vulkan');
app.commandLine.appendSwitch ('enable-gpu');
app.commandLine.appendSwitch ('use-dGPU');
app.commandLine.appendSwitch ('force_high_performance_gpu');

let main;

function getWindowState () {
    try {
        const windowState = fs.readFileSync (path.join (app.getPath ('userData'), 'window-state.json'));
        return JSON.parse (windowState);
    } catch (error) {

        return { width: 800, height: 600, isMaximized: false, isMinimized: false, x: undefined, y: undefined };
    }
}

function saveWindowState (window) {
    const windowState = {
        x: window.getBounds ().x,
        y: window.getBounds ().y,
        width: window.getBounds ().width,
        height: window.getBounds ().height,
        isMaximized: window.isMaximized (),
        isMinimized: window.isMinimized ()
    };
    fs.writeFileSync (path.join (app.getPath ('userData'), 'window-state.json'), JSON.stringify (windowState));
}

function createWindow () {
    const windowState = getWindowState ();

    main = new BrowserWindow ({
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
        webPreferences: {
            preload: path.join (__dirname, 'preload.js'),
            enableHardwareAcceleration: true
        },
        autoHideMenuBar: true
    });
    
    // LangFlow URL
    main.loadURL ('http://127.0.0.1:7860');

    if (windowState.isMaximized) {
        main.once ('ready-to-show', () => {
            main.maximize ();
        });
    } else if (windowState.isMinimized) {
        main.once ('ready-to-show', () => {
            main.minimize ();
        });
    }

    main.on ('close', (event) => {
        if (!main.isMinimized ()) {
            saveWindowState (main);
        }
    });

    main.on ('closed', () => {
        main = null;
    });

    main.on ('resize', () => saveWindowState (main));
    main.on ('move', () => saveWindowState (main));
    main.on ('maximize', () => saveWindowState (main));
    main.on ('unmaximize', () => saveWindowState (main));
    main.on ('minimize', () => saveWindowState (main));
    main.on ('restore', () => saveWindowState (main));
}

app.whenReady ().then (() => {
    createWindow();

    app.on ('activate', () => {
        if (BrowserWindow.getAllWindows ().length === 0) {
            createWindow ();
        }
    });
});

app.on ('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit ();
    }
});

