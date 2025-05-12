async function Open ()
{
    await ipcRenderer.invoke(
        "OpenMini",
        "Preferences",
        window.windowID,
        "prefs",
        "Preferences/main",
        "Preferences/styles",
        `dir=${ProjectManager.ProjectDir()}&res=${ProjectManager.GetResourcesPath()}`
    );    
}

async function ChangeResPath (path)
{
    ProjectManager.GetEditorData().resources = path;
    await ProjectManager.SaveEditorData();

    await RequestRestart();
}

async function RequestRestart ()
{
    await ipcRenderer.invoke("InfoDialog", "Restart Required", "Some changes requires restart to take effect", window.windowID);

    if (SceneManager.IsEdited())
    {
        const prompt = await ipcRenderer.invoke("UnsavedPrompt", "Scene has unsaved changes", SceneManager.GetActiveScene().name, window.windowID, true);

        if (prompt === 1) await SceneManager.Save();
    
        forceDOMClose = true;
    }
    
    ipcRenderer.invoke("eval", `
        const win = FindMini(${window.windowID}, "prefs");

        if (win != null) win.webContents.send("OnSave");
    `);

    window.location.reload();
}


module.exports = {
    Open,
    ChangeResPath
};