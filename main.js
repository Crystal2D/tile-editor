const { app, BrowserWindow, ipcMain, dialog, Menu, Tray } = require("electron");
const FS = require("fs/promises");
const DelegateEvent = require("./js/DelegateEvent");


let closeHub = false;
let windowList = [];
let projectWindows = [];
let modalDialogs = [];
let minis = [];

let hubWindow = null;
let appTray = null;

function FindWindow (id)
{
    return windowList.find(item => item.id === id)?.window;
}

function FindMini (parentID, miniID)
{
    return minis.find(item => item.parentID === parentID && item.id === miniID)?.window;
}

async function main ()
{
    if (!app.requestSingleInstanceLock())
    {
        app.quit();

        return;
    }

    app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

    await app.whenReady();

    app.on("second-instance", () => {
        if (closeHub)
        {
            InitWindow();

            return;
        }

        hubWindow.show();
        hubWindow.focus();
    });

    InitWindow();
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
        modal: data.modal,
        parent: data.parent,
        webPreferences : {
            contextIsolation : false,
            nodeIntegration : true
        },
        icon: `${__dirname}/icon/icon.png`
    });

    win.setMenuBarVisibility(false);

    let winID = 0;
    
    while (windowList.find(item => item.id === winID) != null) winID++;

    let search = `window-id=${winID}`;
    if (data.search != null) search += `&${data.search}`;

    const winCache = {
        id: winID,
        window: win,
        onClose: new DelegateEvent()
    };
    windowList.push(winCache);

    win.on("closed", () => {
        windowList.splice(windowList.indexOf(winCache), 1);
    
        winCache.onClose.Invoke();
    });
    
    await win.loadFile(data.src, { search: search });

    win.show();

    if (data.maximized) win.maximize();

    return win;
}

async function SelectFolder (path, data)
{
    if (data == null) data = { };

    const folder = await dialog.showOpenDialog(FindWindow(data.windowID), {
        defaultPath: path,
        title: data.title,
        buttonLabel: data.buttonLabel,
        filters: data.filters,
        properties: ["openDirectory", "showHiddenFiles"]
    });

    return {
        canceled: folder.canceled,
        path: folder.filePaths[0] ?? ""
    };
}

async function SelectFile (path, data)
{
    if (data == null) data = { };

    if (data.save)
    {
        const file = await dialog.showSaveDialog(FindWindow(data.windowID), {
            defaultPath: path,
            title: data.title,
            buttonLabel: data.buttonLabel,
            filters: data.filters,
            properties: ["showHiddenFiles"]
        });

        return {
            canceled: file.canceled,
            path: file.filePath
        };
    }

    const properties = ["openFile", "showHiddenFiles"];

    if (data.promptToCreate) properties.push("promptToCreate");

    const file = await dialog.showOpenDialog(FindWindow(data.windowID), {
        defaultPath: path,
        title: data.title,
        buttonLabel: data.buttonLabel,
        filters: data.filters,
        properties: properties
    });

    return {
        canceled: file.canceled,
        path: file.filePaths[0] ?? ""
    };
}

async function InitWindow ()
{
    // OpenProject("C:\\Users\\marcp\\Documents\\GitHub\\Crystal2D\\crystal2d.github.io");

    // return;

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

    closeHub = false;

    hubWindow.on("close", event => {
        if (closeHub) return;

        event.preventDefault();
        hubWindow.hide();
    });

    appTray = new Tray(`${__dirname}/icon/icon.png`);
    appTray.setToolTip("Crystal Tile Editor");
    appTray.addListener("click", () => hubWindow.show());

    hubWindow.focus();
}

async function ModalDialog (src, title, content, windowID, search)
{
    let searchData = `content=${encodeURIComponent(content)}&parent-id=${windowID}`;
    if (search != null) searchData += `&${search}`;

    const parentWin = FindWindow(windowID);
    parentWin.show();
    parentWin.focus();

    const win = await CreateWindow({
        name: title,
        width: 400,
        height: 180,
        src: `${src}/index.html`,
        titleBarStyle: "hidden",
        titleBarOverlay: {
            height: 25,
            color: "#202020",
            symbolColor: "#aaaaaa",
        },
        search: searchData,
        modal: true,
        parent: parentWin
    });
    win.minimizable = false;
    win.maximizable = false;
    win.resizable = false;

    let output = 0;

    const modalDialog = {
        id: windowID,
        doneCall: data => {
            output = data;

            win.close();
        }
    };
    modalDialogs.push(modalDialog);

    await new Promise(resolve => win.on("closed", resolve));

    modalDialogs.splice(modalDialogs.indexOf(modalDialog), 1);

    return output;
}

