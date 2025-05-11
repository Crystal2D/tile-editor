const ActionManager = require("./../js/ActionManager");


const URLSearch = new URLSearchParams(window.location.search);
const projectDir = decodeURIComponent(URLSearch.get("dir"));
const texturePath = decodeURIComponent(URLSearch.get("path"));
const resourcesPath = decodeURIComponent(URLSearch.get("res"));

Refractor.SetDirectory("../");

let edited = false;
let openToPalette = false;

MenuManager.AddToBar(
    "Save",
    async () => {
        MenuManager.UnfocusBar();
        MenuManager.CloseContextMenus();

        Save();
    },
    () => MenuManager.CloseContextMenus()
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
                posX : 41,
                width : 150
            }
        );
    }
);
MenuManager.AddToBar(
    "Create Tile Palette",
    async () => {
        MenuManager.UnfocusBar();
        MenuManager.CloseContextMenus();

        ToPalette();
    },
    () => MenuManager.CloseContextMenus()
);

const mapperViewWrap = document.createElement("div");
mapperViewWrap.id = "view-wrap";

UI.AddContent(mapperViewWrap);

let resources = null;
let texture = null;
let textureSize = null;

(async () => {
    document.title = `${texturePath} - Texture Mapper`;
    
    const resRequest = await fetch(resourcesPath);
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

const MapperView = new Refractor.Embed(mapperViewWrap, projectDir, resourcesPath);
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
                        },
                        color: {
                            r: 255,
                            g: 255,
                            b: 255,
                            a: 0,
                        }
                    }
                }
            ]
        })});

        requestAnimationFrame(() => GameObject.FindComponents("MapperInput")[0].SetRenderer());
    })()`);

    await new Promise(resolve => requestAnimationFrame(resolve));

    const onUndo = async () => {
        ActionManager.CancelUndo();

        MapperView.Refract("GameObject.FindComponents(\"MapperInput\")[0].StopRecording()");

        ActionManager.OnBeforeUndo().Remove(onUndo);

        await new Promise(resolve => requestAnimationFrame(resolve));

        ActionManager.Undo();
        ActionManager.OnBeforeUndo().Add(onUndo);
    };

    ActionManager.OnBeforeUndo().Add(onUndo);

    Loop.Append(() => {
        if ((Input.GetKeyDown(KeyCode.Backspace) || Input.GetKeyDown(KeyCode.Delete)) && !Input.GetKey(KeyCode.Ctrl) && !Input.GetKey(KeyCode.Shift)) DeleteFocused();

        if (Input.OnCtrl(KeyCode.Z)) ActionManager.Undo();
        if (Input.OnCtrlShift(KeyCode.Z)) ActionManager.Redo();

        if (Input.OnCtrl(KeyCode.S) && edited) Save();
    });
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
    const lastName = focusedSprite.name;

    if (lastName === value) return;

    let nameIndex = value.match(/ \(\d+\)$/);

    if (nameIndex != null)
    {
        value = value.slice(0, -nameIndex[0].length);
        nameIndex = parseInt(nameIndex[0].slice(2, -1));
    }
    else nameIndex = 0;
    
    const nameRegex = new RegExp(`(${value}) \\(\\d+\\)$`);
    
    const nameMatches = texture.args.sprites.filter(item => item !== focusedSprite && (item.name.match(nameRegex) != null || item.name === value)).map(item => parseInt((item.name.match(/ \(\d+\)$/) ?? [" (0)"])[0].slice(2, -1)));
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
    
    if (nameIndex > 0)
    {
        value = `${value} (${nameIndex})`;
        inspectorName.SetText(value);
    }

    ActionManager.StartRecording("Rename");
    ActionManager.Record(
        "Rename",
        () => {
            MarkAsEdited();

            focusedSprite.name = value;
            MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.spriteName = ${JSON.stringify(focusedSprite.name)}`);
        },
        () => {
            MarkAsEdited();
            
            focusedSprite.name = lastName;
            MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.spriteName = ${JSON.stringify(focusedSprite.name)}`);
        }
    );
    ActionManager.StopRecording("Rename", () => inspectorName.SetText(focusedSprite.name));
};

UI.SectionStart("Sprite");

function Clamp (value, min, max)
{
    return Math.min(Math.max(value, min), max);
}

const inspectorPosition = UI.Vector2Field("Postion");
inspectorPosition.fieldX.onUpdate = value => {
    value = Clamp(
        Math.round(value),
        0,
        textureSize.x - focusedSprite.rect.width
    );

    inspectorPosition.x = value;

    const lastPos = focusedSprite.rect.x;

    if (lastPos === value) return;

    ActionManager.StartRecording("SetPosition.X");
    ActionManager.Record(
        "SetPosition.X",
        () => {
            MarkAsEdited();

            focusedSprite.rect.x = value;
            MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetPosition(new Vector2(${value}, ${focusedSprite.rect.y}))`);
        },
        () => {
            MarkAsEdited();
            
            focusedSprite.rect.x = lastPos;
            MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetPosition(new Vector2(${lastPos}, ${focusedSprite.rect.y}))`);
        }
    );
    ActionManager.StopRecording("SetPosition.X", () => inspectorPosition.x = focusedSprite.rect.x);
};
inspectorPosition.fieldY.onUpdate = value => {
    value = Clamp(
        Math.round(value),
        0,
        textureSize.y - focusedSprite.rect.height
    );

    inspectorPosition.y = value;

    const lastPos = focusedSprite.rect.y;

    if (lastPos === value) return;

    ActionManager.StartRecording("SetPosition.Y");
    ActionManager.Record(
        "SetPosition.Y",
        () => {
            MarkAsEdited();

            focusedSprite.rect.y = value;
            MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetPosition(new Vector2(${focusedSprite.rect.x}, ${value}))`);
        },
        () => {
            MarkAsEdited();
            
            focusedSprite.rect.y = lastPos;
            MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetPosition(new Vector2(${focusedSprite.rect.x}, ${lastPos}))`);
        }
    );
    ActionManager.StopRecording("SetPosition.Y", () => inspectorPosition.y = focusedSprite.rect.y);
};

const inspectorSize = UI.Vector2Field("Size");
inspectorSize.fieldX.min = 1;
inspectorSize.fieldY.min = 1;
inspectorSize.fieldX.onUpdate = value => {
    value = Math.min(Math.round(value), textureSize.x - focusedSprite.rect.x);

    inspectorSize.x = value;

    const lastSize = focusedSprite.rect.width;

    if (lastSize === value) return;

    ActionManager.StartRecording("SetSize.X");
    ActionManager.Record(
        "SetSize.X",
        () => {
            MarkAsEdited();

            focusedSprite.rect.width = value;
            MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetSize(new Vector2(${value}, ${focusedSprite.rect.height}))`);
        },
        () => {
            MarkAsEdited();
            
            focusedSprite.rect.width = lastSize;
            MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetSize(new Vector2(${lastSize}, ${focusedSprite.rect.height}))`);
        }
    );
    ActionManager.StopRecording("SetSize.X", () => inspectorSize.x = focusedSprite.rect.width);
};
inspectorSize.fieldY.onUpdate = value => {
    value = Math.min(Math.round(value), textureSize.y - focusedSprite.rect.y);

    inspectorSize.y = value;

    const lastSize = focusedSprite.rect.height;

    if (lastSize === value) return;

    ActionManager.StartRecording("SetSize.Y");
    ActionManager.Record(
        "SetSize.Y",
        () => {
            MarkAsEdited();

            focusedSprite.rect.height = value;
            MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetSize(new Vector2(${focusedSprite.rect.width}, ${value}))`);
        },
        () => {
            MarkAsEdited();
            
            focusedSprite.rect.height = lastSize;
            MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetSize(new Vector2(${focusedSprite.rect.width}, ${lastSize}))`);
        }
    );
    ActionManager.StopRecording("SetSize.Y", () => inspectorSize.y = focusedSprite.rect.height);
};

const inspectorPivot = UI.Vector2Field("Pivot", 0.5, 0.5);
inspectorPivot.fieldX.min = 0;
inspectorPivot.fieldY.min = 0;
inspectorPivot.fieldX.onUpdate = value => {
    value = Math.min(value, 1);

    inspectorPivot.x = value;

    const lastPivot = focusedSprite.pivot.x;

    if (lastPivot === value) return;

    ActionManager.StartRecording("SetSize.X");
    ActionManager.Record(
        "SetSize.X",
        () => {
            MarkAsEdited();

            focusedSprite.pivot.x = value;
            MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetPivot(new Vector2(${value}, ${focusedSprite.pivot.y}))`);
        },
        () => {
            MarkAsEdited();
            
            focusedSprite.pivot.x = lastPivot;
            MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetPivot(new Vector2(${lastPivot}, ${focusedSprite.pivot.y}))`);
        }
    );
    ActionManager.StopRecording("SetSize.X", () => inspectorPivot.x = focusedSprite.pivot.x);
};
inspectorPivot.fieldY.onUpdate = value => {
    value = Math.min(value, 1);

    inspectorPivot.y = value;

    const lastPivot = focusedSprite.pivot.y;

    if (lastPivot === value) return;

    ActionManager.StartRecording("SetSize.Y");
    ActionManager.Record(
        "SetSize.Y",
        () => {
            MarkAsEdited();

            focusedSprite.pivot.y = value;
            MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetPivot(new Vector2(${focusedSprite.pivot.x}, ${value}))`);
        },
        () => {
            MarkAsEdited();
            
            focusedSprite.pivot.y = lastPivot;
            MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].focused.SetPivot(new Vector2(${focusedSprite.pivot.x}, ${lastPivot}))`);
        }
    );
    ActionManager.StopRecording("SetSize.Y", () => inspectorPivot.y = focusedSprite.pivot.y);
};

UI.SectionEnd();

UI.ContainerEnd();

const paletteDock = UI.ContainerStart();
paletteDock.id = "palette-dock";

let paletteName = "";

const paletteDockName = UI.TextField();
paletteDockName.element.querySelector(".placehold").textContent = "Palette Name...";
paletteDockName.onUpdate = value => {
    if (paletteName === value) return;

    paletteName = value;

    paletteCreate.SetActive(value.length > 0);
};

const paletteCreate = UI.Button("Create Palette");
paletteCreate.onClick = async () => {
    paletteDock.style.display = "";
    
    openToPalette = false;

    if (!(await UnsavedPrompt())) return;

    await new Promise(resolve => requestAnimationFrame(resolve));

    EvalToMain(`Palette.FromTexture(${JSON.stringify(texture.path)}, ${JSON.stringify(paletteName)})`);
};

const paletteCancel = UI.Button("Cancel");
paletteCancel.onClick = () => {
    paletteDock.style.display = "";

    openToPalette = false;
};

UI.ContainerEnd();

function FocusSpriteBase (name)
{
    focusedSprite = texture.args.sprites.find(item => item.name === name);

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

function FocusSprite (name)
{
    const lastName = focusedSprite?.name;

    ActionManager.StartRecording("Focus");
    ActionManager.Record(
        "Focus",
        () => FocusSpriteBase(name),
        () => FocusSpriteBase(lastName)
    );
    ActionManager.StopRecording("Focus", () => MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].Focus(${JSON.stringify(focusedSprite?.name)})`));
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

