let loaded = false;
let unloaded = false;
let edited = false;
let settingsOpened = false;
let tileCount = 0;

let activeSceneSrc = null;
let activeScene = null;

function GetActiveSceneSrc ()
{
    return activeSceneSrc;
}

function GetActiveScene ()
{
    return activeScene;
}

function GetGridCount ()
{
    return activeScene.gameObjects.filter(item => item.name.startsWith("tilegrid_")).length;
}

function Vector2 (value, xDefault, yDefault)
{
    const output = {
        x: value?.x ?? xDefault ?? 0,
        y: value?.y ?? yDefault ?? 0,
        Equals: other => output.x === other.x && output.y === other.y
    };

    return output;
}

function FindGrid (data)
{
    const grids = activeScene.gameObjects.filter(item => item.name.startsWith("tilegrid_"));

    return grids.find(item => {
        if (!Vector2(item.transform?.position).Equals(data.position)) return false;
        else if (!Vector2(item.transform?.scale, 1, 1).Equals(data.scale)) return false;

        const gridData = item.components.find(item => item.type === "Grid").args ?? { };

        if (!Vector2(gridData.cellSize, 0.5, 0.5).Equals(data.cellSize)) return false;
        else if (!Vector2(gridData.cellGap).Equals(data.cellGap)) return false;

        return true;
    });
}

function NewGrid (data)
{
    if (Vector2(data.position).Equals(Vector2())) data.position = undefined;
    if (Vector2(data.scale).Equals({ x: 1, y: 1 })) data.scale = undefined;
    if (Vector2(data.cellSize).Equals({ x: 0.5, y: 0.5 })) data.cellSize = undefined;
    if (Vector2(data.cellGap).Equals(Vector2())) data.cellGap = undefined;

    let objID = 0;

    while (activeScene.gameObjects.find(item => item.id === objID) != null) objID++;

    const grid = {
        name: `tilegrid_${GetGridCount()}`,
        id: objID,
        transform: {
            position: data.position,
            scale: data.scale
        }
    };

    if (grid.transform.position == null && grid.transform.scale == null) grid.transform = undefined;

    const component = {
        type: "Grid",
        args: {
            cellSize: data.cellSize,
            cellGap: data.cellGap
        }
    };

    if (component.args.cellSize == null && component.args.cellGap == null) component.args = undefined;

    grid.components = [component];

    activeScene.gameObjects.push(grid);

    SceneView.Refract(`SceneInjector.Grid(${JSON.stringify(grid)})`);

    return grid;
}

async function NewLayerBase ()
{
    SceneManager.MarkAsEdited();

    const grid = {
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        cellSize: { x: 0.5, y: 0.5 },
        cellGap: { x: 0, y: 0 }
    };
    let gridData = SceneManager.FindGrid(grid) ?? SceneManager.NewGrid(grid);

    await new Promise(resolve => requestAnimationFrame(resolve));

    let objID = 0;
    
    while (activeScene.gameObjects.find(item => item.id === objID) != null) objID++;

    const tilemap = {
        name: "tile_Unnamed",
        id: objID,
        parent: gridData.id,
        components: [{ type: "Tilemap" }]
    };

    activeScene.gameObjects.push(tilemap);

    SceneView.Refract(`SceneInjector.GameObject(${JSON.stringify(tilemap)})`);

    await new Promise(resolve => requestAnimationFrame(resolve));

    const layer = new Layer(tilemap, gridData);
    dock.querySelector(".layers")?.append(layer.item);

    if (activeScene.gameObjects.filter(item => item.name.startsWith("tile_")).length === 1) Layers.Redraw();

    layer.FocusBase();

    return layer;
}

async function NewLayer ()
{
    const layer = await NewLayerBase();
    let done = false;

    ActionManager.StartRecording("Scene.CreateLayer");
    ActionManager.Record(
        "Scene.CreateLayer",
        () => { if (done) layer.UndeleteBase(); },
        () => layer.DeleteBase()
    );
    ActionManager.StopRecording("Scene.CreateLayer");

    done = true;
}

function DestroyObject (id)
{
    const object = activeScene.gameObjects.find(item => item.id === id);

    if (object == null) return;

    const index = activeScene.gameObjects.indexOf(object);

    activeScene.gameObjects.splice(index, 1);

    SceneView.Refract(`SceneInjector.Destroy(${id})`);
}

