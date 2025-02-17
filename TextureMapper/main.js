const ActionManager = require("./../js/ActionManager");


const URLSearch = new URLSearchParams(window.location.search);
const projectDir = decodeURIComponent(URLSearch.get("dir"));
const texturePath = decodeURIComponent(URLSearch.get("path"));

Refractor.SetDirectory("../");

MenuManager.AddToBar(
    "Texture",
    focused => {
        if (!focused)
        {
            MenuManager.FocusBar();

            return;
        }
        
        MenuManager.UnfocusBar();
        MenuManager.CloseContextMenus();
    },
    () => {
        MenuManager.CloseContextMenus();

        new ContextMenu(
            [
                new MenuShortcutItem("Save", "Ctrl+S", () => {
                    MenuManager.UnfocusBar();
                    MenuManager.CloseContextMenus();
                
                    Save();
                })
            ],
            {
                width : 120
            }
        );
    }
);
MenuManager.AddToBar(
    "Edit",
    focused => {
        if (!focused)
        {
            MenuManager.FocusBar();

            return;
        }
        
        MenuManager.UnfocusBar();
        MenuManager.CloseContextMenus();
    },
    () => {
        MenuManager.CloseContextMenus();

        const undo = new MenuShortcutItem("Undo", "Ctrl+Z", () => {
            MenuManager.UnfocusBar();
            MenuManager.CloseContextMenus();

            ActionManager.Undo();
        });
        undo.enabled = ActionManager.IsUndoable();

        const redo = new MenuShortcutItem("Redo", "Ctrl+Shift+Z", () => {
            MenuManager.UnfocusBar();
            MenuManager.CloseContextMenus();

            ActionManager.Redo();
        });
        redo.enabled = ActionManager.IsRedoable();

        new ContextMenu(    
            [
                undo,
                redo   
            ],
            {
                posX : 51,
                width : 150
            }
        );
    }
);

const mapperViewWrap = document.createElement("div");
mapperViewWrap.id = "view-wrap";

UI.AddContent(mapperViewWrap);

let resources = null;
let texture = null;
let textureSize = null;

(async () => {
    const resRequest = await fetch(`${projectDir}\\data\\resources.json`);
    resources = await resRequest.json();

    texture = resources.find(item => item.path === texturePath);

    const rawImage = new Image();
    rawImage.src = `${projectDir}\\img\\${texture.args.src}`;

    await new Promise(resolve => rawImage.onload = resolve);

    textureSize = {
        x: rawImage.width,
        y: rawImage.height
    };

    if (texture.args.sprites == null) texture.args.sprites = [];
})();

const MapperView = new Refractor.Embed(mapperViewWrap, projectDir);
MapperView.content.addEventListener("load", () => MapperView.Refract("window.targetScene = 2"));
MapperView.onLoad.Add(async () => {
    await new Promise(resolve => Loop.Append(() => { if (textureSize != null) resolve(); }, null, () => textureSize != null));

    MapperView.Refract(`(async () => {
        await SceneInjector.Resources(${JSON.stringify(texturePath)});
        await SceneInjector.GameObject(${JSON.stringify({
            name: "texture",
            id: 0,
            components: [
                {
                    type: "SpriteRenderer",
                    args: {
                        sprite: {
                            texture: texturePath
                        }
                    }
                }
            ]
        })});

        requestAnimationFrame(() => GameObject.FindComponents("MapperInput")[0].SetRenderer());
    })()`);

    await new Promise(resolve => requestAnimationFrame(resolve));
});

window.addEventListener("resize", () => MapperView.RecalcSize());

const dock = UI.ContainerStart();
dock.id = "dock";

let focusedSprite = null;

