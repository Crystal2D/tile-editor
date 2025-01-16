let SceneView = null;

window.RefractBack = data => eval(data);

window.onload = async () => {
    const URLSearch = new URLSearchParams(window.location.search);
    window.windowID = parseInt(decodeURIComponent(URLSearch.get("windowID")));

    LoadingScreen.Set();
    LoadingScreen.Enable();
    LoadingScreen.SetText("Fetching Data");

    await ProjectManager.Init(decodeURIComponent(URLSearch.get("dir")));

    window.addEventListener("resize", () => MenuManager.CloseContextMenus());
    window.addEventListener("blur", () => MenuManager.CloseContextMenus());

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
                    // new MenuItem("Project Settings"),
                    // new MenuItem("Build Settings", () => {
                    //     // MenuManager.UnfocusBar();
                    //     // MenuManager.CloseContextMenus();

                    //     // ipcRenderer.invoke("CreateWindow", {
                    //     //     name : "Build Settings",
                    //     //     width : 400,
                    //     //     height : 300,
                    //     //     src : "windows/build/index.html"
                    //     // });
                    // }),
                    // new MenuLine(),
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

            const undo = new MenuShortcutItem("Undo", "Ctrl+Z", () => {
                MenuManager.UnfocusBar();
                MenuManager.CloseContextMenus();

                ActionManager.Undo();
            });
            undo.enabled = ActionManager.IsUndoable();

            const redo = new MenuShortcutItem("Redo", "Ctrl+Shift+Z", () => {
                MenuManager.UnfocusBar();
                MenuManager.CloseContextMenus();

                ActionManager.Redo();
            });
            redo.enabled = ActionManager.IsRedoable();

            new ContextMenu(    
                [
                    undo,
                    redo   
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
                    new MenuShortcutItem("New Scene", "Ctrl+N", () => {
                        MenuManager.UnfocusBar();
                        MenuManager.CloseContextMenus();

                        SceneManager.NewScene();
                    }),
                    new MenuShortcutItem("Open Scene", "Ctrl+O", () => {
                        MenuManager.UnfocusBar();
                        MenuManager.CloseContextMenus();

                        SceneManager.OpenScene();
                    }),
                    new MenuLine(),
                    new MenuShortcutItem("Save", "Ctrl+S", () => {
                        MenuManager.UnfocusBar();
                        MenuManager.CloseContextMenus();

                        SceneManager.Save();
                    }),
                    new MenuShortcutItem("Save As", "Ctrl+Shift+S", () => {
                        MenuManager.UnfocusBar();
                        MenuManager.CloseContextMenus();

                        SceneManager.SaveAs();
                    }),
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
    await Palette.Init();

    const layers = Dock.AddTab("Layers");
    const inspector = Dock.AddTab("Inspector");
    const palette = Dock.AddTab("Palette");

    layers.Bind(() => Layers.DrawUI(), () => Layers.OnContext(), () => Layers.OnClear());
    inspector.Bind(() => Inspector.DrawUI(), null, () => Inspector.OnClear());
    palette.Bind(() => Palette.DrawUI(), null, () => Palette.OnClear());

    Loop.Append(() => {
        if (!SceneManager.IsLoaded() || LoadingScreen.IsEnabled()) return;

        if (Input.OnCtrl(KeyCode.Z)) ActionManager.Undo();
        if (Input.OnCtrlShift(KeyCode.Z)) ActionManager.Redo();

        if (Input.OnCtrl(KeyCode.N)) SceneManager.NewScene();
        if (Input.OnCtrl(KeyCode.O)) SceneManager.OpenScene();

        if (Input.OnCtrl(KeyCode.S)) SceneManager.Save();
        if (Input.OnCtrlShift(KeyCode.S)) SceneManager.SaveAs();
    });

    const paletteResources = Palette.GetResources();
    let paletteCounterA = 0;
    let paletteCounterB = 0;

    SceneView.onResourceLoad.Add(() => paletteCounterA++);
    SceneView.onLoad.Add(() => SceneView.Refract(`SceneInjector.Resources(...${JSON.stringify(paletteResources)})`));

    Palette.PaletteView().onResourceLoad.Add(() => paletteCounterB++);
    Palette.PaletteView().onLoad.Add(() => Palette.PaletteView().Refract(`SceneInjector.Resources(...${JSON.stringify(paletteResources)})`));

    await new Promise(resolve => Loop.Append(() => {
        if (paletteCounterA === paletteResources.length && paletteCounterB === paletteResources.length)
        {
            resolve();

            return;
        }

        LoadingScreen.SetText(`Loading Resources (${Math.min(paletteCounterA, paletteCounterB) + 1}/${paletteResources.length})`);
    }, null, () => paletteCounterA === paletteResources.length && paletteCounterB === paletteResources.length));

    await SceneManager.Load(ProjectManager.GetEditorData().scene);

    window.addEventListener("resize", () => SceneView.RecalcSize());
};