function GetGridChildren (id)
{
    const tilemaps = activeScene.gameObjects.filter(item => item.name.startsWith("tile_"));

    return tilemaps.filter(item => item.parent === id);
}

function AddTileBase (tilemap, data)
{
    SceneManager.MarkAsEdited();

    if (tilemap.args == null) tilemap.args = { };
    if (tilemap.args.tiles == null) tilemap.args.tiles = [];

    tilemap.args.tiles.push(data);

    AddTileCount(1);
}

function RemoveTileBase (tilemap, data)
{
    SceneManager.MarkAsEdited();

    if (tilemap.args == null) tilemap.args = { };
    if (tilemap.args.tiles == null)
    {
        tilemap.args.tiles = [];

        return;
    }

    const index = tilemap.args.tiles.indexOf(data);

    tilemap.args.tiles.splice(index, 1);

    AddTileCount(-1);
}

function AddTile (mapID, data)
{
    const tilemap = activeScene.gameObjects.find(item => item.id === mapID).components.find(item => item.type === "Tilemap");

    ActionManager.Record(
        "Scene.TileModify",
        () => {
            AddTileBase(tilemap, data);

            SceneView.Refract(`
                SceneBank.FindByID(${mapID}).GetComponent("Tilemap").AddTile(
                    new Tile(
                        "${data.palette}",
                        ${data.spriteID},
                        new Vector2(${data.position.x}, ${data.position.y})
                    )
                );
            `);
        },
        () => {
            RemoveTileBase(tilemap, data);

            SceneView.Refract(`SceneBank.FindByID(${mapID}).GetComponent("Tilemap").RemoveTileByPosition(new Vector2(${data.position.x}, ${data.position.y}))`);
        }
    );
}

function RemoveTile (mapID, pos)
{
    const tilemap = activeScene.gameObjects.find(item => item.id === mapID).components.find(item => item.type === "Tilemap");
    const tile = tilemap.args.tiles.find(item => item.position.x === pos.x && item.position.y === pos.y);

    if (tile == null) return;

    ActionManager.Record(
        "Scene.TileModify",
        () => {
            RemoveTileBase(tilemap, tile);

            SceneView.Refract(`SceneBank.FindByID(${mapID}).GetComponent("Tilemap").RemoveTileByPosition(new Vector2(${tile.position.x}, ${tile.position.y}))`);
        },
        () => {
            AddTileBase(tilemap, tile);

            SceneView.Refract(`
                SceneBank.FindByID(${mapID}).GetComponent("Tilemap").AddTile(
                    new Tile(
                        "${tile.palette}",
                        ${tile.spriteID},
                        new Vector2(${tile.position.x}, ${tile.position.y})
                    )
                );
            `);
        }
    );
}

