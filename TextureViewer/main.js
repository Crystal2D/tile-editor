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
let dockSize = 300;
let sizerOffset = 0;
let textures = [];
let textureListItems = [];

let textureList = null;
let dock = null;
let inspectorContent = null;
let inspectorPath = null;
let inspectorData = null;
let inspectorPPU = null;
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

        textureListItems.push(item);
    }

    textureList.append(...textureListItems);


    const dock = UI.ContainerStart();
    dock.id = "dock";

    const dockContent = UI.ContainerStart();
    dockContent.classList.add("content");

    UI.AddContent(textureList);

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
    inspectorContent = UI.ContainerStart();
    inspectorContent.style.display = "none";

    inspectorPath = UI.TextField("Registered Path");
    inspectorPath.element.id = "texture-path";

    inspectorData = UI.Label("");
    inspectorData.id = "texture-data";

    inspectorPPU = UI.NumberField("Pixel Per Unit");
    inspectorPPU.element.id = "texture-ppu";

    // UI.

    inspectorPreview = UI.SectionStart("Preview");
    inspectorPreview.element.id = "texture-preview";
    UI.SectionEnd();

    UI.ContainerEnd();
    UI.ContainerEnd();


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
    const lastTexture = currentTexture;
    currentTexture = path;

    textureListItems.find(item => item.innerText === lastTexture)?.setAttribute("focused", 0);
    textureListItems.find(item => item.innerText === path)?.setAttribute("focused", 1);

    const texture = textures.find(item => item.path === path);

    inspectorPath.SetText(path);

    const src = `${projectDir}\\img\\${texture.args.src.replaceAll("/", "\\")}`;

    const rawImage = new Image();
    rawImage.src = src;

    await new Promise(resolve => rawImage.onload = resolve);

    inspectorData.innerText = `${src}\n\nWidth: ${rawImage.width}\nHeight: ${rawImage.height}`;

    inspectorPPU.SetValue(texture.args.pixelPerUnit ?? 16);

    while (inspectorPreview.element.firstChild != null) inspectorPreview.element.firstChild.remove();
    inspectorPreview.element.append(rawImage);

    inspectorContent.style.display = "";
}