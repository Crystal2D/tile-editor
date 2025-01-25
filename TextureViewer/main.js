function EvalToMain (data)
{
    ipcRenderer.invoke("eval", `
        const win = FindWindow(${window.parentID});
        
        if (win != null) win.webContents.send("eval", \`${data}\`);
    `);
}

// window.addEventListener("beforeunload", () => EvalToMain("SceneManager.SetSettingsOpened(false)"));

const URLSearch = new URLSearchParams(window.location.search);
const projectDir = decodeURIComponent(URLSearch.get("dir"));

let dockResizing = false;
let keepFocus = false;
let dockSize = 250;
let sizerOffset = 0;
let textures = [];
let textureListItems = [];

let textureList = null;
let dock = null;
let inspectorInfo = null;
let inspectorContent = null;
let inspectorPath = null;
let inspectorData = null;
let inspectorPPU = null;
let inspectorApply = null;
let inspectorPreview = null;
let currentTexture = null;

(async () => {
    const resRequest = await fetch(`${projectDir}\\data\\resources.json`);
    const resources = await resRequest.json();

    textures = resources.filter(item => item.type === "Texture");

    textureList = document.createElement("div");
    textureList.id = "texture-list";

    for (let i = 0; i < textures.length; i++)
    {
        const item = document.createElement("div");
        item.classList.add("item");
        item.setAttribute("focused", 0);
        item.append(textures[i].path);
        
        item.addEventListener("click", () => FocusTexture(textures[i].path));
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

        searchInfo = UI.Info("Sorry :v", "");
        searchInfo.style.display = "none";
    }
    else UI.Info("Huh...", "You currently have no textures");

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
    inspectorPath.element.id = "texture-path";

    inspectorData = UI.Label("");
    inspectorData.id = "texture-data";

    inspectorPPU = UI.NumberField("Pixel Per Unit");
    inspectorPPU.element.id = "texture-ppu";

    const buttons = UI.ContainerStart();
    buttons.id = "buttons";

    UI.Button("Edit Mapping");
    inspectorApply = UI.Button("Apply");

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

async function FocusTexture (path)
{
    if (currentTexture === path) return;
    
    textureListItems.find(item => item.innerText === currentTexture)?.setAttribute("focused", 0);
    
    currentTexture = path;
    textureListItems.find(item => item.innerText === path)?.setAttribute("focused", 1);

    const texture = textures.find(item => item.path === path);

    inspectorPath.SetText(path);

    const src = `${projectDir}\\img\\${texture.args.src.replaceAll("/", "\\")}`;

    const rawImage = new Image();
    rawImage.src = src;

    await new Promise(resolve => rawImage.onload = resolve);

    inspectorData.innerText = `${src}\n\nWidth: ${rawImage.width}\nHeight: ${rawImage.height}`;
    inspectorPPU.SetValue(texture.args.pixelPerUnit ?? 16);
    inspectorApply.SetActive(false);

    while (inspectorPreview.element.firstChild != null) inspectorPreview.element.firstChild.remove();
    rawImage.draggable = false;
    inspectorPreview.element.append(rawImage);

    inspectorInfo.style.display = "none";
    inspectorContent.style.display = "";
}

async function Unfocus ()
{
    if (currentTexture == null) return;

    // const prompt = await ipcRenderer.invoke("UnsavedPrompt", "Texture has unsaved changes", `texture "${currentTexture}"`, window.windowID);
    
    // if (prompt === 0) return;
    // else if (prompt === 1) await SceneManager.Save();

    textureListItems.find(item => item.innerText === currentTexture)?.setAttribute("focused", 0);
    currentTexture = null;

    inspectorContent.style.display = "none";
    inspectorInfo.style.display = "";
}

async function Import ()
{
    const file = await ipcRenderer.invoke("SelectFile", `${projectDir}\\img`, {
        title: "Import Texture",
        buttonLabel: "Import",
        windowID: window.windowID,
        filters: [{ name: "Images", extensions: ["png", "jpeg", "jpg"] }]
    });
}