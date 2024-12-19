let SceneView = null;

window.RefractBack = data => eval(data);

window.onload = async () => {
    await ProjectManager.Init();

    MenuManager.Init();
    MenuManager.AddToBar(
        "Project",
        focused => {
            if (!focused)
            {
                MenuManager.FocusBar();

                return;
            }
            
            MenuManager.UnfocusBar();
            MenuManager.CloseContextMenus();
        },
        () => {
            MenuManager.CloseContextMenus();

            new ContextMenu(
                [
                    new MenuItem("Project Settings"),
                    new MenuItem("Build Settings", () => {
                        // MenuManager.UnfocusBar();
                        // MenuManager.CloseContextMenus();

                        // ipcRenderer.invoke("CreateWindow", {
                        //     name : "Build Settings",
                        //     width : 400,
                        //     height : 300,
                        //     src : "windows/build/index.html"
                        // });
                    }),
                    new MenuLine(),
                    new MenuItem("Exit", () => window.close())
                ]
            );
        }
    );
    MenuManager.AddToBar(
        "Edit",
        focused => {
            if (!focused)
            {
                MenuManager.FocusBar();

                return;
            }
            
            MenuManager.UnfocusBar();
            MenuManager.CloseContextMenus();
        },
        () => {
            MenuManager.CloseContextMenus();

            new ContextMenu(    
                [
                    new MenuShortcutItem("Undo", "Ctrl+Z"),
                    new MenuShortcutItem("Redo", "Ctrl+Shift+Z")
                ],
                {
                    posX : 51,
                    width : 150
                }
            );
        }
    );
    MenuManager.AddToBar(
        "Scene",
        focused => {
            if (!focused)
            {
                MenuManager.FocusBar();

                return;
            }
            
            MenuManager.UnfocusBar();
            MenuManager.CloseContextMenus();
        },
        () => {
            MenuManager.CloseContextMenus();
            
            new ContextMenu(
                [
                    new MenuShortcutItem("New Scene", "Ctrl+N"),
                    new MenuShortcutItem("Open Scene", "Ctrl+O"),
                    new MenuLine(),
                    new MenuShortcutItem("Save", "Ctrl+S", () => {
                        MenuManager.UnfocusBar();
                        MenuManager.CloseContextMenus();

                        SceneManager.Save();
                    }),
                    new MenuShortcutItem("Save As..", "Ctrl+Shift+S"),
                    new MenuLine(),
                    new MenuItem("Scene Settings")
                ],
                {
                    posX : 85,
                    width : 180
                }
            )
        }
    );

    SceneView = new Refractor.Embed(scene);

    Dock.Init();
    Dock.OnResize().Add(() => {
        SceneView.content.style.pointerEvents = "none";
        SceneView.RecalcSize();
    });
    Dock.OnResizeEnd().Add(() => SceneView.content.style.pointerEvents = "");

    Layers.Init();
    Palette.Init();

    await SceneManager.Load(ProjectManager.GetEditorData().scene);

    const layers = Dock.AddTab("Layers");
    const inspector = Dock.AddTab("Inspector");
    const palette = Dock.AddTab("Palette");

    layers.Bind(() => Layers.DrawUI(), () => Layers.OnContext());
    inspector.Bind(() => Inspector.DrawUI(), () => Inspector.OnContext());
    palette.Bind(() => Palette.DrawUI(), () => Palette.OnContext(), () => Palette.OnClear());

    window.addEventListener("resize", () => {
        MenuManager.CloseContextMenus();
        SceneView.RecalcSize();
    });
};