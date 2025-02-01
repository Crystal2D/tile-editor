window.RefractBack = data => eval(data);
window.onload = async () => {
    const URLSearch = new URLSearchParams(window.location.search);
    window.windowID = parseInt(decodeURIComponent(URLSearch.get("window-id")));
    window.parentID = parseInt(decodeURIComponent(URLSearch.get("parent-id")));
    window.miniID = decodeURIComponent(URLSearch.get("mini-id"));

    MenuManager.Init();
    window.addEventListener("resize", () => MenuManager.CloseContextMenus());
    window.addEventListener("blur", () => MenuManager.CloseContextMenus());

    UI.Init();

    const style = document.createElement("link");

    style.rel = "stylesheet";
    style.href = `../${decodeURIComponent(URLSearch.get("css-src"))}.css`;
    style.type = "text/css";

    document.head.append(style);

    await new Promise(resolve => style.addEventListener("load", () => requestAnimationFrame(resolve)));

    await LoadScript(decodeURIComponent(URLSearch.get("js-src")));

    ipcRenderer.invoke("eval", `minis.find(item => item.parentID === ${window.parentID} && item.id === ${JSON.stringify(window.miniID)}).loadCall()`);
};

async function LoadScript (src)
{
    const script = document.createElement("script");
            
    script.src = `../${src}.js`;
    script.type = "text/javascript";
    script.async = true;
    
    document.body.append(script);

    await new Promise(resolve => script.addEventListener("load", () => requestAnimationFrame(resolve)));
}

function EvalToMain (data)
{
    ipcRenderer.invoke("eval", `
        const win = FindWindow(${window.parentID});
        
        if (win != null) win.webContents.send("eval", \`${data}\`);
    `);
}