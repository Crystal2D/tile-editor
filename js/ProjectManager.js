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

async function Init ()
{
    const URLSearch = new URLSearchParams(window.location.search);
    projectDir = decodeURIComponent(URLSearch.get("dir"));

    const manifestRequest = await fetch(`${projectDir}\\manifest.json`);
    projectData = await manifestRequest.json();

    const resourcesRequest = await fetch(`${projectDir}\\data\\resources.json`);
    resources = await resourcesRequest.json();

    try
    {
        const palettesRequest = await fetch(`${projectDir}\\data\\tilepalettes.json`);
        palettes = await palettesRequest.json();
    }
    catch { }

    try
    {
        const editorRequest = await fetch(`${projectDir}\\editor.json`);
        editorData = await editorRequest.json();
    }
    catch { }

    if (editorData.scene == null) editorData.scene = "test";
    if (editorData.palettes == null) editorData.palettes = [];
}

async function SaveEditorData ()
{
    await FS.writeFile(`${projectDir}\\editor.json`, JSON.stringify(editorData, null, 4));
}


module.exports = {
    ProjectDir,
    ProjectName,
    GetEditorData,
    GetResources,
    GetPalettes,
    FindResource,
    Init,
    SaveEditorData
};