window.onload = async () => {
    MenuManager.Init();
    MenuManager.SetMinY(27);

    ProjectManager.Init();

    window.addEventListener("resize", () => { MenuManager.CloseContextMenus(); });

    const docsDir = await ipcRenderer.invoke("GetPath", "documents");
    importBtn.addEventListener("click", async () => {
        const dir = await ipcRenderer.invoke("OpenFolder", docsDir);

        if (dir.cancelled) return;

        ProjectManager.Add(dir.path);
    });
};