async function Load (src)
{
    if (!LoadingScreen.IsEnabled()) LoadingScreen.EnableMini();

    try
    {
        const sceneRequest = await fetch(`${ProjectManager.ProjectDir()}\\data\\scenes\\${src}`);
        activeScene = await sceneRequest.json();
    }
    catch
    {
        LoadingScreen.SetText("OPEN A SCENE OR WE'LL MAKE YOU A NEW ONE");

        await OpenScene();

        if (activeSceneSrc == null) await NewScene();

        return;
    }

    if (loaded)
    {
        LoadingScreen.SetText("Clearing Scene");

        Dock.Unfocus();

        Layers.ClearLayers();

        SceneView.Refract("SceneInjector.DestroyAll(); requestAnimationFrame(() => window.parent.RefractBack(\"SceneManager.MarkAsUnloaded()\"))");

        await new Promise(resolve => Loop.Append(() => { if (unloaded) resolve(); }, null, () => unloaded));

        ActionManager.ClearActions();

        requestAnimationFrame(() => SceneView.Refract("GameObject.Find(\"camera\").transform.position = Vector2.zero"));
    }

    LoadingScreen.SetText(`Opening Scene: ${src}`);

    activeSceneSrc = src.endsWith(".newscene") ? null : src;

    ProjectManager.GetEditorData().scene = src.endsWith(".newscene") ? null : src;
    await ProjectManager.SaveEditorData();

    document.title = `${ProjectManager.ProjectName()} - ${activeScene.name} - Crystal Tile Editor`;

    Layers.SetSceneName(activeScene.name);

    const grids = activeScene.gameObjects.filter(item => item.name.startsWith("tilegrid_"));
    const tilemaps = activeScene.gameObjects.filter(item => item.name.startsWith("tile_"));

    for (let i = tilemaps.length - 1; i >= 0; i--)
    {
        const component = tilemaps[i].components.find(item => item.type === "Tilemap");

        if (component.args == null) component.args = { };

        if (ProjectManager.CompareVersion(ProjectManager.LibraryVersion(), "2025.2") >= 0) component.args.tiles = ProjectManager.Compact2BaseTiles(component.args.tiles);

        // I u ever get an error possibly made by accidental dupes,
        // then uncomm this :v
        // 
        // LIB VER 2025.2+ ONLY
        // {
        //     const mustRemove = [];

        //     for (let j = 0; j < component.args.tiles.length; j++)
        //     {
        //         const curr = component.args.tiles[j];
        //         const dupe = component.args.tiles.find(item => item !== curr && item.position.x === curr.position.x && item.position.y === curr.position.y);

        //         if (dupe == null) continue;

        //         console.log(dupe);

        //         // Uncomm to remove dupes
        //         // mustRemove.push(dupe);
        //     }

        //     for (let j = 0; j < mustRemove.length; j++) component.args.tiles.splice(component.args.tiles.indexOf(mustRemove[j]), 1);

        //     if (mustRemove.length > 0) await Save();
        // }

        const grid = grids.find(item => item.id === tilemaps[i].parent);

        new Layer(tilemaps[i], grid);
    }

    tileCount = tilemaps.map(item => item.components.find(component => component.type === "Tilemap").args?.tiles)?.flat()?.filter(item => item != null)?.length ?? 0;

    Footer.FindItem("tiles").text = `Tiles: ${tileCount}`;

    const loadCall = () => SceneView.Refract(`(async () => {
        await SceneInjector.Grid(...${JSON.stringify(grids)});
        await SceneInjector.GameObject(...${JSON.stringify(tilemaps)});
        
        requestAnimationFrame(() => window.parent.RefractBack("SceneManager.MarkAsLoaded()"));
    })()`);

    if (SceneView.isLoaded) loadCall();
    else SceneView.onLoad.Add(() => loadCall());

    await new Promise(resolve => Loop.Append(() => { if (loaded) resolve(); }, null, () => loaded));

    const sceneCam = activeScene.gameObjects.find(item => item.components.find(component => component.type === "Camera") != null).components.find(component => component.type === "Camera");

    SceneView.Refract(`
        GameObject.FindComponents("Camera")[0].orthographicSize = ${(sceneCam.args?.orthographicSize ?? 9) + 1};
    `);

    Dock.FocusByIndex(0);

    LoadingScreen.Disable();
}

