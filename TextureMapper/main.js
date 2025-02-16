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

    focusedSprite.name = value;

    MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.spriteName = ${JSON.stringify(value)}`);
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
inspectorSize.fieldX.onUpdate = value => {
    value = Clamp(
        value,
        1,
        textureSize.x - focusedSprite.rect.x
    );

    inspectorSize.x = value;

    if (focusedSprite.rect.width === value) return;

    focusedSprite.rect.width = value;
    
    MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetSize(new Vector2(${value}, ${focusedSprite.rect.height}))`);
};
inspectorSize.fieldY.onUpdate = value => {
    value = Clamp(
        value,
        1,
        textureSize.y - focusedSprite.rect.y
    );

    inspectorSize.y = value;

    if (focusedSprite.rect.height === value) return;

    focusedSprite.rect.height = value;
    
    MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetSize(new Vector2(${focusedSprite.rect.width}, ${value}))`);
};

const inspectorPivot = UI.Vector2Field("Pivot");

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

async function Save ()
{
    await new Promise(resolve => requestAnimationFrame(resolve));

    const sprites = texture.args.sprites;

    for (let i = 0; i < sprites.length; i++)
    {
        if (sprites[i].rect.x === 0) sprites[i].rect.x = undefined;
        if (sprites[i].rect.y === 0) sprites[i].rect.y = undefined;
    }

    if (texture.args.sprites.length === 0) texture.args.sprites = undefined;

    await FS.writeFile(`${projectDir}\\data\\resources.json`, JSON.stringify(resources, null, 4));

    for (let i = 0; i < sprites.length; i++)
    {
        if (sprites[i].rect.x === undefined) sprites[i].rect.x = 0;
        if (sprites[i].rect.y === undefined) sprites[i].rect.y = 0;
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

    texture.path = newTexture.path;
    texture.args.pixelPerUnit = newTexture.args.pixelPerUnit;

    resources.splice(
        resources.indexOf(newTexture),
        1,
        texture
    );
});