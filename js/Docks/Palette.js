let focused = false;
let palettes = [];
let paletteMaps = [];
let actions = [];

let paletteViewWrap = null;
let paletteView = null;
let tools = null;
let currentAction = null;

function Init ()
{
    palettes = ProjectManager.GetPalettes();
    paletteMaps = ProjectManager.GetEditorData().palettes;

    let removingMaps = [];

    for (let i = 0; i < paletteMaps.length; i++) if (palettes.find(item => item.name === paletteMaps[i].name) == null) removingMaps.push(paletteMaps[i]);

    for (let i = 0; i < removingMaps.length; i++) paletteMaps.splice(paletteMaps.indexOf(removingMaps[i]), 1);

    if (removingMaps.length > 0) ProjectManager.SaveEditorData();

    paletteViewWrap = document.createElement("div");
    paletteViewWrap.classList.add("palette-view");

    const wrap = document.createElement("div");

    paletteView = new Refractor.Embed(wrap);
    paletteView.content.addEventListener("load", () => paletteView.Refract("window.targetScene = 1; document.body.style.background = \"rgb(32, 32, 32)\""));
    paletteView.onLoad.Add(() => OnRefractorLoad());

    paletteViewWrap.append(wrap);

    tools = document.createElement("div");
    tools.classList.add("palette-tools");
    tools.setAttribute("enabled", 0);

    const pencilTool = document.createElement("img");
    pencilTool.src = "img/pencil.svg";

    const eraserTool = document.createElement("img");
    eraserTool.src = "img/eraser.svg";

    const selectTool = document.createElement("img");
    selectTool.src = "img/cursor.svg";

    const moveTool = document.createElement("img");
    moveTool.src = "img/move.svg";

    actions = [pencilTool, eraserTool, selectTool, moveTool];

    for (let i = 0; i < actions.length; i++)
    {
        actions[i].addEventListener("dragstart", event => event.preventDefault());
        actions[i].addEventListener("click", () => UseAction(i));
    }

    tools.append(...actions);

    UseAction(0);

    Dock.OnResize().Add(() => {
        if (!focused) return;

        paletteView.content.style.pointerEvents = "none";
        paletteView.RecalcSize();
    });
    Dock.OnResizeEnd().Add(() => { if (focused) paletteView.content.style.pointerEvents = ""; });
    window.addEventListener("resize", () => { if (focused) paletteView.RecalcSize(); });

    Loop.Append(() => {
        const hasSelection = Layers.Selection() != null;

        tools.setAttribute("enabled", +hasSelection);

        if (!hasSelection) return;

        if (Input.GetKeyDown(KeyCode.B)) UseAction(0);
        if (Input.GetKeyDown(KeyCode.E)) UseAction(+(currentAction !== 1));
        if (Input.GetKey(KeyCode.Ctrl) && Input.GetKeyDown(KeyCode.R)) UseAction(2);
        if (Input.GetKeyDown(KeyCode.T)) UseAction(3);

        if (Input.GetKey(KeyCode.Ctrl) && !Input.GetKey(KeyCode.Shift) && Input.GetKeyDown(KeyCode.A))
        {
            UseAction(2);

            SceneView.Refract("GameObject.FindComponents(\"MainInput\")[0].SelectAll()");
        }
    });
}

function DrawUI ()
{
    selection = Layers.Selection();

    focused = true;

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

    Dock.AddContent(paletteViewWrap);
    paletteView.RecalcSize();

    Dock.AddContent(tools);

    const search = Dock.ContainerStart();
    search.classList.add("palette-search");

    const searchImg = document.createElement("img");
    searchImg.src = "img/search.svg";
    searchImg.addEventListener("dragstart", event => event.preventDefault());
    Dock.AddContent(searchImg);

    const searchbar = Dock.TextField();
    searchbar.element.querySelector(".placehold").textContent = "Search...";

    Dock.ContainerEnd();
}

function UseAction (index)
{
    if (currentAction === index) return;

    if (currentAction != null) actions[currentAction].setAttribute("focused", 0);

    actions[index].setAttribute("focused", 1);

    requestAnimationFrame(() => SceneView.Refract(`GameObject.FindComponents("MainInput")[0].UseAction(${index})`));

    currentAction = index;
}