async function SaveSceneAs (src)
{
    edited = false;
    document.title = `${ProjectManager.ProjectName()} - ${activeScene.name} - Crystal Tile Editor`;

    LoadingScreen.EnableMini();
    LoadingScreen.SetText(`Saving Scene: ${src}`);

    await new Promise(resolve => requestAnimationFrame(resolve));

    let includedTextures = [];

    const grids = activeScene.gameObjects.filter(item => item.name.startsWith("tilegrid_"));

    for (let i = 0; i < grids.length; i++)
    {
        const gameObject = grids[i];

        gameObject.name = `tilegrid_${i}`;

        const grid = gameObject.components.find(item => item.type === "Grid");

        if (grid.args != null)
        {
            if (Vector2(grid.args.cellSize).Equals({ x: 0.5, y: 0.5 })) grid.args.cellSize = undefined;
            if (Vector2(grid.args.cellGap).Equals({ x: 0, y: 0 })) grid.args.cellGap = undefined;

            if (grid.args.cellSize == null && grid.args.cellGap == null) grid.args = undefined;
        }
    }

    const tilemaps = activeScene.gameObjects.filter(item => item.name.startsWith("tile_"));

    for (let i = 0; i < tilemaps.length; i++) activeScene.gameObjects.splice(activeScene.gameObjects.indexOf(tilemaps[i]), 1);

    const ordering = Layers.GetOrdering();
    const onAfterSave = new DelegateEvent();

    let lastOnOrder = grids[grids.length - 1];
    let includedPalettes = [];

    for (let i = ordering.length - 1; i >= 0; i--)
    {
        const gameObject = tilemaps.find(item => item.id === ordering[i]);
        const tilemap = gameObject.components.find(item => item.type === "Tilemap");

        if (tilemap.args != null)
        {
            if (tilemap.args.tiles == null || tilemap.args.tiles?.length === 0) tilemap.args.tiles = undefined;
            else
            {
                for (let j = 0; j < tilemap.args.tiles.length; j++)
                {
                    const palette = tilemap.args.tiles[j].palette;

                    if (!includedPalettes.includes(palette)) includedPalettes.push(palette);
                }

                if (ProjectManager.CompareVersion(ProjectManager.LibraryVersion(), "2025.2") >= 0)
                {
                    const oldTiles = tilemap.args.tiles;

                    tilemap.args.tiles = ProjectManager.Base2CompactTiles(tilemap.args.tiles);

                    onAfterSave.Add(() => tilemap.args.tiles = oldTiles);
                }
            }

            if (tilemap.args.color != null)
            {
                if (tilemap.args.color.a === 255) tilemap.args.color.a = undefined;
                if (tilemap.args.color.r === 255 && tilemap.args.color.g === 255 && tilemap.args.color.b === 255 && tilemap.args.color.a == null && tilemap.args.color.trueA == null) tilemap.args.color = undefined;
            }

            if (tilemap.args.sortingLayer === 0) tilemap.args.sortingLayer = undefined;
            if (tilemap.args.sortingOrder === 0) tilemap.args.sortingOrder = undefined;

            if (tilemap.args.tiles == null && tilemap.args.sortingLayer === 0 && tilemap.args.sortingOrder === 0) tilemap.args = undefined;
        }

        activeScene.gameObjects.splice(activeScene.gameObjects.indexOf(lastOnOrder) + 1, 0, gameObject);

        lastOnOrder = gameObject;
    }

    for (let i = 0; i < activeScene.gameObjects.length; i++)
    {
        const gameObject = activeScene.gameObjects[i];

        if (gameObject.transform != null)
        {
            if (Vector2(gameObject.transform.position).Equals({ x: 0, y: 0 })) gameObject.transform.position = undefined;
            if (Vector2(gameObject.transform.scale).Equals({ x: 1, y: 1 })) gameObject.transform.scale = undefined;

            if (gameObject.transform.position == null && gameObject.transform.scale == null) gameObject.transform = undefined;
        }

        const spriteRenderer = gameObject.components.find(item => item.type === "SpriteRenderer")?.args;

        if (spriteRenderer != null) includedTextures.push(spriteRenderer.sprite.texture);
    }

    const palettes = ProjectManager.GetPalettes();

    for (let i = 0; i < includedPalettes.length; i++)
    {
        const palette = palettes.find(item => item.name === includedPalettes[i]);

        if (palette != null) includedTextures.push(...palette.textures.map(item => item.src));
    }

    const paletteResources = Palette.GetResources().filter(item => !includedTextures.includes(item));

    activeScene.resources = activeScene.resources.filter(item => includedTextures.includes(item) || !paletteResources.includes(item));

    for (let i = 0; i < includedTextures.length; i++) if (!activeScene.resources.includes(includedTextures[i])) activeScene.resources.push(includedTextures[i]);

    await FS.writeFile(`${ProjectManager.ProjectDir()}\\data\\scenes\\${src}`, JSON.stringify(activeScene, null, 4));

    onAfterSave.Invoke();

    LoadingScreen.Disable();
}

async function NewScene ()
{
    if (edited)
    {
        const prompt = await ipcRenderer.invoke("UnsavedPrompt", "Scene has unsaved changes", activeScene.name, window.windowID);

        if (prompt === 0) return;
        else if (prompt === 1) await Save();
    }

    if (!LoadingScreen.IsEnabled()) LoadingScreen.EnableMini();

    edited = false;

    LoadingScreen.SetText(`Creating New Scene`);

    await FS.writeFile(`${ProjectManager.ProjectDir()}\\data\\scenes\\newscene`, JSON.stringify({
        name: "New Scene",
        resources: [],
        gameObjects: [
            {
                name: "camera",
                id: 0,
                components: [{ type: "Camera" }]
            },
            {
                name: "tilegrid_0",
                id: 1,
                components: [{ type: "Grid" }]
            },
            {
                name: "tile_Hello! I'm a layer",
                id: 2,
                parent: 1,
                components: [{ type: "Tilemap" }]
            }
        ]
    }, null, 4));

    await new Promise(resolve => HideFile.hide(`${ProjectManager.ProjectDir()}\\data\\scenes\\newscene`, resolve));

    LoadingScreen.LockText();

    await Load(".newscene");

    await FS.unlink(`${ProjectManager.ProjectDir()}\\data\\scenes\\.newscene`);

    LoadingScreen.UnlockText();
}

