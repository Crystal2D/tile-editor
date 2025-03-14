const URLSearch = new URLSearchParams(window.location.search);
const projectDir = decodeURIComponent(URLSearch.get("dir"));

let dockResizing = false;
let keepFocus = false;
let edited = false;
let dockSize = 250;
let sizerOffset = 0;
let resources = [];
let textures = [];
let textureListItems = [];

let textureList = null;
let dock = null;
let inspectorInfo = null;
let inspectorContent = null;
let inspectorPath = null;
let inspectorData = null;
let inspectorPPU = null;
let inspectorRevert = null;
let inspectorApply = null;
let inspectorPreview = null;
let currentTexture = null;
let textureRes = null;
let noTextureInfo = null;

let currentPPU = null;
let currentRegPath = null;

(async () => {
    const resRequest = await fetch(`${projectDir}\\data\\resources.json`);
    resources = await resRequest.json();

    textures = resources.filter(item => item.type === "Texture");

    textureList = document.createElement("div");
    textureList.id = "texture-list";

    for (let i = 0; i < textures.length; i++)
    {
        const texture = textures[i];

        const item = document.createElement("div");
        item.classList.add("item");
        item.setAttribute("focused", 0);
        item.append(texture.path);
        
        item.addEventListener("click", () => FocusTexture(texture.path));
        item.addEventListener("mouseover", () => keepFocus = true);
        item.addEventListener("mouseout", () => keepFocus = false);

        textureListItems.push(item);
    }

    textureList.append(...textureListItems);

    const dock = UI.ContainerStart();
    dock.id = "dock";

    const dockContent = UI.ContainerStart();
    dockContent.classList.add("content");

    const search = UI.SearchBar();
    search.container.id = "search";

    let searchInfo = null;

    const wrap = UI.ContainerStart();
    wrap.id = "list-wrap";

    if (textures.length > 0)
    {
        wrap.addEventListener("mousedown", event => { if (event.button === 0 && !keepFocus) Unfocus(); });

        UI.AddContent(textureList);
    }
    else noTextureInfo = UI.Info("Huh...", "You currently have no textures");

    searchInfo = UI.Info("Sorry :v", "");
    searchInfo.style.display = "none";

    UI.ContainerEnd();

    let listSearch = "";

    search.onUpdate = text => {
        if (listSearch === text || textures.length === 0) return;

        const listSearched = text.length === 0 ? [] : textureListItems.filter(item => item.innerText.toLowerCase().includes(text));

        while (textureList.firstChild != null) textureList.firstChild.remove();

        textureList.append(...(text.length > 0 ? listSearched : textureListItems));

        if (text.length > 0 && listSearched.length === 0)
        {
            textureList.style.display = "none";

            searchInfo.querySelector(".description").textContent = `We can't find textures with "${text}"`;
            searchInfo.style.display = "";
        }
        else
        {
            textureList.style.display = "";
            searchInfo.style.display = "none";
        }

        listSearch = text;
    };

    const importButton = UI.Button("Import Texture");
    importButton.element.id = "import";
    importButton.onClick = () => Import();

    UI.ContainerEnd();

    const dockSizer =  document.createElement("div");
    dockSizer.classList.add("sizer");
    dockSizer.addEventListener("mousedown", event => {
        if (event.button !== 0 || dockResizing) return;

        dockResizing = true;

        Input.AvoidDrags(true);
        Input.SetCursor("e-resize");

        const mouse = Math.max(Math.min(Input.MouseX(), 400), 250);
        sizerOffset = dock.getBoundingClientRect().right - mouse;
    });
    UI.AddContent(dockSizer);
    
    UI.ContainerEnd();


    const inspector = UI.ContainerStart();
    inspector.id = "inspector";

    inspectorInfo = UI.Info("See nothing?", "Select a texture!");

    inspectorContent = UI.ContainerStart();
    inspectorContent.style.display = "none";

    inspectorPath = UI.TextField("Registered Path");
    (() => {
        inspectorPath.element.id = "texture-path";

        const input = inspectorPath.element.querySelector(".input")
        inspectorPath.onBlur = () => {
            const text = input.innerText.trim();

            if (text.length > 0) return;

            input.innerText = currentTexture;
        };
    })();
    inspectorPath.onUpdate = value => {
        if (currentTexture == null || currentRegPath === value) return;

        textureListItems.find(item => item.innerText === currentTexture).innerText = value;

        textureRes.path = value;
        currentTexture = value;

        MarkAsEdited();
    };

    inspectorData = UI.Label("");
    inspectorData.id = "texture-data";

    inspectorPPU = UI.NumberField("Pixel Per Unit", 16);
    inspectorPPU.element.id = "texture-ppu";
    inspectorPPU.onUpdate = value => {
        if (currentTexture == null || currentPPU === value) return;

        textureRes.args.pixelPerUnit = value;

        MarkAsEdited();
    };

    const buttons = UI.ContainerStart();
    buttons.id = "buttons";

    UI.Button("Edit Mapping").onClick = () => ipcRenderer.invoke(
        "OpenMini",
        "Texture Mapper",
        window.parentID,
        `texture-mapper:${currentTexture}`,
        "TextureMapper/main",
        "TextureMapper/styles",
        `dir=${projectDir}&path=${currentTexture}`
    );
    
    inspectorRevert = UI.Button("Revert");
    inspectorRevert.onClick = () => Revert();

    inspectorApply = UI.Button("Apply");
    inspectorApply.onClick = () => Save();

    UI.ContainerEnd();

    inspectorPreview = UI.SectionStart("Preview");
    inspectorPreview.element.id = "texture-preview";
    UI.SectionEnd();

    UI.ContainerEnd();

    UI.ContainerEnd();

    Input.OnMouseDown().Add(event => {
        if (dockResizing)
        {
            event.preventDefault();

            document.activeElement.blur();
        }
    });
    Input.OnMouseUp().Add(() => {
        if (dockResizing)
        {
            dockResizing = false;

            Input.ResetCursor();
            Input.AvoidDrags(false);
        }
    });

    Loop.Append(() => Update());
})();

