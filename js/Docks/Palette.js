const transformOnUndo = () => {
    ActionManager.CancelUndo();

    SceneView.Refract("const mainInput = GameObject.FindComponents(\"MainInput\")[0]; mainInput.Deselect(); mainInput.StopRecording()");

    requestAnimationFrame(() => {
        ActionManager.Undo();
        ActionManager.Undo();
    });
};

let focused = false;
let saving = false;
let listSearch = "";
let palettes = [];
let paletteMaps = [];
let actions = [];
let paletteListItems = [];
let listSearched = [];
let resources = [];

let paletteViewBase = null;
let paletteViewWrap = null;
let paletteView = null;
let currentMap = null;
let tools = null;
let currentAction = null;
let lastAction = null;
let paletteList = null;
let currentPalette = null;

function PaletteView ()
{
    return paletteView;
}

function CacheResources ()
{
    const res = palettes.map(item => item.textures).flat().map(item => item.src);
    const reducedRes = [];

    for (let i = 0; i < res.length; i++) if (!reducedRes.includes(res[i])) reducedRes.push(res[i]);

    resources = reducedRes;
}

function GetResources ()
{
    return [...resources];
}

async function Init ()
{
    palettes = ProjectManager.GetPalettes();
    paletteMaps = ProjectManager.GetEditorData().palettes;

    let removingMaps = [];

    for (let i = 0; i < paletteMaps.length; i++) if (palettes.find(item => item.name === paletteMaps[i].name) == null) removingMaps.push(paletteMaps[i]);

    for (let i = 0; i < removingMaps.length; i++) paletteMaps.splice(paletteMaps.indexOf(removingMaps[i]), 1);

    if (removingMaps.length > 0) await ProjectManager.SaveEditorData();

    paletteViewBase = document.createElement("div");
    paletteViewBase.classList.add("palette-view-base");

    paletteViewWrap = document.createElement("div");
    paletteViewWrap.classList.add("palette-view");

    paletteView = new Refractor.Embed(paletteViewWrap);
    paletteView.content.addEventListener("load", () => paletteView.Refract("window.targetScene = 1; document.body.style.background = \"rgb(32, 32, 32)\""));
    paletteView.onLoad.Add(() => OnRefractorLoad());

    document.body.append(paletteViewWrap);

    tools = document.createElement("div");
    tools.classList.add("palette-tools");
    tools.setAttribute("enabled", 0);

    const pencilTool = document.createElement("img");
    pencilTool.src = "img/pencil.svg";

    const eraserTool = document.createElement("img");
    eraserTool.src = "img/eraser.svg";

    const eyedropperTool = document.createElement("img");
    eyedropperTool.src = "img/eyedropper.svg";

    const selectTool = document.createElement("img");
    selectTool.src = "img/cursor.svg";

    const moveTool = document.createElement("img");
    moveTool.src = "img/move.svg";

    actions = [pencilTool, eraserTool, eyedropperTool, selectTool, moveTool];

    for (let i = 0; i < actions.length; i++)
    {
        actions[i].addEventListener("dragstart", event => event.preventDefault());
        actions[i].addEventListener("click", () => UseAction(i));
    }

    tools.append(...actions);

    paletteList = document.createElement("div");
    paletteList.classList.add("palette-list");

    for (let i = 0; i < palettes.length; i++)
    {
        const item = document.createElement("div");
        item.classList.add("item");
        item.setAttribute("focused", 0);
        item.append(palettes[i].name);

        item.addEventListener("click", () => LoadMap(palettes[i].name));

        paletteListItems.push(item);
    }

    paletteList.append(...paletteListItems);

    CacheResources();

    Dock.OnResize().Add(() => {
        if (!focused) return;

        paletteView.content.style.pointerEvents = "none";

        paletteViewWrap.style.top = `${paletteViewBase.getBoundingClientRect().y}px`;
        paletteViewWrap.style.left = `${paletteViewBase.getBoundingClientRect().x + 10}px`;
        paletteViewWrap.style.width = `${paletteViewBase.getBoundingClientRect().width - 20}px`;
        paletteViewWrap.style.height = `${paletteViewBase.getBoundingClientRect().height - 10}px`;

        paletteView.RecalcSize();
    });
    Dock.OnResizeEnd().Add(() => { if (focused) paletteView.content.style.pointerEvents = ""; });
    window.addEventListener("resize", () => {
        if (!focused) return;

        paletteViewWrap.style.top = `${paletteViewBase.getBoundingClientRect().y}px`;
        paletteViewWrap.style.left = `${paletteViewBase.getBoundingClientRect().x + 10}px`;
        paletteViewWrap.style.width = `${paletteViewBase.getBoundingClientRect().width - 20}px`;
        paletteViewWrap.style.height = `${paletteViewBase.getBoundingClientRect().height - 10}px`;

        paletteView.RecalcSize();
    });

    Loop.Append(() => {
        if (currentAction == null && SceneView.isLoaded) UseActionBase(0);

        const hasSelection = Layers.Selection() != null;

        tools.setAttribute("enabled", +hasSelection);

        if (!hasSelection || LoadingScreen.IsEnabled()) return;

        if (Input.GetKeyDown(KeyCode.B) && !Input.GetKey(KeyCode.Ctrl) && !Input.GetKey(KeyCode.Shift)) UseAction(0);
        if (Input.GetKeyDown(KeyCode.E) && !Input.GetKey(KeyCode.Ctrl) && !Input.GetKey(KeyCode.Shift)) UseAction(+(currentAction !== 1));
        if (Input.GetKeyDown(KeyCode.P) && !Input.GetKey(KeyCode.Ctrl) && !Input.GetKey(KeyCode.Shift)) UseAction(2);
        if (Input.OnCtrl(KeyCode.R)) UseAction(3);
        if (Input.GetKeyDown(KeyCode.T) && !Input.GetKey(KeyCode.Ctrl) && !Input.GetKey(KeyCode.Shift)) UseAction(4);

        if (Input.OnCtrl(KeyCode.A) && Layers.Selection().hasTiles)
        {
            UseAction(3);

            SceneView.Refract("GameObject.FindComponents(\"MainInput\")[0].SelectAll()");
        }
    });
}

