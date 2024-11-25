let projectData = { };
let editorData = { };

let projectDir = null;

function ProjectDir ()
{
    return projectDir;
}

function ProjectName ()
{
    return projectData.name;
}

async function Init ()
{
    const URLSearch = new URLSearchParams(window.location.search);
    projectDir = decodeURIComponent(URLSearch.get("dir"));

    const manifestRequest = await fetch(`${projectDir}\\manifest.json`);
    projectData = await manifestRequest.json();

    try
    {
        const editorRequest = await fetch(`${projectDir}\\editor.json`);
        editorData = await editorRequest.json();
    }
    catch { }

    await SceneManager.Load("test");
}

async function SaveEditorData ()
{
    editorData.scene = SceneManager.GetActiveSceneSrc();

    await FS.writeFile(`${projectDir}\\editor.json`, JSON.stringify(editorData));
}


module.exports = {
    ProjectDir,
    ProjectName,
    Init,
    SaveEditorData
};