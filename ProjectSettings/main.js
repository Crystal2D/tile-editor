function EvalToMain (data)
{
    ipcRenderer.invoke("eval", `
        const win = FindWindow(${window.parentID});
        
        if (win != null) win.webContents.send("eval", \`${data}\`);
    `);
}

window.addEventListener("beforeunload", () => EvalToMain("SceneManager.SetSettingsOpened(false)"));

const URLSearch = new URLSearchParams(window.location.search);
const partioningMaxDepth = parseInt(decodeURIComponent(URLSearch.get("partioning-max-depth")));

let scene = null;
let dir = null;

function Vector2 (value, xDefault, yDefault)
{
    const output = {
        x: value?.x ?? xDefault ?? 0,
        y: value?.y ?? yDefault ?? 0,
        Equals: other => output.x === other.x && output.y === other.y
    };

    return output;
}

async function Save (callback)
{
    await new Promise(resolve => requestAnimationFrame(resolve));

    if (scene.partioning != null)
    {
        if (!scene.partioning.disabled) scene.partioning.disabled = undefined;

        if (Vector2(scene.partioning.size).Equals({ x: 1024, y: 1024 })) scene.partioning.size = undefined;
        if (Vector2(scene.partioning.offset).Equals({ x: 0, y: 0 })) scene.partioning.offset = undefined;

        if (scene.partioning.maxDepth === partioningMaxDepth) scene.partioning.maxDepth = undefined;

        if (scene.partioning.disabled == null && scene.partioning.size == null && scene.partioning.offset == null && scene.partioning.maxDepth == null) scene.partioning = undefined;
    }

    if (dir != null) await FS.writeFile(dir, JSON.stringify(scene, null, 4));

    if (callback != null) callback();

    if (scene.partioning == null) scene.partioning = { };
    if (scene.partioning.disabled == null) scene.partioning.disabled = false;
    if (scene.partioning.size == null) scene.partioning.size = { };
    if (scene.partioning.size.x == null) scene.partioning.size.x = 1024;
    if (scene.partioning.size.y == null) scene.partioning.size.y = 1024;
    if (scene.partioning.offset == null) scene.partioning.offset = { };
    if (scene.partioning.offset.x == null) scene.partioning.offset.x = 0;
    if (scene.partioning.offset.y == null) scene.partioning.offset.y = 0;
    if (scene.partioning.maxDepth == null) scene.partioning.maxDepth = partioningMaxDepth;
}

function DrawUI ()
{
    const sceneName = UI.TextField("Scene Name");
    sceneName.element.id = "scene-name";
    (() => {
        const input = sceneName.element.querySelector(".input");
        
        sceneName.onBlur = () => {
            const text = input.innerText.trim();

            if (text.length > 0) return;

            input.innerText = scene.name;
        };
    })();
    sceneName.SetText(scene.name);
    sceneName.onUpdate = value => {
        EvalToMain(`
            let done = false;

            ActionManager.StartRecording("Scene.Rename");
            ActionManager.Record(
                "Scene.Rename",
                () => {
                    SceneManager.RenameScene(${JSON.stringify(value)});

                    if (done) SceneManager.MarkAsEdited();
                },
                () => {
                    SceneManager.RenameScene(${JSON.stringify(scene.name)});
                    SceneManager.MarkAsEdited();
                }
            );
            ActionManager.StopRecording("Scene.Rename");

            done = true;
        `);

        scene.name = value;

        Save();
    }

    const sceneDir = UI.Label(dir);
    sceneDir.id = "scene-dir";

    if (scene.partioning == null) scene.partioning = { };

    UI.SectionStart("Partioning"); (async () => {
        if (scene.partioning.disabled == null) scene.partioning.disabled = false;
        if (scene.partioning.size == null) scene.partioning.size = { };
        if (scene.partioning.size.x == null) scene.partioning.size.x = 1024;
        if (scene.partioning.size.y == null) scene.partioning.size.y = 1024;
        if (scene.partioning.offset == null) scene.partioning.offset = { };
        if (scene.partioning.offset.x == null) scene.partioning.offset.x = 0;
        if (scene.partioning.offset.y == null) scene.partioning.offset.y = 0;
        if (scene.partioning.maxDepth == null) scene.partioning.maxDepth = partioningMaxDepth;

        const enabled = UI.Checkbox("Enabled");
        enabled.value = +!scene.partioning.disabled;

        const settings = UI.ContainerStart();
        settings.id = "partioning-settings";
        settings.style.display = scene.partioning.disabled ? "none" : "";
            const size = UI.Vector2Field("Size", 1024, 1024);
            size.x = scene.partioning.size.x;
            size.y = scene.partioning.size.y;
            size.fieldX.onUpdate = value => {
                scene.partioning.size.x = value;

                Save(() => EvalToMain(`SceneManager.GetActiveScene().partioning = ${JSON.stringify(scene.partioning)}`));
            };
            size.fieldY.onUpdate = value => {
                scene.partioning.size.y = value;

                Save(() => EvalToMain(`SceneManager.GetActiveScene().partioning = ${JSON.stringify(scene.partioning)}`));
            };

            const offset = UI.Vector2Field("Offset");
            offset.x = scene.partioning.offset.x;
            offset.y = scene.partioning.offset.y;
            offset.fieldX.onUpdate = value => {
                scene.partioning.offset.x = value;

                Save(() => EvalToMain(`SceneManager.GetActiveScene().partioning = ${JSON.stringify(scene.partioning)}`));
            };
            offset.fieldY.onUpdate = value => {
                scene.partioning.offset.y = value;

                Save(() => EvalToMain(`SceneManager.GetActiveScene().partioning = ${JSON.stringify(scene.partioning)}`));
            };

            const maxDepth = UI.NumberField("Max Depth", partioningMaxDepth);
            maxDepth.SetValue(scene.partioning.maxDepth);
            maxDepth.onUpdate = value => {
                scene.partioning.maxDepth = value;

                Save(() => EvalToMain(`SceneManager.GetActiveScene().partioning = ${JSON.stringify(scene.partioning)}`));
            };
        UI.ContainerEnd();

        enabled.onUpdate = value => {
            settings.style.display = value === 0 ? "none" : "";
            scene.partioning.disabled = value === 0;

            Save(() => EvalToMain(`SceneManager.GetActiveScene().partioning = ${JSON.stringify(scene.partioning)}`));
        };
    })(); UI.SectionEnd();

    // UI.SectionStart("Scene Data"); (async () => {
    //     const resources = UI.SectionStart(`Used Resources ({})`);
    //     resources.SetActive(false);
    //         UI.Label("Empty");
    //     UI.SectionEnd();

    //     const gameObjects = UI.SectionStart(`GameObjects ({})`);
    //     gameObjects.SetActive(false);
    //         UI.Label("Empty");
    //     UI.SectionEnd();
    // })(); UI.SectionEnd();
}

ipcRenderer.on("DrawUI", async (event, src) => {
    UI.Clear();

    dir = src;

    if (src != null)
    {
        const sceneRequest = await fetch(src);
        scene = await sceneRequest.json();
    }

    DrawUI();
});