async function OpenScene ()
{
    const file = await ipcRenderer.invoke("SelectFile", `${ProjectManager.ProjectDir()}\\data\\scenes`, {
        title: "Open Scene",
        windowID: window.windowID,
        filters: [{ name: "JSON", extensions: ["json"] }]
    });

    Input.RestateKeys();

    if (file.canceled) return;

    if (edited)
    {
        const prompt = await ipcRenderer.invoke("UnsavedPrompt", "Scene has unsaved changes", activeScene.name, window.windowID);

        if (prompt === 0) return;
        else if (prompt === 1) await Save();
    }
    else if (file.path === activeSceneSrc) return;

    edited = false;

    const path = require("node:path");

    await Load(path.relative(`${ProjectManager.ProjectDir()}\\data\\scenes`, file.path));
}

async function Save ()
{
    if (activeSceneSrc != null) await SaveSceneAs(activeSceneSrc);
    else await SaveAs();
}

async function SaveAs ()
{
    const file = await ipcRenderer.invoke("SelectFile", activeSceneSrc ?? `${ProjectManager.ProjectDir()}\\data\\scenes\\newscene.json`, {
        title: "Save Scene",
        windowID: window.windowID,
        save: true,
        filters: [{ name: "JSON", extensions: ["json"] }]
    });

    Input.RestateKeys();

    if (file.canceled) return;

    const path = require("node:path");

    activeSceneSrc = path.relative(`${ProjectManager.ProjectDir()}\\data\\scenes`, file.path);

    ProjectManager.GetEditorData().scene = activeSceneSrc;
    await ProjectManager.SaveEditorData();

    await SaveSceneAs(activeSceneSrc);
}

function IsLoaded ()
{
    return loaded;
}

function MarkAsLoaded ()
{
    unloaded = false;
    loaded = true;
}

function MarkAsUnloaded ()
{
    unloaded = true;
    loaded = false;
}

function RenameScene (name)
{
    const lastName = activeScene.name;

    if (lastName === name || name.length === 0) return;

    activeScene.name = name;

    Layers.SetSceneName(activeScene.name);
    document.title = `${ProjectManager.ProjectName()} - ${activeScene.name} - Crystal Tile Editor${edited ? "*" : ""}`;
}

function IsEdited ()
{
    return edited;
}

function MarkAsEdited ()
{
    if (edited) return;
    
    edited = true;

    document.title = `${ProjectManager.ProjectName()} - ${activeScene.name} - Crystal Tile Editor*`;
}

function AreSettingsOpen ()
{
    return settingsOpened;
}

function SetSettingsOpened (state)
{
    if (state !== settingsOpened) settingsOpened = state;
}

function RedrawSettings ()
{
    if (!settingsOpened) return;

    ipcRenderer.invoke("eval", `FindMini(${window.windowID}, "scene-settings").webContents.send("DrawUI", ${JSON.stringify(activeSceneSrc)})`);
}

function AddTileCount (amount)
{
    tileCount += amount;
    Footer.FindItem("tiles").text = `Tiles: ${tileCount}`;
}


module.exports = {
    GetActiveSceneSrc,
    GetActiveScene,
    GetGridCount,
    FindGrid,
    NewGrid,
    NewLayer,
    DestroyObject,
    GetGridChildren,
    AddTile,
    RemoveTile,
    Load,
    Save,
    SaveAs,
    IsLoaded,
    MarkAsLoaded,
    MarkAsUnloaded,
    OpenScene,
    NewScene,
    RenameScene,
    IsEdited,
    MarkAsEdited,
    AreSettingsOpen,
    SetSettingsOpened,
    RedrawSettings,
    AddTileCount
};