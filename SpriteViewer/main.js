function EvalToMain (data)
{
    ipcRenderer.invoke("eval", `
        const win = FindWindow(${window.parentID});
        
        if (win != null) win.webContents.send("eval", \`${data}\`);
    `);
}

// window.addEventListener("beforeunload", () => EvalToMain("SceneManager.SetSettingsOpened(false)"));

const URLSearch = new URLSearchParams(window.location.search);
const projectDir = decodeURIComponent(URLSearch.get("dir"));

let resources = [];

(async () => {
    const resRequest = await fetch(`${projectDir}\\data\\resources.json`);
    resources = await resRequest.json();
})();