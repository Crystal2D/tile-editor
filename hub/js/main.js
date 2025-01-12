window.onload = async () => {
    MenuManager.Init();
    MenuManager.SetMinY(27);

    ProjectManager.Init();

    window.addEventListener("resize", () => MenuManager.CloseContextMenus());
    window.addEventListener("blur", () => MenuManager.CloseContextMenus());

    const docsDir = await ipcRenderer.invoke("GetPath", "documents");
    importBtn.addEventListener("click", async () => {
        const dir = await ipcRenderer.invoke("SelectFolder", docsDir, {
            title: "Select Project Directory",
            buttonLabel: "Import"
        });

        if (dir.canceled) return;

        ProjectManager.Add(dir.path);
    });
};