function DrawUI ()
{
    selection = Layers.Selection();

    focused = true;

    const wrapper = Dock.ContainerStart();
    wrapper.classList.add("palette-wrap");

    Dock.ContainerStart().classList.add("palette-viewer");

    const layerName = Dock.Label(selection == null ? "No Layer Selected" : `Selected Layer: ${selection.name}`);
    layerName.style.fontWeight = "bold";
    layerName.style.fontSize = "14px";
    layerName.style.paddingBottom = "8px";
    layerName.style.color = "rgb(210, 210, 210)";
    layerName.style.whiteSpace = "nowrap";
    layerName.style.overflow = "clip";
    layerName.style.textOverflow = "ellipsis";
    layerName.style.margin = "6px 12px";
    layerName.style.marginBottom = "0";
    layerName.style.flexShrink = "0";

    Dock.AddContent(paletteViewBase);
    Dock.AddContent(tools);

    Dock.ContainerEnd();

    Dock.ContainerStart().classList.add("palette-explorer");

    const search = Dock.SearchBar();
    search.container.classList.add("palette-search");
    search.SetText(listSearch);

    let searchInfo = null;

    if (palettes.length > 0)
    {
        Dock.AddContent(paletteList);

        searchInfo = Dock.Info("Sorry :v", "");

        if (listSearch.length === 0 || listSearched.length > 0) searchInfo.style.display = "none";
        else searchInfo.querySelector(".description").textContent = `We can't find palettes with "${listSearch}"`;
    }
    else Dock.Info("Oh...", "You currently have no tile palettes");

    Dock.ContainerEnd();

    search.onUpdate = text => {
        if (listSearch === text || palettes.length === 0) return;

        listSearched = text.length === 0 ? [] : paletteListItems.filter(item => item.innerText.toLowerCase().includes(text));

        while (paletteList.firstChild != null) paletteList.firstChild.remove();

        paletteList.append(...(text.length > 0 ? listSearched : paletteListItems));

        if (text.length > 0 && listSearched.length === 0)
        {
            paletteList.style.display = "none";

            searchInfo.querySelector(".description").textContent = `We can't find palettes with "${text}"`;
            searchInfo.style.display = "";
        }
        else
        {
            paletteList.style.display = "";
            searchInfo.style.display = "none";
        }

        listSearch = text;
    };


    Dock.ContainerEnd();

    paletteViewWrap.style.display = "block";
    paletteViewWrap.style.top = `${paletteViewBase.getBoundingClientRect().y}px`;
    paletteViewWrap.style.left = `${paletteViewBase.getBoundingClientRect().x + 10}px`;
    paletteViewWrap.style.width = `${paletteViewBase.getBoundingClientRect().width - 20}px`;
    paletteViewWrap.style.height = `${paletteViewBase.getBoundingClientRect().height - 10}px`;

    paletteView.RecalcSize();
}

