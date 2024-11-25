const { app, BrowserWindow, ipcMain, dialog } = require("electron");
// const store = new require("electron-store")();

let hubWindow = null;

async function main ()
{
    app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

    await app.whenReady();

    InitWindow();

    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) InitWindow(); });
}

async function CreateWindow (data)
{
    const win = new BrowserWindow({
        title : data.name,
        width : data.width,
        height : data.height,
        show : false,
        backgroundColor : "#000000",
        fullscreenable : data.fullscreenable ?? false,
        titleBarStyle: data.titleBarStyle,
        titleBarOverlay: data.titleBarOverlay,
        webPreferences : {
            contextIsolation : false,
            nodeIntegration : true
        }
    });

    win.setMenuBarVisibility(false);
    
    await win.loadFile(data.src, {
        search: data.search ?? null
    });

    win.show();

    if (data.maximized) win.maximize();

    return win;
}

async function OpenFolder (path)
{
    const folder = await dialog.showOpenDialog({
        defaultPath: path,
        properties: ["openDirectory"]
    });

    return {
        cancelled: folder.canceled,
        path: folder.filePaths[0] ?? ""
    };
}

async function InitWindow ()
{
    const projectWin = await CreateWindow({
        width: 1100,
        height: 700,
        src: "Refractor/index.html",
        search: "dir=C:\\Users\\marcp\\Documents\\GitHub\\crystal2d.github.io",
        // maximized: true
    });
    projectWin.setMinimumSize(1100, 700);
    projectWin.setMaximumSize(1100, 700);
    projectWin.webContents.openDevTools({ mode: "detach" });

    app.focus();

    return;

    hubWindow = await CreateWindow({
        name: "Crystal Tile Editor",
        width: 900,
        height: 600,
        src: "hub/index.html",
        titleBarStyle: "hidden",
        titleBarOverlay: {
            height: 25,
            color: "black",
            symbolColor: "#aaaaaa",
        }
    });
    hubWindow.setMinimumSize(900, 600);
    // hubWindow.webContents.openDevTools({ mode: "detach" });

    app.focus();
}

main();


ipcMain.handle("GetPath", (event, name) => app.getPath(name));
ipcMain.handle("OpenFolder", async (event, path) => await OpenFolder(path));
ipcMain.handle("OpenProject", async (event, dir) => {
    const projectWin = await CreateWindow({
        width: 1100,
        height: 700,
        src: `index.html`,
        search: `dir=${dir}`,
        maximized: true
    });
    projectWin.setMinimumSize(1100, 700);
    projectWin.webContents.openDevTools({ mode: "detach" });
});