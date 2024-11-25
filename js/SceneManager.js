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

async function Load (src)
{
    activeSceneSrc = src;

    const sceneRequest = await fetch(`${ProjectManager.ProjectDir()}//data//scenes//${src}.json`);
    activeScene = await sceneRequest.json();

    document.title = `${ProjectManager.ProjectName()} - ${activeScene.name} - Crystal Tile Editor`;

    Layers.SetSceneName(activeScene.name);

    const objTilesID = activeScene.gameObjects.find(item => item.name === "obj_tiles").id;
    const tiles = activeScene.gameObjects.filter(item => item.parent === objTilesID && item.name.startsWith("tile_"));

    for (let i = 0; i < tiles.length; i++) new Layer(tiles[i].name.slice(5));
}


module.exports = {
    GetActiveSceneSrc,
    GetActiveScene,
    Load
};