const inspectorName = UI.TextField("Name");
(() => {
    inspectorName.element.id = "name";

    const input = inspectorName.element.querySelector(".input")
    inspectorName.onBlur = () => {
        const text = input.innerText.trim();

        if (text.length > 0) return;

        input.innerText = focusedSprite.name;
    };
})();
inspectorName.onUpdate = value => {
    if (focusedSprite.name === value) return;

    let nameIndex = value.match(/ \(\d+\)$/);

    if (nameIndex != null)
    {
        value = value.slice(0, -nameIndex[0].length);
        nameIndex = parseInt(nameIndex[0].slice(2, -1));
    }
    else nameIndex = 0;

    const nameRegex = new RegExp(`(${value}) \\(\\d+\\)$`);

    const nameMatches = texture.args.sprites.filter(item => item.name.match(nameRegex) != null || item.name === value).map(item => parseInt((item.name.match(/ \(\d+\)$/) ?? [" (0)"])[0].slice(2, -1)));
    nameMatches.sort((a, b) => a - b);

    for (let i = 0; i < nameMatches.length; i++)
    {
        if (nameMatches[i] < nameIndex) continue;

        if (nameMatches[i] - nameIndex === 0)
        {
            nameIndex++;

            continue;
        }

        nameIndex = nameMatches[i - 1] + 1;

        break;
    }

    if (nameIndex === 0)
    {
        focusedSprite.name = value;

        MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.spriteName = ${JSON.stringify(value)}`);

        return;
    }
    
    focusedSprite.name = `${value} (${nameIndex})`;
    inspectorName.SetText(focusedSprite.name);

    MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.spriteName = ${JSON.stringify(focusedSprite.name)}`);
};

UI.SectionStart("Sprite");

function Clamp (value, min, max)
{
    return Math.min(Math.max(value, min), max);
}

const inspectorPosition = UI.Vector2Field("Postion");
inspectorPosition.fieldX.onUpdate = value => {
    value = Clamp(
        value,
        0,
        textureSize.x - focusedSprite.rect.width
    );

    inspectorPosition.x = value;

    if (focusedSprite.rect.x === value) return;

    focusedSprite.rect.x = value;
    
    MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetPosition(new Vector2(${value}, ${focusedSprite.rect.y}))`);
};
inspectorPosition.fieldY.onUpdate = value => {
    value = Clamp(
        value,
        0,
        textureSize.y - focusedSprite.rect.height
    );

    inspectorPosition.y = value;

    if (focusedSprite.rect.y === value) return;

    focusedSprite.rect.y = value;
    
    MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetPosition(new Vector2(${focusedSprite.rect.x}, ${value}))`);
};

const inspectorSize = UI.Vector2Field("Size");
inspectorSize.fieldX.min = 1;
inspectorSize.fieldY.min = 1;
inspectorSize.fieldX.onUpdate = value => {
    value = Math.min(value, textureSize.x - focusedSprite.rect.x);

    inspectorSize.x = value;

    if (focusedSprite.rect.width === value) return;

    focusedSprite.rect.width = value;
    
    MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetSize(new Vector2(${value}, ${focusedSprite.rect.height}))`);
};
inspectorSize.fieldY.onUpdate = value => {
    value = Math.min(value, textureSize.y - focusedSprite.rect.y);

    inspectorSize.y = value;

    if (focusedSprite.rect.height === value) return;

    focusedSprite.rect.height = value;
    
    MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetSize(new Vector2(${focusedSprite.rect.width}, ${value}))`);
};

const inspectorPivot = UI.Vector2Field("Pivot", 0.5, 0.5);
inspectorPivot.fieldX.min = 0;
inspectorPivot.fieldY.min = 0;
inspectorPivot.fieldX.onUpdate = value => {
    value = Math.min(value, 1);

    inspectorPivot.x = value;

    if (focusedSprite.pivot.x === value) return;

    focusedSprite.pivot.x = value;
    
    // MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetSize(new Vector2(${value}, ${focusedSprite.rect.height}))`);
};
inspectorPivot.fieldY.onUpdate = value => {
    value = Math.min(value, 1);

    inspectorPivot.y = value;

    if (focusedSprite.pivot.y === value) return;

    focusedSprite.pivot.y = value;
    
    // MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetSize(new Vector2(${focusedSprite.rect.width}, ${value}))`);
};

UI.SectionEnd();

UI.ContainerEnd();

