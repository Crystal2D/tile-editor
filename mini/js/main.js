window.onload = async () => {
    const URLSearch = new URLSearchParams(window.location.search);
    window.windowID = parseInt(decodeURIComponent(URLSearch.get("window-id")));
    window.parentID = parseInt(decodeURIComponent(URLSearch.get("parent-id")));

    MenuManager.Init();
    window.addEventListener("resize", () => MenuManager.CloseContextMenus());
    window.addEventListener("blur", () => MenuManager.CloseContextMenus());

    UI.Init();

    const style = document.createElement("link");

    style.rel = "stylesheet";
    style.href = `../${decodeURIComponent(URLSearch.get("css-src"))}.css`;
    style.type = "text/css";

    document.head.append(style);

    const script = document.createElement("script");
            
    script.src = `../${decodeURIComponent(URLSearch.get("js-src"))}.js`;
    script.type = "text/javascript";
    
    document.body.append(script);
};