function MarkAsEdited ()
{
    edited = true;

    document.title = `${currentTexture} - Texture Viewer*`;
    inspectorRevert.SetActive(true);
    inspectorApply.SetActive(true);
}

function Update ()
{
    if (!dockResizing && dockSize > 400)
    {
        dockSize = 400;
        document.body.style.setProperty("--dock-size", `${dockSize}px`);
    }
    else if (dockResizing)
    {
        const mouse = Math.max(Math.min(Input.MouseX() + sizerOffset, 400), 250);
        const newSize = mouse;

        dockSize = newSize;
        document.body.style.setProperty("--dock-size", `${dockSize}px`);
    }

    inspectorPreview.element.style.height = `${window.innerHeight - inspectorPreview.element.previousElementSibling.getBoundingClientRect().bottom - 14}px`;
}

async function ProcessTextureData ()
{
    if (textureRes == null) return;

    document.title = `${currentTexture} - Texture Viewer`;

    if (currentPPU !== textureRes.args.pixelPerUnit)
    {
        if (textureRes.args.pixelPerUnit === 16) textureRes.args.pixelPerUnit = undefined;

        EvalToMain(`TextureManager.UpdatePPU("${currentRegPath}", ${textureRes.args.pixelPerUnit})`);

        currentPPU = textureRes.args.pixelPerUnit;
    }

    if (currentRegPath !== currentTexture)
    {
        EvalToMain(`TextureManager.ChangePath("${currentRegPath}", "${currentTexture}")`);

        currentRegPath = currentTexture;
    }    
}

async function Save ()
{
    inspectorRevert.SetActive(false);
    inspectorApply.SetActive(false);

    edited = false;

    await new Promise(resolve => requestAnimationFrame(resolve));

    ProcessTextureData();

    await FS.writeFile(`${projectDir}\\data\\resources.json`, JSON.stringify(resources, null, 4));
}

async function Revert ()
{
    textureListItems.find(item => item.innerText === currentTexture).innerText = currentRegPath;

    textureRes.path = currentRegPath;
    currentTexture = currentRegPath;
    
    document.title = `${currentTexture} - Texture Viewer`;

    textureRes.args.pixelPerUnit = currentPPU;

    inspectorRevert.SetActive(false);
    inspectorApply.SetActive(false);

    edited = false;
    currentTexture = null;

    await FocusTexture(currentRegPath);
}

async function UnsavedPrompt ()
{
    if (!edited) return true;

    const prompt = await ipcRenderer.invoke("UnsavedPrompt", "Texture has unsaved changes", currentTexture, window.windowID);

    if (prompt === 0) return false;
    else if (prompt === 1) await Save();
    else Revert();

    return true;
}

