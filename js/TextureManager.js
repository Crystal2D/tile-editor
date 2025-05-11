let saving = false;

async function AddTexture (texture)
{
    LoadingScreen.EnableMini();
    LoadingScreen.SetText("Importing Texture");

    const resources = ProjectManager.GetResources();
    resources.push(texture);

    SceneView.Refract(`
        Resources.AddUnloaded(${JSON.stringify(texture)});
        Resources.Load(${JSON.stringify(texture.path)});
    `);
    Palette.PaletteView().Refract(`
        Resources.AddUnloaded(${JSON.stringify(texture)});
        Resources.Load(${JSON.stringify(texture.path)});
    `);

    LoadingScreen.Disable();
}

function GetPalettesWithTexture (path)
{
    return ProjectManager.GetPalettes().filter(item => item.textures.find(texture => texture.src === path));
}

function GetTilemapsWithTexture (path)
{
    const tilemaps = SceneManager.GetActiveScene().gameObjects.filter(item => item.components.find(component => component.type === "Tilemap"));
    const palettes = GetPalettesWithTexture(path).map(item => item.name);

    let output = [];

    for (let i = 0; i < tilemaps.length; i++)
    {
        const tilemap = tilemaps[i].components.find(item => item.type === "Tilemap");

        if (tilemap.args == null || tilemap.args?.tiles == null || tilemap.args?.tiles?.length === 0) continue;

        const includedPalettes = tilemap.args.tiles.map(item => item.palette).filter(item => palettes.includes(item));

        if (includedPalettes.length > 0) output.push(tilemaps[i]);
    }

    return output;
}

async function GetScenesWithTexture (path)
{
    const sceneDir = `${ProjectManager.ProjectDir()}\\data\\scenes`;
    const scenes = await FS.readdir(sceneDir, { recursive : true });

    let output = [];

    for (let i = 0; i < scenes.length; i++)
    {
        const scenePath = `${sceneDir}\\${scenes[i]}`;

        if ((await FS.stat(scenePath)).isDirectory()) continue;

        const sceneRequest = await fetch(scenePath);
        const scene = await sceneRequest.json();

        if (scene.resources.includes(path)) output.push({
            src: scenes[i],
            data: scene
        });
    }

    return output;
}

function UpdatePPU (path, ppu)
{
    ProjectManager.FindResource(path).args.pixelPerUnit = ppu;

    const tilemaps = GetTilemapsWithTexture(path).map(item => item.id);

    SceneView.Refract(`
        Resources.FindUnloaded(${JSON.stringify(path)}).pixelPerUnit = ${ppu};

        const texture = Resources.Find(${JSON.stringify(path)});

        if (texture != null)
        {
            texture.pixelPerUnit = ${ppu ?? 16};

            const tilemaps = ${JSON.stringify(tilemaps)};

            for (let i = 0; i < tilemaps.length; i++) SceneBank.FindByID(tilemaps[i]).GetComponent("Tilemap").ForceMeshUpdate();

            GameObject.FindComponents("MainInput")[0].ReloadPreview();
        }
    `);

    Palette.PaletteView().Refract(`
        Resources.FindUnloaded(${JSON.stringify(path)}).pixelPerUnit = ${ppu};
        Resources.Find(${JSON.stringify(path)}).pixelPerUnit = ${ppu ?? 16};
    `);
    Palette.RecalcMapsByTexture(path);

    ipcRenderer.invoke("eval", `
        const win = FindMini(${window.windowID}, ${JSON.stringify(`texture-mapper:${path}`)});
        
        if (win != null) win.webContents.send("OnTextureUpdate", ${JSON.stringify(path)});
    `);
}

async function ChangePath (oldPath, newPath)
{
    LoadingScreen.EnableMini();
    LoadingScreen.SetText("Updating Textures");

    ProjectManager.FindResource(oldPath).path = newPath;

    const palettes = GetPalettesWithTexture(oldPath);

    for (let i = 0; i < palettes.length; i++)
    {
        const textures = palettes[i].textures.filter(item => item.src === oldPath);

        for (let j = 0; j < textures.length; j++) textures[j].src = newPath;
    }

    if (palettes.length > 0) await FS.writeFile(`${ProjectManager.ProjectDir()}\\data\\tilepalettes.json`, JSON.stringify(ProjectManager.GetPalettes(), null, 4));

    const activeSceneRes = SceneManager.GetActiveScene().resources;

    if (activeSceneRes.includes(oldPath)) activeSceneRes.splice(activeSceneRes.indexOf(oldPath), 1, newPath);

    const scenes = await GetScenesWithTexture(oldPath);
    const sceneDir = `${ProjectManager.ProjectDir()}\\data\\scenes`;

    for (let i = 0; i < scenes.length; i++)
    {
        const resources = scenes[i].data.resources;
        resources.splice(resources.indexOf(oldPath), 1, newPath);

        await FS.writeFile(`${sceneDir}\\${scenes[i].src}`, JSON.stringify(scenes[i].data, null, 4));
    }

    SceneView.Refract(`Resources.ChangePath(${JSON.stringify(oldPath)}, ${JSON.stringify(newPath)})`);
    Palette.PaletteView().Refract(`Resources.ChangePath(${JSON.stringify(oldPath)}, ${JSON.stringify(newPath)})`);

    ipcRenderer.invoke("eval", `
        const win = minis.find(item => item.parentID === ${window.windowID} && item.id === ${JSON.stringify(`texture-mapper:${oldPath}`)});

        if (win != null)
        {
            win.id = ${JSON.stringify(`texture-mapper:${newPath}`)};
            win.window.webContents.send("OnTextureUpdate", ${JSON.stringify(newPath)});
        }
    `);
    
    LoadingScreen.Disable();
}

async function ReloadTextureSprites (path)
{
    const resRequest = await fetch(ProjectManager.GetResourcesPath());
    const newRes = await resRequest.json();

    const texture = ProjectManager.FindResource(path);
    const newTexture = newRes.find(item => item.path === path);

    texture.args.sprites = newTexture.args.sprites;

    if (GetPalettesWithTexture(path).length === 0)
    {
        SceneView.Refract(`
            Resources.FindUnloaded(${JSON.stringify(path)}).args.sprites = ${JSON.stringify(newTexture.args.sprites)};

            const texture = Resources.Load(${JSON.stringify(path)});

            if (texture != null)
            {
                Resources.Unload(${JSON.stringify(path)});
                Resources.Load(${JSON.stringify(path)});
            }
        `);

        ipcRenderer.invoke("eval", `
            const win = FindMini(${window.windowID}, "texture-mapper:${texture.path}");
    
            if (win != null) win.webContents.send("OnSave");
        `);

        return;
    }

    if (saving) return;

    saving = true;

    await ipcRenderer.invoke("InfoDialog", "Restart Required", "The texture changed is used in a tile palette.\n\nRestart will be done to apply changes", window.windowID);

    if (SceneManager.IsEdited())
    {
        const prompt = await ipcRenderer.invoke("UnsavedPrompt", "Scene has unsaved changes", SceneManager.GetActiveScene().name, window.windowID, true);

        if (prompt === 1) await SceneManager.Save();
    
        forceDOMClose = true;
    }

    ipcRenderer.invoke("eval", `
        const win = FindMini(${window.windowID}, "texture-mapper:${texture.path}");

        if (win != null) win.webContents.send("OnSave");
    `);

    // lazy method lmao
    window.location.reload();
}

function IsSaving ()
{
    return saving;
}


module.exports = {
    AddTexture,
    UpdatePPU,
    ChangePath,
    ReloadTextureSprites,
    IsSaving
};