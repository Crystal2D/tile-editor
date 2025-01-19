const { ipcRenderer } = require("electron");

window.onload = async () => {
    const URLSearch = new URLSearchParams(window.location.search);
    const parentID = parseInt(decodeURIComponent(URLSearch.get("parent-id")));

    scene.append(decodeURIComponent(URLSearch.get("scene")));

    if (text.getBoundingClientRect().height > 100)
    {
        scene.insertAdjacentText("afterend", "...");

        while (text.getBoundingClientRect().height > 100) scene.innerText = scene.innerText.slice(0, -1);
    }

    const dataCall = async value => await ipcRenderer.invoke("eval", `unsavedScenePrompts.find(item => item.id === ${parentID}).doneCall(${value})`);

    save.addEventListener("click", () => dataCall(1));
    dont.addEventListener("click", () => dataCall(2));
    cancel.addEventListener("click", () => window.close());
};