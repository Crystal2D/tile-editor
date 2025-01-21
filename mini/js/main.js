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

    const script = document.createElement("script");
            
    script.src = `../${decodeURIComponent(URLSearch.get("js-src"))}.js`;
    script.type = "text/javascript";
    script.async = true;
    
    document.body.append(script);

    await new Promise(resolve => script.addEventListener("load", () => requestAnimationFrame(resolve)));

    ipcRenderer.invoke("eval", `minis.find(item => item.parentID === ${window.parentID} && item.id === ${JSON.stringify(window.miniID)}).loadCall()`);
};