function UseActionBase (index)
{
    if (currentAction === index || index == null) return;

    if (currentAction != null) actions[currentAction].setAttribute("focused", 0);

    actions[index].setAttribute("focused", 1);

    requestAnimationFrame(() => SceneView.Refract(`GameObject.FindComponents("MainInput")[0].UseAction(${index})`));

    currentAction = index;
}

function UseAction (index)
{
    if (currentAction === index) return;

    if (currentAction === 4) ActionManager.OnBeforeUndo().Remove(transformOnUndo);

    if (index === 2 || index === 4)
    {
        UseActionBase(index);

        if (index === 4) ActionManager.OnBeforeUndo().Add(transformOnUndo);

        return;
    }

    if (currentAction !== 2 && currentAction !== 4) lastAction = currentAction;

    const lAction = lastAction;

    ActionManager.StartRecording("Palette.ChangeAction");
    ActionManager.Record(
        "Palette.ChangeAction",
        () => UseActionBase(index),
        () => UseActionBase(lAction)
    );
    ActionManager.StopRecording("Palette.ChangeAction");
}

function OnClear ()
{
    focused = false;

    paletteViewWrap.style.display = "";
}

async function OnRefractorLoad ()
{
    paletteView.Refract(`
        SceneInjector.Grid(${JSON.stringify({
            name: "tilegrid",
            id: 0,
            components: [
                {
                    type: "Grid",
                    args: {
                        cellSize: {
                            x: 0,
                            y: 0
                        }
                    }
                }
            ]
        })});
    `);

    await new Promise(resolve => requestAnimationFrame(resolve));

    paletteView.Refract("SceneModifier.FocusGrid(0)");
}

async function LoadMap (name)
{
    const lastPalette = currentPalette;

    if (lastPalette === name) return;

    if (lastPalette == null)
    {
        await LoadMapBase(name);

        return;
    }

    let done = false;

    ActionManager.StartRecording("Palette.MapLoad");

    await LoadMapBase(name);

    ActionManager.Record(
        "Palette.MapLoad",
        () => { if (done) LoadMapBase(name); },
        () => LoadMapBase(lastPalette)
    );
    paletteView.Refract("GameObject.FindComponents(\"PaletteInput\")[0].Deselect(true);");
    ActionManager.StopRecording("Palette.MapLoad");

    done = true;
}