function DeleteBase (name)
{
    FocusSpriteBase(null);

    const sprite = texture.args.sprites.find(item => item.name === name);

    texture.args.sprites.splice(texture.args.sprites.indexOf(sprite), 1);

    MapperView.Refract(`GameObject.FindComponents("MapperInput")[0].Delete(${JSON.stringify(name)})`);
}

function DeleteFocused ()
{
    if (focusedSprite == null) return;

    const sprite = focusedSprite;

    ActionManager.StartRecording("Delete");
    ActionManager.Record(
        "Delete",
        () => {
            MarkAsEdited();

            DeleteBase(sprite.name);
        },
        () => {
            MarkAsEdited();

            texture.args.sprites.push(sprite);

            MapperView.Refract(`(async () => {
                const input = GameObject.FindComponents("MapperInput")[0];

                await input.CreateSprite(
                    ${JSON.stringify(sprite.name)},
                    new Vector2(${sprite.rect.x}, ${sprite.rect.y}),
                    new Vector2(${sprite.rect.width}, ${sprite.rect.height}),
                    new Vector2(${sprite.pivot.x}, ${sprite.pivot.y})
                );

                await new Promise(resolve => requestAnimationFrame(resolve));
                    
                input.Focus(${JSON.stringify(sprite.name)});

                window.parent.RefractBack(\`FocusSpriteBase(${JSON.stringify(sprite.name)});\`);
            })();`);
        }
    );
    ActionManager.StopRecording("Delete");
}

