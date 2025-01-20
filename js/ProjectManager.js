let projectData = { };
let editorData = { };
let resources = [];
let palettes = [];

let projectDir = null;

function ProjectDir ()
{
    return projectDir;
}

function ProjectName ()
{
    return projectData.name;
}

function GetEditorData ()
{
    return editorData;
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
        const resourcesRequest = await fetch(`${projectDir}\\data\\resources.json`);
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

    (async () => {
        try
        {
            const editorRequest = await fetch(`${projectDir}\\editor.json`);
            editorData = await editorRequest.json();
        }
        catch { }

        if (editorData.scene == null) editorData.scene = "";
        if (editorData.palettes == null) editorData.palettes = [];

        if (editorData.inspector == null) editorData.inspector = { };
        if (editorData.inspector.transformShown == null) editorData.inspector.transformShown = true;
        if (editorData.inspector.gridShown == null) editorData.inspector.gridShown = true;
        if (editorData.inspector.tilemapShown == null) editorData.inspector.tilemapShown = true;

        counter++;
    })();

    await new Promise(resolve => Loop.Append(() => {
        if (counter === 4)
        {
            resolve();

            return;
        }
    }, null, () => counter === 4));
}

async function SaveEditorData ()
{
    await FS.writeFile(`${projectDir}\\editor.json`, JSON.stringify(editorData, null, 4));
}


module.exports = {
    editiorVersion: 2025.1,
    editorDisplayVersion: "2025.1f (The Bare Minimum Edition)",
    ProjectDir,
    ProjectName,
    GetEditorData,
    GetResources,
    GetPalettes,
    FindResource,
    Init,
    SaveEditorData
};