async function LoadMapBase (name)
{
    const lastPalette = currentPalette;
    currentPalette = name;

    paletteListItems.find(item => item.innerText === lastPalette)?.setAttribute("focused", 0);
    paletteListItems.find(item => item.innerText === name)?.setAttribute("focused", 1);

    let map = paletteMaps.find(item => item.name === name);
    const palette = palettes.find(item => item.name === name);

    if (map == null) map = await GenerateMap(name);
    else
    {   
        let save = false;

        const oldSprites = palette.textures.map(item => item.sprites).flat();
        let removingTiles = [];

        for (let i = 0; i < map.tiles.length; i++) if (oldSprites.find(item => item.id === map.tiles[i].spriteID) == null) removingTiles.push(map.tiles[i]);

        for (let i = 0; i < removingTiles.length; i++) map.tiles.splice(map.tiles.indexOf(removingTiles[i]), 1);

        if (removingTiles.length > 0)
        {
            const sizes = map.tiles.length > 0 ? map.tiles.map(item => item.size) : [{
                x: 0,
                y: 0
            }];

            map.cellSize = {
                x: Math.max(...sizes.map(item => item.x)),
                y: Math.max(...sizes.map(item => item.y))
            };

            save = true;
        }

        let removingTextures = [];

        for (let i = 0; i < map.textures.length; i++)
        {
            const texture = palette.textures.find(item => item.src === map.textures[i]);

            if (texture == null || texture.sprites.length === 0) removingTextures.push(map.textures[i]);
        }

        for (let i = 0; i < removingTextures.length; i++) map.textures.splice(map.textures.indexOf(removingTextures[i]), 1);

        let pos = {
            x: 0,
            y: map.tiles.length > 0 ? (Math.min(...map.tiles.map(item => item.position.y)) - 2) : 0
        };

        const newTextures = palette.textures.filter(item => !map.textures.includes(item.src) && item.sprites.length > 0);
        const oldTextures = palette.textures.filter(item => map.textures.includes(item.src));

        for (let i = 0; i < newTextures.length; i++)
        {
            map.textures.push(newTextures[i].src);
            await MapTexture(map, newTextures[i], pos);

            save = true;
        }

        for (let i = 0; i < oldTextures.length; i++)
        {
            const src = oldTextures[i].src;

            const maxSprX = Math.max(...map.tiles.map(item => item.position.x));
            const sprites = oldTextures[i].sprites;

            for (let j = 0; j < sprites.length; j++)
            {
                const tile = map.tiles.find(item => item.spriteID === sprites[j].id);

                if (tile != null) continue;

                await MapSprite(map, src, sprites[j], pos, maxSprX);

                save = true;
            }
        }

        if (save) await ProjectManager.SaveEditorData();
    }

    currentMap = map;

    paletteView.Refract(`SceneBank.FindByID(0).GetComponent("Grid").cellSize = new Vector2(${map.cellSize.x}, ${map.cellSize.y})`);

    if (lastPalette != null) paletteView.Refract("SceneModifier.UnfocusTilemap(); SceneInjector.Destroy(1)");

    paletteView.Refract(`(async () => {
        await SceneInjector.GameObject(${JSON.stringify({
            name: "tiles",
            id: 1,
            parent: 0,
            components: [
                {
                    type: "Tilemap",
                    args: {
                        tiles: map.tiles
                    }
                }
            ]
        })});
        
        SceneModifier.FocusTilemap(1);
        
        requestAnimationFrame(() => {
            const cam = GameObject.FindComponents("Camera")[0];
            const bounds = GameObject.FindComponents("Tilemap")[0].bounds;
            
            cam.transform.position = new Vector2(bounds.center.x, bounds.center.y);
            cam.orthographicSize = Math.max(bounds.size.x, bounds.size.y) * 1.25;
        });
    })()`);
}

async function GenerateMap (name)
{
    let map = {
        name: name,
        cellSize: {
            x: 0,
            y: 0
        },
        textures: [],
        tiles: []
    };
    let pos = {
        x: 0,
        y: 0
    };

    const palette = palettes.find(item => item.name === name);
    const textures = palette.textures.filter(item => item.sprites.length > 1);
    map.textures.push(...textures.map(item => item.src));

    for (let i = 0; i < textures.length; i++) await MapTexture(map, textures[i], pos);

    const maxSprX = Math.max(...map.tiles.map(item => item.position.x));
    const sprites = palette.textures.filter(item => item.sprites.length === 1);

    for (let i = 0; i < sprites.length; i++) await MapSprite(map, sprites[i].src, sprites[i].sprites[0], pos, maxSprX);

    paletteMaps.push(map);

    await ProjectManager.SaveEditorData();

    return map;
}

async function MapTexture (map, data, pos)
{
    await MapTextureByPos(map, data, pos);
}