async function FocusTexture (path)
{
    if (currentTexture === path || !(await UnsavedPrompt())) return;
    
    textureListItems.find(item => item.innerText === currentTexture)?.setAttribute("focused", 0);
    
    currentTexture = path;
    document.title = `${path} - Texture Viewer`;
    textureListItems.find(item => item.innerText === path)?.setAttribute("focused", 1);

    const texture = textures.find(item => item.path === path);
    textureRes = texture;

    currentRegPath = path;
    inspectorPath.SetText(path);

    const src = `${projectDir}\\img\\${texture.args.src.replaceAll("/", "\\")}`;

    const rawImage = new Image();
    rawImage.src = src;

    await new Promise(resolve => rawImage.onload = resolve);

    inspectorData.innerText = `${src}\n\nWidth: ${rawImage.width}\nHeight: ${rawImage.height}`;

    currentPPU = textureRes.args.pixelPerUnit ?? 16;
    
    inspectorPPU.SetValue(currentPPU);
    inspectorRevert.SetActive(false);
    inspectorApply.SetActive(false);

    while (inspectorPreview.element.firstChild != null) inspectorPreview.element.firstChild.remove();
    rawImage.draggable = false;
    inspectorPreview.element.append(rawImage);

    inspectorInfo.style.display = "none";
    inspectorContent.style.display = "";
}

async function Unfocus ()
{
    if (currentTexture == null || !(await UnsavedPrompt())) return;

    document.title = "Texture Viewer";

    textureListItems.find(item => item.innerText === currentTexture)?.setAttribute("focused", 0);
    currentTexture = null;
    textureRes = null;

    inspectorContent.style.display = "none";
    inspectorInfo.style.display = "";
}

async function NewTexture (path, src)
{
    if (noTextureInfo != null)
    {
        noTextureInfo.remove();

        const wrap = main.querySelector("#list-wrap");
        wrap.addEventListener("mousedown", event => { if (event.button === 0 && !keepFocus) Unfocus(); });
        wrap.append(textureList);

        noTextureInfo = null;
    }

    const texture = {
        path: path,
        type: "Texture",
        args: { src: src }
    };

    resources.push(texture);
    textures.push(texture);

    EvalToMain(`
        TextureManager.AddTexture(${JSON.stringify({
            path: path.replaceAll("\\", "\\\\"),
            type: "Texture",
            args: { src: src.replaceAll("\\", "\\\\") }
        })});
    `);

    await new Promise(resolve => requestAnimationFrame(resolve));

    await Save();

    const item = document.createElement("div");
    item.classList.add("item");
    item.setAttribute("focused", 0);
    item.append(path);
    
    item.addEventListener("click", () => FocusTexture(texture.path));
    item.addEventListener("mouseover", () => keepFocus = true);
    item.addEventListener("mouseout", () => keepFocus = false);

    textureListItems.push(item);
    textureList.append(item);

    await FocusTexture(path);
}

async function Import ()
{
    const file = await ipcRenderer.invoke("SelectFile", `${projectDir}\\img`, {
        title: "Import Texture",
        buttonLabel: "Import",
        windowID: window.windowID,
        filters: [{ name: "Images", extensions: ["png", "jpeg", "jpg"] }]
    });

    if (file.canceled) return;

    if (!file.path.startsWith(`${projectDir}\\img\\`))
    {
        await ipcRenderer.invoke("WarningDialog", "Can't use image", `Image must be found at ${projectDir}\\img`, window.windowID);

        return;
    }

    if (!(await UnsavedPrompt())) return;

    const src = file.path.slice((`${projectDir}\\img\\`).length);
    let path = src.split(".");
    path.pop();
    path.join(".");
    path = path[0].replaceAll("\\", "/");

    await NewTexture(path, src);
}


let forceDOMClose = false;

window.addEventListener("beforeunload", async event => {
    if (forceDOMClose) return;

    if (edited)
    {
        event.preventDefault();

        if (!(await UnsavedPrompt())) return;
            
        forceDOMClose = true;
        window.close();
    }
});

ipcRenderer.on("UpdateTexture", async (event, path) => {
    const resRequest = await fetch(`${projectDir}\\data\\resources.json`);
    const newRes = await resRequest.json();

    const texture = resources.find(item => item.path === path);
    const newTexture = newRes.find(item => item.path === path);

    texture.args.sprites = newTexture.args.sprites;
});