function FocusSprite (name)
{
    focusedSprite = texture.args.sprites.find(item => item.name === name);
    lastName = name;

    dock.style.display = focusedSprite == null ? "" : "block";

    if (focusedSprite == null) return;
    
    inspectorName.SetText(name);

    if (focusedSprite.rect.x == null) focusedSprite.rect.x = 0;
    if (focusedSprite.rect.y == null) focusedSprite.rect.y = 0;
    
    inspectorPosition.x = focusedSprite.rect.x;
    inspectorPosition.y = focusedSprite.rect.y;

    inspectorSize.x = focusedSprite.rect.width;
    inspectorSize.y = focusedSprite.rect.height;

    if (focusedSprite.pivot == null) focusedSprite.pivot = { };
    if (focusedSprite.pivot.x == null) focusedSprite.pivot.x = 0.5;
    if (focusedSprite.pivot.y == null) focusedSprite.pivot.y = 0.5;

    inspectorPivot.x = focusedSprite.pivot.x;
    inspectorPivot.y = focusedSprite.pivot.y;
}

function SetPosition (x, y)
{
    focusedSprite.rect.x = x;
    focusedSprite.rect.y = y;

    inspectorPosition.x = focusedSprite.rect.x;
    inspectorPosition.y = focusedSprite.rect.y;
}

function SetSize (x, y)
{
    focusedSprite.rect.width = x;
    focusedSprite.rect.height = y;

    inspectorSize.x = focusedSprite.rect.width;
    inspectorSize.y = focusedSprite.rect.height;
}

function SetPivot (x, y)
{
    focusedSprite.pivot.x = x;
    focusedSprite.pivot.y = y;

    inspectorPivot.x = focusedSprite.pivot.x;
    inspectorPivot.y = focusedSprite.pivot.y;
}

async function Save ()
{
    await new Promise(resolve => requestAnimationFrame(resolve));

    const sprites = texture.args.sprites;

    for (let i = 0; i < sprites.length; i++)
    {
        if (sprites[i].rect.x === 0) sprites[i].rect.x = undefined;
        if (sprites[i].rect.y === 0) sprites[i].rect.y = undefined;

        if (sprites[i].pivot.x === 0.5) sprites[i].pivot.x = undefined;
        if (sprites[i].pivot.y === 0.5) sprites[i].pivot.y = undefined;
        if (sprites[i].pivot.x == null && sprites[i].pivot.y == null) sprites[i].pivot = undefined;
    }

    if (texture.args.sprites.length === 0) texture.args.sprites = undefined;

    await FS.writeFile(`${projectDir}\\data\\resources.json`, JSON.stringify(resources, null, 4));

    for (let i = 0; i < sprites.length; i++)
    {
        if (sprites[i].rect.x == null) sprites[i].rect.x = 0;
        if (sprites[i].rect.y == null) sprites[i].rect.y = 0;

        if (sprites[i].pivot == null) sprites[i].pivot = { };
        if (sprites[i].pivot.x == null) sprites[i].pivot.x = 0.5;
        if (sprites[i].pivot.y == null) sprites[i].pivot.y = 0.5;
    }

    if (texture.args.sprites == null) texture.args.sprites = [];

    ipcRenderer.invoke("eval", `
        const win = FindMini(${window.parentID}, "texture-viewer");

        if (win != null) win.webContents.send("UpdateTexture", ${JSON.stringify(texture.path)});
    `);

    EvalToMain(`TextureManager.ReloadTextureSprites(${JSON.stringify(texture.path)})`);
}


ipcRenderer.on("OnTextureUpdate", async (event, path) => {
    window.miniID = `texture-mapper:${path}`;

    const resRequest = await fetch(`${projectDir}\\data\\resources.json`);
    resources = await resRequest.json();

    const newTexture = resources.find(item => item.path === path);
    const oldPath = texture.path;

    texture.path = newTexture.path;
    texture.args.pixelPerUnit = newTexture.args.pixelPerUnit;
    
    resources.splice(
        resources.indexOf(newTexture),
        1,
        texture
    );

    MapperView.Refract(`Resources.Find(${JSON.stringify(oldPath)}).name = ${JSON.stringify(texture.path.split("/").slice(-1)[0])}`);
});