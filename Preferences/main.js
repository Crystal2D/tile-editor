const path = require("node:path");


const URLSearch = new URLSearchParams(window.location.search);
const projectDir = decodeURIComponent(URLSearch.get("dir"));

const OnSave = new DelegateEvent();

let resPath = decodeURIComponent(URLSearch.get("res"));

const resWrap = UI.ContainerStart();
resWrap.style.display = "flex";

const resText = UI.TextField("Texture Resource File");
(() => {
    resText.element.style.width = "100%";
    resText.element.style.paddingBottom = "0";

    const inputWrap = resText.element.querySelector(".input-wrap");
    inputWrap.style.borderTopRightRadius = "0";
    inputWrap.style.borderBottomRightRadius = "0";
})();
resText.onUpdate = async text => {
    text = path.normalize(text);

    resText.SetText(text);

    if (resPath !== text) await ChangeResPath(text);
};
resText.SetText(resPath);

const resSelect = UI.Button("Change");
(() => {
    resSelect.element.style.width = "100px";
    resSelect.element.style.display = "flex";
    resSelect.element.style.flexDirection = "column";
    resSelect.element.style.justifyContent = "center";
    resSelect.element.style.borderTopLeftRadius = "0";
    resSelect.element.style.borderBottomLeftRadius = "0";
})();
resSelect.onClick = async () => {
    const file = await ipcRenderer.invoke("SelectFile", `${projectDir}\\data\\resources`, {
        title: "Select File",
        windowID: window.windowID,
        filters: [{ name: "JSON", extensions: ["json"] }]
    });

    if (file.canceled || resPath === file.path) return;

    resText.SetText(file.path);

    await ChangeResPath(file.path);
};

UI.ContainerEnd();


async function ChangeResPath (newPath)
{
    resPath = newPath;

    EvalToMain(`Preferences.ChangeResPath(${JSON.stringify(path.relative(`${projectDir}\\data\\resources`, newPath).slice(0, -5).replaceAll("\\", "\\\\"))})`);

    let saveResolve = null;
    const onSave = () => {
        OnSave.Remove(onSave);

        saveResolve();
    };

    OnSave.Add(onSave);

    await new Promise(resolve => saveResolve = resolve);
}


ipcRenderer.on("OnSave", () => OnSave.Invoke());