function OnContext ()
{
    
}

function OnClear ()
{
    focused = false;
}

async function OnRefractorLoad ()
{
    paletteView.Refract(`SceneInjector.Grid(${JSON.stringify({
        name: "tilegrid",
        id: 0,
        components: [
            {
                type: "Grid"
            }
        ]
    })})`);

    await new Promise(resolve => requestAnimationFrame(resolve));

    paletteView.Refract("SceneModifier.FocusGrid(0)");

    LoadMap("colors");
}

async function LoadMap (name)
{
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

        let removingTextures = [];

        for (let i = 0; i < map.textures.length; i++)
        {
            const texture = palette.textures.find(item => item.src === map.textures[i]);

            if (texture == null || texture.sprites.length === 0) removingTextures.push(map.textures[i]);
        }

        if (removingTiles.length > 0 || removingTextures.length > 0) save = true;

        for (let i = 0; i < removingTextures.length; i++) map.textures.splice(map.textures.indexOf(removingTextures[i]), 1);

        let pos = {
            x: 0,
            y: Math.min(...map.tiles.map(item => item.position.y)) - 2
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

        if (save) ProjectManager.SaveEditorData();
    }

    paletteView.Refract(`SceneBank.FindByID(0).GetComponent("Grid").cellSize = new Vector2(${map.cellSize.x}, ${map.cellSize.y})`);
    paletteView.Refract(`(async () => { await Resources.Load(...${JSON.stringify(palette.textures.map(item => item.src))}); await SceneInjector.GameObject(${JSON.stringify({
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
    })}); SceneModifier.FocusTilemap(1) })()`);
}

async function GenerateMap (name)
{
    let map = {
        name: name,
        cellSize: {
            x: 0.5,
            y: 0.5
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

    ProjectManager.SaveEditorData();

    return map;
}

async function MapTexture (map, data, pos)
{
    if (!map.textures.includes(data.src)) map.textures.push(data.src);

    const texture = ProjectManager.FindResource(data.src);
    const ppu = texture.args.pixelPerUnit ?? 16;
    const sprites = texture.args.sprites;

    const maxX = Math.sqrt(data.sprites.length);

    for (let i = 0; i < data.sprites.length; i++)
    {
        const sprite = data.sprites[i];

        if (sprite.index === 0)
        {
            await MapSprite(map, data.src, sprite, pos, maxX);

            continue;
        }

        const width = sprites[sprite.index - 1].width / ppu;
        const height = sprites[sprite.index - 1].height / ppu;

        if (width > map.cellSize.x) map.cellSize.x = width;
        if (height > map.cellSize.y) map.cellSize.y = height;

        map.tiles.push({
            palette: map.name,
            spriteID: sprite.id,
            position: {
                x: pos.x,
                y: pos.y
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

async function MapSprite (map, texturePath, data, pos, maxX)
{
    const texture = ProjectManager.FindResource(texturePath);
    const ppu = texture.args.pixelPerUnit ?? 16;
    const sprites = texture.args.sprites ?? [];

    if (sprites.length > 0 && data.index > 0)
    {
        const width = sprites[data.index - 1].width / ppu;
        const height = sprites[data.index - 1].height / ppu;

        if (width > map.cellSize.x) map.cellSize.x = width;
        if (height > map.cellSize.y) map.cellSize.y = height;
    }
    else
    {
        const rawImage = new Image();
        rawImage.src = `${ProjectManager.ProjectDir()}\\img\\${texture.args.src}`;

        await new Promise(resolve => rawImage.onload = resolve);

        const width = rawImage.width / ppu;
        const height = rawImage.height / ppu;

        if (width > map.cellSize.x) map.cellSize.x = width;
        if (height > map.cellSize.y) map.cellSize.y = height;
    }

    map.tiles.push({
        palette: map.name,
        spriteID: data.id,
        position: {
            x: pos.x,
            y: pos.y
        }
    });

    pos.x++;

    if (pos.x < maxX) return;

    pos.x = 0;
    pos.y--;
}


module.exports = {
    Init,
    DrawUI,
    OnContext,
    OnClear,
    UseAction
};