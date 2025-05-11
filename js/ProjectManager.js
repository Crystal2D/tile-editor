let projectData = { };
let editorData = { };
let resources = [];
let palettes = [];

let projectDir = null;
let libVersion = null;

function ProjectDir ()
{
    return projectDir;
}

function ProjectName ()
{
    return projectData.name;
}

function LibraryVersion ()
{
    return libVersion;
}

function GetEditorData ()
{
    return editorData;
}

function GetResourcesPath ()
{
    return `${projectDir}\\data\\resources\\${editorData.resources}.json`;
}

function GetResources ()
{
    return resources;
}

function GetPalettes ()
{
    return palettes;
}

function FindResource (path)
{
    return resources.find(item => item.path === path);
}

async function Init (dir)
{
    projectDir = dir;

    let counter = 0;

    (async () => {
        const manifestRequest = await fetch(`${projectDir}\\manifest.json`);
        projectData = await manifestRequest.json();

        counter++;
    })();

    (async () => {
        const newLibRequest = await fetch(`${projectDir}\\js\\libs\\Crystal.RPGTiles\\manifest.json`);
        libVersion = (await newLibRequest.json()).version;

        try
        {
            const editorRequest = await fetch(`${projectDir}\\editor.json`);
            editorData = await editorRequest.json();
        }
        catch
        {
            editorData.editorVersion = module.exports.editiorVersion;
            editorData.libraryVersion = libVersion;
        }


        await UpdateByVersion();


        if (editorData.scene == null) editorData.scene = "";

        if (editorData.resources == null)
        {
            const buildRequest = await fetch(`${projectDir}\\data\\build.json`);
            const buildData = await buildRequest.json();

            editorData.resources = buildData.resources[0];
        }

        if (editorData.palettes == null) editorData.palettes = [];

        if (editorData.dockSize == null) editorData.dockSize = 400;

        if (editorData.inspector == null) editorData.inspector = { };
        if (editorData.inspector.transformShown == null) editorData.inspector.transformShown = true;
        if (editorData.inspector.gridShown == null) editorData.inspector.gridShown = true;
        if (editorData.inspector.tilemapShown == null) editorData.inspector.tilemapShown = true;

        const resourcesRequest = await fetch(GetResourcesPath());
        resources = await resourcesRequest.json();

        counter++;
    })();

    (async () => {
        try
        {
            const palettesRequest = await fetch(`${projectDir}\\data\\tilepalettes.json`);
            palettes = await palettesRequest.json();

            if (palettes.length > 1)
            {
                palettes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

                await FS.writeFile(`${projectDir}\\data\\tilepalettes.json`, JSON.stringify(palettes, null, 4));
            }
        }
        catch { }

        counter++;
    })();

    await new Promise(resolve => Loop.Append(() => {
        if (counter === 3)
        {
            resolve();

            return;
        }
    }, null, () => counter === 3));
}

async function SaveEditorData ()
{
    await FS.writeFile(`${projectDir}\\editor.json`, JSON.stringify(editorData, null, 4));
}

function Compact2BaseTiles (tiles)
{
    let newTiles = [];

    for (let i = 0; i < tiles?.length ?? 0; i++)
    {
        if (tiles[i].spriteID != null && tiles[i].sprites == null) return tiles;

        for (let j = 0; j < tiles[i].sprites.length; j++)
        {
            const sprite = tiles[i].sprites[j];
            
            for (let k = 0; k < sprite.coords.length; k++) newTiles.push({
                palette: tiles[i].palette,
                spriteID: sprite.id,
                position: sprite.coords[k]
            });
        }
    }

    return newTiles;   
}

function Base2CompactTiles (tiles)
{
    let newTiles = [];
    let includedPalettes = [];

    for (let i = 0; i < tiles?.length ?? 0; i++)
    {
        const palette = tiles[i].palette;

        if (tiles[i].sprites != null && tiles[i].spriteID == null) return tiles;

        if (includedPalettes.includes(palette)) continue;

        includedPalettes.push(palette);

        const tileParts = tiles.filter(item => item.palette === palette);

        let sprites = [];

        for (let j = 0; j < tileParts.length; j++)
        {
            const id = tileParts[j].spriteID;

            if (sprites.find(item => item.id === id) != null) continue;

            sprites.push({
                id: id,
                coords: tileParts.filter(item => item.spriteID === id).map(item => item.position)
            });
        }

        newTiles.push({
            palette: palette,
            sprites: sprites
        });
    }

    return newTiles;
}

