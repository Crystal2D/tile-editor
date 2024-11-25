let userDataPath = null;

function ListItem (name, dir)
{
    const output = document.createElement("div");
    output.setAttribute("renaming", false);

    let stopClicks = false;
    let cancelSelect = false;
    let selected = false;
    let cancelClick = false;

    output.addEventListener("mousedown", event => {
        if (stopClicks || event.button !== 0) return;

        if (cancelSelect)
        {
            cancelSelect = false;

            return;
        }

        output.style.background = "rgb(42, 42, 42)";
        selected = true;
    });
    output.addEventListener("mouseleave", () => output.style.background = "");
    output.addEventListener("mouseenter", () => { if (selected) output.style.background = "rgb(42, 42, 42)"; });
    output.addEventListener("click", async () => {
        if (stopClicks || !selected) return;

        if (cancelClick)
        {
            cancelClick = false;

            return;
        }

        output.style.background = "";
        selected = false;

        window.close();
        await ipcRenderer.invoke("OpenProject", dir);
    });

    const text = document.createElement("div");
    text.classList.add("text");

    const title = document.createElement("div");
    title.classList.add("title");
    title.setAttribute("spellcheck", false);
    title.append(name);

    let currentName = name;

    title.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;

        event.preventDefault();

        title.blur();
    })
    title.addEventListener("input", () => {
        title.textContent = title.textContent.replace(/(?:\r\n|\r|\n)/g, "");
    });
    title.addEventListener("focus", () => {
        const range = document.createRange();
        range.selectNodeContents(title);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    });
    title.addEventListener("blur", async () => {
        title.innerText = title.innerText.trim();
        const text = title.innerText;

        output.setAttribute("renaming", false);
        title.setAttribute("contenteditable", false);

        stopClicks = false;

        if (text.length === 0 || text === currentName) return;

        currentName = text;

        const manifestRequest = await fetch(`${dir}\\manifest.json`);
        const manifestData = await manifestRequest.json();

        manifestData.name = text;

        await FS.writeFile(`${dir}\\manifest.json`, JSON.stringify(manifestData, null, 4));
    });

    const dirText = document.createElement("div");
    dirText.classList.add("dir");
    dirText.append(dir);

    text.append(title, dirText);

    const openContext = () => {
        requestAnimationFrame(() => output.style.background = "rgb(48, 48, 48)");

        const ctxMenu = new ContextMenu(
            [
                new MenuItem("Rename", () => {
                    MenuManager.CloseContextMenus();

                    stopClicks = true;

                    output.setAttribute("renaming", true);
                    title.setAttribute("contenteditable", true);

                    requestAnimationFrame(() => title.focus());
                }),
                new MenuItem("Open in Explorer", () => {
                    MenuManager.CloseContextMenus();

                    if(process.platform === "win32") spawn("explorer.exe", [dir]);
                    else shell.openPath(dir);
                }),
                new MenuLine(),
                new MenuItem("Remove from list", async () => {
                    MenuManager.CloseContextMenus();

                    const projectsRequest = await fetch(`${userDataPath}\\projects.json`);
                    const projects = await projectsRequest.json();

                    projects.splice(projects.indexOf(dir), 1);

                    await FS.writeFile(`${userDataPath}\\projects.json`, JSON.stringify(projects));

                    Refresh();
                })
            ],
            {
                width: 175,
                posX: Input.MouseX(),
                posY: Input.MouseY()
            }
        );
        ctxMenu.onClose = () => output.style.background = "";
    };

    output.addEventListener("contextmenu", () => {
        if (stopClicks) return;
        
        selected = false;

        openContext();
    });

    const menu = document.createElement("img");
    menu.setAttribute("draggable", "false");
    menu.classList.add("menu");
    menu.src = "img/more.svg";

    menu.addEventListener("mousedown", () => cancelSelect = true);
    menu.addEventListener("click", () => {
        if (stopClicks) return;
        
        cancelClick = true;

        openContext();
    });

    output.append(text, menu);
    list.append(output);
}

async function Refresh ()
{
    let projects = [];
    
    try
    {
        const projectsRequest = await fetch(`${userDataPath}\\projects.json`);
        projects = await projectsRequest.json();
    }
    catch { await FS.writeFile(`${userDataPath}\\projects.json`, "[]"); }

    while (list.firstChild != null) list.firstChild.remove();

    for (let i = 0; i < projects.length; i++)
    {
        try
        {
            const manifestRequest = await fetch(`${projects[i]}\\manifest.json`);
            const manifestData = await manifestRequest.json();

            ListItem(manifestData.name, projects[i]);
        }
        catch { }
    }
}

async function Init ()
{
    const userPath = await ipcRenderer.invoke("GetPath", "userData");
    userDataPath = `${userPath}\\User Data`;

    if (!SyncFS.existsSync(userDataPath)) await FS.mkdir(userDataPath);

    Refresh();
}

async function Add (dir)
{
    const projectsRequest = await fetch(`${userDataPath}\\projects.json`);
    const projects = await projectsRequest.json();

    if (projects.indexOf(dir) >= 0) return;
    
    try
    {        
        await fetch(`${dir}\\manifest.json`);

        projects.unshift(dir);

        await FS.writeFile(`${userDataPath}\\projects.json`, JSON.stringify(projects));

        Refresh();
    }
    catch { console.log("aaaaaaaaaaaa"); }
}


module.exports = {
    Init,
    Refresh,
    Add
};