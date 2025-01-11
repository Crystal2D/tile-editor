let activeSceneSrc = null;
let activeScene = null;

let loaded = false;

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

async function NewLayer ()
{
    let objID = 0;

    while (activeScene.gameObjects.find(item => item.id === objID) != null) objID++;

    const grid = {
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        cellSize: { x: 0.5, y: 0.5 },
        cellGap: { x: 0, y: 0 }
    };
    let gridData = SceneManager.FindGrid(grid) ?? SceneManager.NewGrid(grid);

    const tilemap = {
        name: "tile_Unnamed",
        id: objID,
        parent: gridData.id,
        components: [ { type: "Tilemap" } ]
    };

    activeScene.gameObjects.push(tilemap);

    SceneView.Refract(`SceneInjector.GameObject(${JSON.stringify(tilemap)})`);

    await new Promise(resolve => requestAnimationFrame(resolve));

    const layer = new Layer(tilemap, gridData);
    dock.querySelector(".layers")?.append(layer.item);

    layer.Focus();
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

function AddTile (mapID, data)
{
    const tilemap = activeScene.gameObjects.find(item => item.id === mapID).components.find(item => item.type === "Tilemap");

    if (tilemap.args == null) tilemap.args = { };
    if (tilemap.args.tiles == null) tilemap.args.tiles = [];

    tilemap.args.tiles.push(data);
}

function RemoveTile (mapID, pos)
{
    const tilemap = activeScene.gameObjects.find(item => item.id === mapID).components.find(item => item.type === "Tilemap");

    if (tilemap.args == null) tilemap.args = { };
    if (tilemap.args.tiles == null)
    {
        tilemap.args.tiles = [];

        return;
    }

    const tile = tilemap.args.tiles.find(item => item.position.x === pos.x && item.position.y === pos.y);

    if (tile == null) return;

    const index = tilemap.args.tiles.indexOf(tile);

    tilemap.args.tiles.splice(index, 1);
}

async function Load (src)
{
    loaded = false;

    LoadingScreen.SetText(`Opening Scene: ${src}`);

    activeSceneSrc = src;

    ProjectManager.GetEditorData().scene = src;
    ProjectManager.SaveEditorData();

    const sceneRequest = await fetch(`${ProjectManager.ProjectDir()}\\data\\scenes\\${src}.json`);
    activeScene = await sceneRequest.json();

    document.title = `${ProjectManager.ProjectName()} - ${activeScene.name} - Crystal Tile Editor`;

    Layers.SetSceneName(activeScene.name);

    const grids = activeScene.gameObjects.filter(item => item.name.startsWith("tilegrid_"));
    const tilemaps = activeScene.gameObjects.filter(item => item.name.startsWith("tile_"));
    
    for (let i = 0; i < grids.length; i++)
    {
        const localTilemaps = GetGridChildren(grids[i].id);

        for (let j = localTilemaps.length - 1; j >= 0; j--) new Layer(localTilemaps[j], grids[i]);
    }

    const loadCall = () => SceneView.Refract(`(async () => { await Resources.Load(...${JSON.stringify(activeScene.resources)}); await SceneInjector.Grid(...${JSON.stringify(grids)}); await SceneInjector.GameObject(...${JSON.stringify(tilemaps)}); requestAnimationFrame(() => window.parent.RefractBack("SceneManager.MarkAsLoaded()")) })()`);

    if (SceneView.isLoaded) loadCall();
    else SceneView.onLoad.Add(() => loadCall());

    await new Promise(resolve => Loop.Append(() => { if (loaded) resolve(); }, null, () => loaded));

    LoadingScreen.Disable();
}

async function Save ()
{
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
    let lastOnOrder = grids[grids.length - 1];

    for (let i = ordering.length - 1; i >= 0; i--)
    {
        const gameObject = tilemaps.find(item => item.id === ordering[i]);

        const tilemap = gameObject.components.find(item => item.type === "Tilemap");

        if (tilemap?.args != null)
        {
            if (tilemap.args.tiles?.length === 0) tilemap.args.tiles = undefined;

            if (tilemap.args.color != null)
            {
                if (tilemap.args.color.a === 255) tilemap.args.color.a = undefined;
                if (tilemap.args.color.r === 255 && tilemap.args.color.g === 255 && tilemap.args.color.b === 255 && tilemap.args.color.a == null && tilemap.args.color.trueA == null) tilemap.args.color = undefined;
            }

            if (tilemap.args.sortingLayer === 0) tilemap.args.sortingLayer = undefined;
            if (tilemap.args.sortingOrder === 0) tilemap.args.sortingOrder = undefined;

            if (tilemap.args.tiles == null) tilemap.args = undefined;
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
    }

    await FS.writeFile(`${ProjectManager.ProjectDir()}\\data\\scenes\\${activeSceneSrc}.json`, JSON.stringify(activeScene, null, 4));
}

function IsLoaded ()
{
    return loaded;
}

function MarkAsLoaded ()
{
    loaded = true;
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
    IsLoaded,
    MarkAsLoaded
};