// Version Checks & Changes
async function UpdateByVersion ()
{
    const ver = editorData.editorVersion;
    const savedLibVer = editorData.libraryVersion;


    // libVersion >= 2025.2f && savedLibVer < 2025.2f
    if (CompareVersion(libVersion, "2025.2") >= 0 && CompareVersion(savedLibVer, "2025.2") < 0)
    {
        const scenes = (await FS.readdir(`${projectDir}\\data\\scenes`, { recursive : true })).filter(item => item.endsWith(".json"));

        let counter = 0;

        for (let i = 0; i < scenes.length; i++) (async () => {
            const sceneRequest = await fetch(`${projectDir}\\data\\scenes\\${scenes[i]}`);
            const scene = await sceneRequest.json();

            const tilemaps = scene.gameObjects.filter(item => item.name.startsWith("tile_"));

            for (let j = 0; j < tilemaps.length; j++)
            {
                const component = tilemaps[j].components.find(item => item.type === "Tilemap");
            
                if (component.args == null) component.args = { };
            
                component.args.tiles = Base2CompactTiles(component.args.tiles);
            }

            await FS.writeFile(`${projectDir}\\data\\scenes\\${scenes[i]}`, JSON.stringify(scene, null, 4));

            counter++;
        })();

        await new Promise(resolve => Loop.Append(() => {
            if (counter === scenes.length)
            {
                resolve();

                return;
            }

            LoadingScreen.SetText(`Remapping Scenes (${counter + 1}/${scenes.length})`);
        }, null, () => counter === scenes.length));
    }

    // libVersion < 2025.2f && savedLibVer >= 2025.2f
    // Reverse Compat
    if (CompareVersion(libVersion, "2025.2") < 0 && CompareVersion(savedLibVer, "2025.2") >= 0)
    {
        const scenes = (await FS.readdir(`${projectDir}\\data\\scenes`, { recursive : true })).filter(item => item.endsWith(".json"));

        let counter = 0;

        for (let i = 0; i < scenes.length; i++) (async () => {
            const sceneRequest = await fetch(`${projectDir}\\data\\scenes\\${scenes[i]}`);
            const scene = await sceneRequest.json();

            const tilemaps = scene.gameObjects.filter(item => item.name.startsWith("tile_"));

            for (let j = 0; j < tilemaps.length; j++)
            {
                const component = tilemaps[j].components.find(item => item.type === "Tilemap");
            
                if (component.args == null) component.args = { };
            
                component.args.tiles = Compact2BaseTiles(component.args.tiles);
            }

            await FS.writeFile(`${projectDir}\\data\\scenes\\${scenes[i]}`, JSON.stringify(scene, null, 4));

            counter++;
        })();

        await new Promise(resolve => Loop.Append(() => {
            if (counter === scenes.length)
            {
                resolve();

                return;
            }

            LoadingScreen.SetText(`Remapping Scenes (${counter + 1}/${scenes.length})`);
        }, null, () => counter === scenes.length));
    }

    
    if (ver != module.exports.editiorVersion || savedLibVer !== libVersion)
    {
        editorData.editorVersion = module.exports.editiorVersion;
        editorData.libraryVersion = libVersion;

        await SaveEditorData();
    }
}

function CompareVersion (a, b)
{
    const setA = (a ?? "").split(".");
    const setB = (b ?? "").split(".");
    const maxParts = Math.max(setA.length, setB.length);

    for (let i = 0; i < maxParts; i++)
    {
        const diff = Math.max(Math.min((parseInt(setA[i]) || 0) - (parseInt(setB[i]) || 0), 1), -1);

        if (diff !== 0) return diff;
    }

    return 0;
}


module.exports = {
    editiorVersion: "2025.2f",
    editorDisplayVersion: "2025.2f (The Bare Minimum Edition)",
    ProjectDir,
    ProjectName,
    GetEditorData,
    GetResourcesPath,
    GetResources,
    GetPalettes,
    FindResource,
    Init,
    SaveEditorData,
    Compact2BaseTiles,
    Base2CompactTiles,
    CompareVersion,
    LibraryVersion
};