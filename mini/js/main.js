window.onload = async () => {
    const URLSearch = new URLSearchParams(window.location.search);
    const windowID = parseInt(decodeURIComponent(URLSearch.get("window-id")));

    MenuManager.Init();

    window.addEventListener("resize", () => MenuManager.CloseContextMenus());
    window.addEventListener("blur", () => MenuManager.CloseContextMenus());
};