async function UnsavedPrompt (title, content, windowID, uncancelable)
{
    return await ModalDialog(
        "unsaved-prompt",
        title,
        `"${content}"`, 
        windowID,
        `uncancelable=${uncancelable ?? false}`
    );
}

async function WarningDialog (title, content, windowID)
{
    return await ModalDialog("warning-dialog", title, content, windowID);
}

async function InfoDialog (title, content, windowID)
{
    return await ModalDialog("info-dialog", title, content, windowID);
}

async function RefreshTray ()
{
    const userDataPath = `${app.getPath("userData")}\\User Data`;
    const projects = JSON.parse(await FS.readFile(`${userDataPath}\\projects.json`, "utf8"));

    let template = [];
    let projIndex = 0;

    while (template.length <= 5 && projIndex < projects.length)
    {
        try
        {
            const proj = projects[projIndex];
            const manifestData = JSON.parse(await FS.readFile(`${proj}\\manifest.json`, "utf8"));

            template.push({
                label: manifestData.name,
                click: () => OpenProject(proj)
            });
        }
        catch { }

        projIndex++;
    }

    if (template.length > 0) template.push({ type: "separator" });

    template.push(
        {
            label: "Open Hub",
            click: () => hubWindow.show()
        },
        {
            label: "Quit Hub",
            click: () => {
                closeHub = true;
                hubWindow.close();
                appTray.destroy();
            }
        }
    );

    appTray.setContextMenu(Menu.buildFromTemplate(template));
}

async function OpenProject (dir)
{
    const existing = projectWindows.find(item => item.dir === dir);

    if (existing != null)
    {
        const win = existing.window;

        win.show();
        win.maximize();
        win.focus();

        return;
    }

    const manifestData = JSON.parse(await FS.readFile(`${dir}\\manifest.json`, "utf8"));

    const projectWin = await CreateWindow({
        name: `${manifestData.name} - Crystal Tile Editor`,
        width: 1100,
        height: 700,
        src: "index.html",
        search: `dir=${dir}&project-name=${manifestData.name}`,
        maximized: true
    });
    projectWin.setMinimumSize(1100, 700);
    // projectWin.webContents.openDevTools({ mode: "detach" });

    const winCache = {
        dir: dir,
        window: projectWin
    };
    projectWindows.push(winCache);

    projectWin.on("closed", () => projectWindows.splice(projectWindows.indexOf(winCache), 1));

    projectWin.focus();
}

async function OpenMini (title, windowID, miniID, js, css, search)
{
    let existing = FindMini(windowID, miniID);

    if (existing != null)
    {
        existing.show();
        existing.focus();

        return;
    }

    let searchData = `parent-id=${windowID}&mini-id=${miniID}&js-src=${js}&css-src=${css}`;
    if (search != null) searchData += `&${search}`;

    const win = await CreateWindow({
        name: title,
        width: 900,
        height: 600,
        src: "mini/index.html",
        search: searchData
    });
    win.setMinimumSize(600, 400);
    // win.webContents.openDevTools({ mode: "detach" });

    existing = FindMini(windowID, miniID);

    if (existing != null)
    {
        win.close();

        existing.show();
        existing.focus();

        return;
    }

    const parentWin = windowList.find(item => item.id === windowID);
    const closeCall = () => win.close();
    parentWin.onClose.Add(closeCall);

    const winCache = {
        parentID: windowID,
        id: miniID,
        window: win,
        loadCall: () => { }
    };
    minis.push(winCache);

    win.on("closed", () => {
        parentWin.onClose.Remove(closeCall);

        minis.splice(minis.indexOf(winCache), 1);
    });

    await new Promise(resolve => winCache.loadCall = resolve);
}

main();


ipcMain.handle("GetPath", (event, name) => app.getPath(name));
ipcMain.handle("SelectFolder", async (event, path, data) => await SelectFolder(path, data));
ipcMain.handle("SelectFile", async (event, path, data) => await SelectFile(path, data));
ipcMain.handle("OpenProject", async (event, dir) => OpenProject(dir));
ipcMain.handle("RefreshTray", () => RefreshTray());
ipcMain.handle("UnsavedPrompt", async (data, title, content, windowID, uncancelable) => await UnsavedPrompt(title, content, windowID, uncancelable));
ipcMain.handle("WarningDialog", async (data, title, content, windowID) => await WarningDialog(title, content, windowID));
ipcMain.handle("InfoDialog", async (data, title, content, windowID) => await InfoDialog(title, content, windowID));
ipcMain.handle("eval", (data, input) => eval(input));
ipcMain.handle("OpenMini", async (data, title, windowID, miniID, js, css, search) => await OpenMini (title, windowID, miniID, js, css, search));