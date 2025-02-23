let viewerFPS = {
    main: 0,
    palette: 0
};
let forceDOMClose = false;

let SceneView = null;

window.RefractBack = data => eval(data);
window.onload = async () => {
    const URLSearch = new URLSearchParams(window.location.search);
    window.windowID = parseInt(decodeURIComponent(URLSearch.get("window-id")));

    LoadingScreen.Set(decodeURIComponent(URLSearch.get("project-name")));
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

            const save = new MenuShortcutItem("Save", "Ctrl+S", () => {
                MenuManager.UnfocusBar();
                MenuManager.CloseContextMenus();

                SceneManager.Save();
            });
            save.enabled = SceneManager.IsEdited();
            
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
                    save,
                    new MenuShortcutItem("Save As", "Ctrl+Shift+S", () => {
                        MenuManager.UnfocusBar();
                        MenuManager.CloseContextMenus();

                        SceneManager.SaveAs();
                    }),
                    new MenuLine(),
                    new MenuItem("Scene Settings", async () => {
                        MenuManager.UnfocusBar();
                        MenuManager.CloseContextMenus();

                        if (SceneManager.AreSettingsOpen()) return;

                        const buildRequest = await fetch(`${ProjectManager.ProjectDir()}\\data\\build.json`);
                        const buildData = await buildRequest.json();

                        await ipcRenderer.invoke(
                            "OpenMini",
                            "Scene Settings",
                            window.windowID,
                            "scene-settings",
                            "SceneSettings/main",
                            "SceneSettings/styles",
                            `partioning-max-depth=${buildData.partioningMaxDepth}`
                        );

                        SceneManager.SetSettingsOpened(true);
                        SceneManager.RedrawSettings();
                    })
                ],
                {
                    posX : 85,
                    width : 180
                }
            )
        }
    );
    MenuManager.AddToBar(
        "Texture Viewer",
        async () => {
            MenuManager.UnfocusBar();
            MenuManager.CloseContextMenus();

            await ipcRenderer.invoke(
                "OpenMini",
                "Texture Viewer",
                window.windowID,
                "texture-viewer",
                "TextureViewer/main",
                "TextureViewer/styles",
                `dir=${ProjectManager.ProjectDir()}`
            );
        },
        () => MenuManager.CloseContextMenus()
    );

    Footer.Set();

    const footerCamera = new FooterItem("camera", false, "camera.svg");
    new FooterItem("rect", false, "rect.svg");
    new FooterItem("cursor", false, "cursor.svg");

    const footerTiles = new FooterItem("tiles", true);
    const footerFPS = new FooterItem("fps", true);

    SceneView = new Refractor.Embed(scene);

    window.addEventListener("resize", () => SceneView.RecalcSize());

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

        if (Input.OnCtrl(KeyCode.S) && SceneManager.IsEdited()) SceneManager.Save();
        if (Input.OnCtrlShift(KeyCode.S)) SceneManager.SaveAs();
    });

    footerFPS.visible = true;

    Loop.Append(() => {
        const mainFPS = (Loop.targetFrameRate > 0 && Loop.vSyncCount === 0) ? Math.min(
            1 / (Loop.deltaTime || Loop.maximumDeltaTime),
            Loop.targetFrameRate
        ) : 1 / (Loop.deltaTime || Loop.maximumDeltaTime)

        footerFPS.text = `FPS: ${parseInt((mainFPS + viewerFPS.main + viewerFPS.palette) / 3)}`;
    }, 0.5)

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

    footerCamera.visible = true;
    footerTiles.visible = true;

    return;

    window.addEventListener("beforeunload", async event => {
        if (forceDOMClose) return;

        if (SceneManager.IsEdited())
        {
            event.preventDefault();

            const prompt = await ipcRenderer.invoke("UnsavedPrompt", "Scene has unsaved changes", `scene "${SceneManager.GetActiveScene().name}"`, window.windowID);
    
            if (prompt === 0) return;
            else if (prompt === 1) await SceneManager.Save();
            
            forceDOMClose = true;
            window.close();
        }
    });
};


ipcRenderer.on("eval", (event, data) => eval(data));