function MarkAsEdited ()
{
    if (edited) return;
    
    edited = true;

    document.title = `${texture.path} - Texture Mapper*`;
}

const OnSave = new DelegateEvent();

async function Save ()
{
    edited = false;
    document.title = `${texture.path} - Texture Mapper`;

    await new Promise(resolve => requestAnimationFrame(resolve));

    const sprites = texture.args.sprites;

    for (let i = 0; i < sprites.length; i++)
    {
        if (sprites[i].rect.x === 0) sprites[i].rect.x = undefined;
        if (sprites[i].rect.y === 0) sprites[i].rect.y = undefined;

        if (sprites[i].pivot != null)
        {
            if (sprites[i].pivot.x === 0.5) sprites[i].pivot.x = undefined;
            if (sprites[i].pivot.y === 0.5) sprites[i].pivot.y = undefined;
            if (sprites[i].pivot.x == null && sprites[i].pivot.y == null) sprites[i].pivot = undefined;
        }
    }

    if (texture.args.sprites.length === 0) texture.args.sprites = undefined;

    await FS.writeFile(resourcesPath, JSON.stringify(resources, null, 4));

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

    let saveResolve = null;
    const onSave = () => {
        OnSave.Remove(onSave);

        saveResolve();
    };

    OnSave.Add(onSave);

    await new Promise(resolve => saveResolve = resolve);

    Input.RestateKeys();
}

async function UnsavedPrompt ()
{
    if (!edited) return true;

    const prompt = await ipcRenderer.invoke("UnsavedPrompt", "Texture has unsaved changes", texture.path, window.windowID);

    if (prompt === 0) return false;
    else if (prompt === 1) await Save();

    return true;
}

async function ToPalette ()
{
    if (openToPalette) return;

    openToPalette = true;

    paletteName = "";
    paletteDockName.SetText("");

    paletteCreate.SetActive(false);
    
    paletteDock.style.display = "block";
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

ipcRenderer.on("OnTextureUpdate", async (event, path) => {
    document.title = `${path} - Texture Mapper`;

    window.miniID = `texture-mapper:${path}`;

    const resRequest = await fetch(resourcesPath);
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
ipcRenderer.on("OnSave", () => OnSave.Invoke());