async function MapTextureBySqrt (map, data, pos)
{
    if (!map.textures.includes(data.src)) map.textures.push(data.src);

    const texture = ProjectManager.FindResource(data.src);
    const ppu = texture.args.pixelPerUnit ?? 16;
    const sprites = texture.args.sprites;

    const maxX = Math.sqrt(data.sprites.length);

    for (let i = 0; i < data.sprites.length; i++)
    {
        const sprite = data.sprites[i];

        if (sprite.name === null || sprite.index === 0)
        {
            await MapSprite(map, data.src, sprite, pos, maxX);

            continue;
        }

        const spriteRef = sprite.name != null ? sprites.find(item => item.name === sprite.name) : sprites[sprite.index - 1];

        const width = spriteRef.rect.width / ppu;
        const height = spriteRef.rect.height / ppu;

        if (width > map.cellSize.x) map.cellSize.x = width;
        if (height > map.cellSize.y) map.cellSize.y = height;

        map.tiles.push({
            palette: map.name,
            spriteID: sprite.id,
            position: {
                x: pos.x,
                y: pos.y
            },
            size: {
                x: width,
                y: height
            }
        });

        pos.x++;

        if (pos.x < maxX || i === sprites.length - 1) continue;

        pos.x = 0;
        pos.y--;
    }

    pos.x = 0;
    pos.y -= 2;
}

async function MapTextureByPos (map, data, pos)
{
    if (!map.textures.includes(data.src)) map.textures.push(data.src);

    const texture = ProjectManager.FindResource(data.src);
    const ppu = texture.args.pixelPerUnit ?? 16;
    const sprites = [...texture.args.sprites.map((item, index) => {
        return {
            item: item,
            index: index + 1
        };
    })];

    sprites.sort((a, b) => (a.item.rect.x ?? 0) - (b.item.rect.x ?? 0));
    sprites.sort((a, b) => (a.item.rect.y ?? 0) - (b.item.rect.y ?? 0));

    const zeroIndex = data.sprites.find(item => item.name === null || item.index === 0);

    if (zeroIndex != null)
    {
        await MapSprite(map, data.src, zeroIndex, pos, 0);

        pos.y--;
    }

    let localY = 0;

    for (let i = 0; i < sprites.length; i++)
    {
        const sprite = sprites[i].item;
        const paletteSprite = data.sprites.find(item => item.name === sprite.name || item.index === sprites[i].index);

        if (paletteSprite == null) continue;

        const width = sprite.rect.width / ppu;
        const height = sprite.rect.height / ppu;

        if (width > map.cellSize.x) map.cellSize.x = width;
        if (height > map.cellSize.y) map.cellSize.y = height;

        if (localY == null) localY = sprite.rect.y ?? 0;

        if (localY !== (sprite.rect.y ?? 0))
        {
            pos.x = 0;
            pos.y--;
            localY = sprite.rect.y ?? 0;
        }

        map.tiles.push({
            palette: map.name,
            spriteID: paletteSprite.id,
            position: {
                x: pos.x,
                y: pos.y
            },
            size: {
                x: width,
                y: height
            }
        });

        pos.x++;
    }

    pos.x = 0;
    pos.y -= 2;
}

async function MapSprite (map, texturePath, data, pos, maxX)
{
    const texture = ProjectManager.FindResource(texturePath);
    const ppu = texture.args.pixelPerUnit ?? 16;
    const sprites = texture.args.sprites ?? [];

    let width = 0;
    let height = 0;

    if (sprites.length > 0 && (data.name != null || data.index > 0))
    {
        const sprite = data.name != null ? sprites.find(item => item.name === data.name) : sprites[data.index - 1];

        width = sprite.rect.width / ppu;
        height = sprite.rect.height / ppu;

        if (width > map.cellSize.x) map.cellSize.x = width;
        if (height > map.cellSize.y) map.cellSize.y = height;
    }
    else
    {
        const rawImage = new Image();
        rawImage.src = `${ProjectManager.ProjectDir()}\\img\\${texture.args.src}`;

        await new Promise(resolve => rawImage.onload = resolve);

        width = rawImage.width / ppu;
        height = rawImage.height / ppu;

        if (width > map.cellSize.x) map.cellSize.x = width;
        if (height > map.cellSize.y) map.cellSize.y = height;
    }

    map.tiles.push({
        palette: map.name,
        spriteID: data.id,
        position: {
            x: pos.x,
            y: pos.y
        },
        size: {
            x: width,
            y: height
        }
    });

    pos.x++;

    if (pos.x < maxX) return;

    pos.x = 0;
    pos.y--;
}

