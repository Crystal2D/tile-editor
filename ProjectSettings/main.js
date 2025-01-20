function EvalToMain (data)
{
    ipcRenderer.invoke("eval", `FindWindow(${window.parentID}).webContents.send("eval", "${data}")`);
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

async function Save ()
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

    await FS.writeFile(dir, JSON.stringify(scene, null, 4));

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
    UI.Clear();

    const sceneName = UI.TextField("Scene Name");
    sceneName.element.id = "scene-name";
    sceneName.SetText(scene.name);
    sceneName.onUpdate = value => {
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

            const offset = UI.Vector2Field("Offset");
            offset.x = scene.partioning.offset.x;
            offset.y = scene.partioning.offset.y;

            const maxDepth = UI.NumberField("Max Depth", partioningMaxDepth);
            maxDepth.SetValue(scene.partioning.maxDepth);
        UI.ContainerEnd();

        enabled.onUpdate = value => {
            settings.style.display = value === 0 ? "none" : "";
            scene.partioning.disabled = value === 0;

            Save();
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
    dir = src;

    const sceneRequest = await fetch(src);
    scene = await sceneRequest.json();

    DrawUI();
});