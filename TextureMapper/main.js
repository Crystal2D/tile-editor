const ActionManager = require("./../js/ActionManager");


const URLSearch = new URLSearchParams(window.location.search);
const projectDir = decodeURIComponent(URLSearch.get("dir"));
let texturePath = decodeURIComponent(URLSearch.get("path"));

Refractor.SetDirectory("../");

MenuManager.AddToBar(
    "Texture",
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
                new MenuItem("Save")
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

const mapperViewWrap = document.createElement("div");
mapperViewWrap.id = "view-wrap";

UI.AddContent(mapperViewWrap);

const MapperView = new Refractor.Embed(mapperViewWrap, projectDir);
MapperView.content.addEventListener("load", () => MapperView.Refract("window.targetScene = 2"));
MapperView.onLoad.Add(async () => {
    MapperView.Refract(`(async () => {
        await SceneInjector.Resources(${JSON.stringify(texturePath)});
        await SceneInjector.GameObject(${JSON.stringify({
            name: "texture",
            id: -1,
            components: [
                {
                    type: "SpriteRenderer",
                    args: {
                        sprite: {
                            texture: texturePath
                        }
                    }
                }
            ]
        })});

        requestAnimationFrame(() => GameObject.FindComponents("MapperInput")[0].SetRenderer());
    })()`);

    await new Promise(resolve => requestAnimationFrame(resolve));
});

window.addEventListener("resize", () => MapperView.RecalcSize());

const dock = UI.ContainerStart();
dock.id = "dock";

const name = UI.TextField("Name");
name.element.id = "name";
// name.onUpdate = value => console.log(value);

UI.SectionStart("Sprite");

const position = UI.Vector2Field("Postion");
// position.fieldX.onUpdate = value => console.log(value);

const size = UI.Vector2Field("Size");
const pivot = UI.Vector2Field("Pivot");

UI.SectionEnd();

UI.ContainerEnd();


ipcRenderer.on("OnChangePath", async (event, path) => {
    if (texturePath === path) return;

    texturePath = path;
    window.miniID = `texture-mapper:${path}`;
});