function GetTilePos (spriteID)
{
    return currentMap.tiles.find(item => item.spriteID === spriteID).position;
}

async function RecalcMapsByTexture (path)
{
    const maps = paletteMaps.filter(item => item.textures.includes(path));

    if (maps.length === 0) return;

    const texture = ProjectManager.FindResource(path);
    const ppu = texture.args.pixelPerUnit ?? 16;
    const sprites = texture.args.sprites ?? [];

    const rawImage = new Image();
    rawImage.src = `${ProjectManager.ProjectDir()}\\img\\${texture.args.src}`;

    await new Promise(resolve => rawImage.onload = resolve);

    const texWidth = rawImage.width / ppu;
    const texHeight = rawImage.height / ppu;

    for (let i = 0; i < maps.length; i++)
    {
        const map = maps[i];
        const paletteTiles = palettes.find(item => item.name === map.name).textures.find(item => item.src === path).sprites;

        for (let j = 0; j < paletteTiles.length; j++)
        {
            const paletteTile = paletteTiles[j];
            const tile = map.tiles.find(item => item.spriteID === paletteTile.id);
            
            if (paletteTile.name === null || paletteTile.index === 0)
            {
                tile.size = {
                    x: texWidth,
                    y: texHeight
                };

                continue;
            }

            const sprite = paletteTile.name != null ? sprites.find(item => item.name === paletteTile.name) : sprites[paletteTile.index - 1];

            tile.size = {
                x: sprite.rect.width / ppu,
                y: sprite.rect.height / ppu
            };
        }

        const sizes = map.tiles.length > 0 ? map.tiles.map(item => item.size) : [{
            x: 0,
            y: 0
        }];

        map.cellSize = {
            x: Math.max(...sizes.map(item => item.x)),
            y: Math.max(...sizes.map(item => item.y))
        };

        if (currentPalette === map.name) Palette.PaletteView().Refract(`
            SceneBank.FindByID(0).GetComponent("Grid").cellSize = new Vector2(${map.cellSize.x}, ${map.cellSize.y});

            const tilemap = SceneBank.FindByID(1).GetComponent("Tilemap");
            tilemap.ForceMeshUpdate();

            requestAnimationFrame(() => {
                const cam = GameObject.FindComponents("Camera")[0];
                const bounds = tilemap.bounds;

                cam.transform.position = new Vector2(bounds.center.x, bounds.center.y);
                cam.orthographicSize = Math.max(bounds.size.x, bounds.size.y) * 1.25;
            });
        `);
    }

    await ProjectManager.SaveEditorData();
}

async function FromTexture (path, name)
{
    const texture = ProjectManager.FindResource(path);
    let sprites = texture.args.sprites ?? [];

    if (sprites.length === 0) sprites = [{
        name: null,
        id: 0
    }];

    ProjectManager.GetPalettes().push({
        name: name,
        textures: [
            {
                src: path,
                sprites: sprites.map((item, index) => {
                    return {
                        name: item.name,
                        id: index
                    };
                })
            }
        ]
    });

    await FS.writeFile(`${ProjectManager.ProjectDir()}\\data\\tilepalettes.json`, JSON.stringify(ProjectManager.GetPalettes(), null, 4));

    if (saving) return;

    saving = true;

    await ipcRenderer.invoke("InfoDialog", "Restart Required", "Restart will be done to create the palette", window.windowID);

    if (SceneManager.IsEdited())
    {
        const prompt = await ipcRenderer.invoke("UnsavedPrompt", "Scene has unsaved changes", SceneManager.GetActiveScene().name, window.windowID, true);

        if (prompt === 1) await SceneManager.Save();
    
        forceDOMClose = true;
    }

    // lazy method lmao
    window.location.reload();
}


module.exports = {
    PaletteView,
    Init,
    DrawUI,
    OnClear,
    UseAction,
    LoadMap,
    GetTilePos,
    CacheResources,
    GetResources,
    RecalcMapsByTexture,
    FromTexture
};