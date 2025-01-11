let loaded = false;
let tabFocused = false;
let mouse = 0;
let layers = [];
let onDragDrop = () => { };

let content = null;
let focused = null;
let dragging = null;
let scenename = null;
let onContext = null;
let copyBuffer = null;

class Layer
{
    #pos = 0;

    #index = null;
    #data = null;
    #gridData = null;
    #gridComponent = null;
    #label = null;
    #visibility = null;

    item = null;

    get index ()
    {
        return this.#index;
    }

    set index (value)
    {
        if (this.#index === value) return;

        this.#index = value;

        SceneView.Refract(`SceneBank.SetOrdering(${this.#data.id}, ${value})`);
    }

    get objID ()
    {
        return this.#data.id;
    }

    get name ()
    {
        return this.#data.name.slice(5);
    }

    set name (value)
    {
        this.#data.name = `tile_${value}`;

        this.#label.textContent = value;
    }

    get active ()
    {
        return this.#data.active ?? true;
    }

    set active (value)
    {
        this.#data.active = value;

        SceneView.Refract(`SceneBank.FindByID(${this.#data.id}).SetActive(${value})`);
    }

    get position ()
    {
        return {
            x: this.#gridData.transform?.position?.x ?? 0,
            y: this.#gridData.transform?.position?.y ?? 0
        };
    }

    get scale ()
    {
        const scale = this.#gridData.transform?.scale;

        if (scale == null) return { x: 1, y: 1 };

        return {
            x: scale.x ?? 0,
            y: scale.y ?? 0
        };
    }

    get cellSize ()
    {
        const cellSize = this.#gridComponent.cellSize;

        if (cellSize == null) return { x: 0.5, y: 0.5 };

        return {
            x: cellSize.x ?? 0,
            y: cellSize.y ?? 0
        };
    }

    get cellGap ()
    {
        return {
            x: this.#gridComponent.cellGap?.x ?? 0,
            y: this.#gridComponent.cellGap?.y ?? 0
        };
    }

    get dockPos ()
    {
        return this.#pos;
    }

    set dockPos (value)
    {
        this.#pos = value;
        this.item.style.top = `${value}px`;
    }

    get hidden ()
    {
        const tilemap = this.#data.components.find(item => item.type === "Tilemap");

        return tilemap.args?.color?.a === 0;
    }

    set hidden (value)
    {
        const tilemap = this.#data.components.find(item => item.type === "Tilemap");

        if ((tilemap.args?.color?.a === 0) === value) return;

        this.#label.style.opacity = value ? 0.5 : 1;
        this.#label.style.fontStyle = value ? "italic" : "";
        this.#visibility.src = `img/eye/${value ? "hidden" : "shown"}.svg`;

        if (tilemap.args == null) tilemap.args = { };
        if (tilemap.args.color == null) tilemap.args.color = {
            r: 255,
            g: 255,
            b: 255
        };

        if (tilemap.args.color.a == null) tilemap.args.color.a = 255;

        if (value)
        {
            tilemap.args.color.trueA = tilemap.args.color.a;
            tilemap.args.color.a = 0;

            SceneView.Refract(`const tilemap = SceneBank.FindByID(${this.#data.id}).GetComponent("Tilemap"); tilemap.color = new Color(tilemap.color.r, tilemap.color.g, tilemap.color.b, 0)`);

            return;
        }

        tilemap.args.color.a = tilemap.args.color.trueA;
        tilemap.args.color.trueA = undefined;

        SceneView.Refract(`const tilemap = SceneBank.FindByID(${this.#data.id}).GetComponent("Tilemap"); tilemap.color = new Color(tilemap.color.r, tilemap.color.g, tilemap.color.b, ${tilemap.args.color.a / 255})`);
    }

    get sortingLayer ()
    {
        const tilemap = this.#data.components.find(item => item.type === "Tilemap");

        return tilemap.args?.sortingLayer ?? 0;
    }

    set sortingLayer (value)
    {
        const tilemap = this.#data.components.find(item => item.type === "Tilemap");

        if ((tilemap.args?.sortingLayer ?? 0) === value) return;

        if (tilemap.args == null) tile.args = { };

        tilemap.args.sortingLayer = value;

        SceneView.Refract(`SceneBank.FindByID(${this.#data.id}).GetComponent("Tilemap").sortingLayer = ${value}`);
    }

    get sortingOrder ()
    {
        const tilemap = this.#data.components.find(item => item.type === "Tilemap");

        return tilemap.args?.sortingOrder ?? 0;
    }

    set sortingOrder (value)
    {
        const tilemap = this.#data.components.find(item => item.type === "Tilemap");

        if ((tilemap.args?.sortingOrder ?? 0) === value) return;

        if (tilemap.args == null) tile.args = { };

        tilemap.args.sortingOrder = value;

        SceneView.Refract(`SceneBank.FindByID(${this.#data.id}).GetComponent("Tilemap").sortingOrder = ${value}`);
    }

    constructor (data, gridData)
    {
        this.#data = data;
        this.#gridData = gridData;
        this.#gridComponent = gridData.components.find(item => item.type === "Grid").args ?? { };

        this.item = document.createElement("div");
        this.item.classList.add("item");

        this.item.setAttribute("draggable", true);
        this.item.setAttribute("focused", 0);

        let cancelSelect = false;
        let cancelDrag = false;

        this.item.addEventListener("mouseover", () => onContext = () => {
            const paste = new MenuShortcutItem("Paste", "Ctrl+V", () => {
                MenuManager.CloseContextMenus();
                
                PasteLayer();
            });
            paste.enabled = copyBuffer != null;

            new ContextMenu(
                [
                    new MenuItem(this.hidden ? "Show" : "Hide", () => {
                        MenuManager.CloseContextMenus();

                        this.hidden = !this.hidden;
                    }),
                    new MenuLine(),
                    new MenuShortcutItem("Copy", "Ctrl+C", () => {
                        MenuManager.CloseContextMenus();

                        this.Copy();
                    }),
                    new MenuShortcutItem("Cut", "Ctrl+X", () => {
                        MenuManager.CloseContextMenus();

                        this.Cut();
                    }),
                    paste,
                    new MenuShortcutItem("Duplicate", "Ctrl+D", () => {
                        MenuManager.CloseContextMenus();

                        this.Duplicate();
                    }),
                    new MenuShortcutItem("Delete", "Del", () => {
                        MenuManager.CloseContextMenus();
                        
                        this.Delete();
                    }),
                    new MenuLine(),
                    new MenuShortcutItem("New Layer", "Ctrl+Shift+N", () => {
                        MenuManager.CloseContextMenus();
        
                        SceneManager.NewLayer();
                    })
                ],
                {
                    posX: Input.MouseX(),
                    posY: Input.MouseY(),
                    width: 185
                }
            );
        });
        this.item.addEventListener("mouseout", () => onContext = null);
        this.item.addEventListener("mousedown", event => {
            if (event.button !== 0) return;

            if (cancelSelect)
            {
                cancelSelect = false;

                return;
            }

            this.Focus();
            
        });
        this.item.addEventListener("dragstart", event => {
            event.preventDefault();

            if (cancelDrag)
            {
                cancelDrag = false;

                return;
            }

            mouse = Input.MouseY();
            Input.SetCursor("grabbing");

            onDragDrop = () => this.#OnDrop();

            dragging = this;
        });

        const hidden = this.hidden;

        this.#label = document.createElement("div");
        this.#label.classList.add("label");
        this.#label.append(this.name);
        this.#label.style.opacity = hidden ? 0.5 : 1;
        this.#label.style.fontStyle = hidden ? "italic" : "";

        this.#visibility = document.createElement("img");
        this.#visibility.classList.add("visibility");
        this.#visibility.src = `img/eye/${hidden ? "hidden" : "shown"}.svg`;

        this.#visibility.addEventListener("mousedown", event => {
            if (event.button !== 0) return;

            cancelSelect = true;
            cancelDrag = true;

            this.hidden = !this.hidden;
        });

        this.item.append(this.#label, this.#visibility);

        const index = layers.length;
        this.dockPos = index * 24;

        layers.push(this);

        Loop.Append(() => { if (SceneManager.IsLoaded()) requestAnimationFrame(() => this.index = index); }, null, () => SceneManager.IsLoaded());
    }

    #OnDrop ()
    {
        if (dragging == null) return;

        if (this.dockPos > this.index * 24 + 6)
        {
            layers[this.index + 1].index--;
            this.index++;
        }
        else if (this.dockPos < this.index * 24 - 6)
        {
            layers[this.index - 1].index++;
            this.index--;
        }

        layers.sort((a, b) => a.index - b.index);

        if (this.index > 0) layers[this.index - 1].dockPos = layers[this.index - 1].index * 24;
        if (this.index < layers.length - 1) layers[this.index + 1].dockPos = layers[this.index + 1].index * 24;

        this.dockPos = this.index * 24;
        Input.ResetCursor();
        
        dragging = null;
    }

    #DupeGrid ()
    {
        return {
            position: this.position,
            scale: this.scale,
            cellSize: this.cellSize,
            cellGap: this.cellGap
        };
    }

    Focus ()
    {
        if (focused === this) return;

        focused?.item.setAttribute("focused", 0);
        this.item.setAttribute("focused", 1);

        SceneView.Refract("GameObject.FindComponents(\"MainInput\")[0].Deselect()");

        focused = this;
        SceneView.Refract(`SceneModifier.FocusGrid(${this.#gridData.id}); SceneModifier.FocusTilemap(${this.#data.id})`);

        this.item.scrollIntoViewIfNeeded();
    }

    Delete ()
    {
        const procedingLayers = layers.filter((item, index) => index > this.index);

        for (let i = 0; i < procedingLayers.length; i++)
        {
            procedingLayers[i].index--;
            procedingLayers[i].dockPos = procedingLayers[i].index * 24;
        }

        this.item.remove();
        layers.splice(this.index, 1);

        if (focused === this) SceneView.Refract("SceneModifier.UnfocusGrid()");

        const onlyChild = SceneManager.GetGridChildren(this.#gridData.id).length === 1;

        SceneManager.DestroyObject(this.objID);

        if (onlyChild) SceneManager.DestroyObject(this.#gridData.id);
    }

    Copy ()
    {
        copyBuffer = {
            layer: this,
            data: this.#data,
            clear: false
        };
    }

    Cut ()
    {
        this.Copy();
        this.Delete();
    }

    Duplicate ()
    {
        this.Copy();

        copyBuffer.clear = true;

        PasteLayer();
    }

    SetPosition (x, y)
    {
        if (x === this.position.x && y === this.position.y) return;

        const grid = this.#DupeGrid();
        grid.position = { x: x, y: y };

        const gridData = SceneManager.FindGrid(grid);

        if (gridData != null && gridData !== this.#gridData)
        {
            this.#data.parent = gridData.id;

            SceneView.Refract(`SceneModifier.ChangeParent(${this.#data.id}, ${gridData.id})`);

            SceneManager.DestroyObject(this.#gridData.id);

            this.#gridData = gridData;
            this.#gridComponent = this.#gridData.components.find(item => item.type === "Grid").args ?? { };

            SceneView.Refract(`SceneModifier.FocusGrid(${this.#gridData.id})`);

            return;
        }

        if (SceneManager.GetGridChildren(this.#gridData.id).length === 1)
        {
            if (this.#gridData.transform == null) this.#gridData.transform = { };
        
            this.#gridData.transform.position = {
                x: x,
                y: y
            };

            SceneView.Refract(`SceneBank.FindByID(${this.#gridData.id}).transform.position = new Vector2(${x}, ${y})`);

            return;
        }

        this.#gridData = SceneManager.FindGrid(grid) ?? SceneManager.NewGrid(grid);
        this.#gridComponent = this.#gridData.components.find(item => item.type === "Grid").args ?? { };
        this.#data.parent = this.#gridData.id;

        requestAnimationFrame(() => SceneView.Refract(`SceneModifier.ChangeParent(${this.#data.id}, ${this.#gridData.id}); SceneModifier.FocusGrid(${this.#gridData.id})`));
    }

    SetScale (x, y)
    {
        if (x === this.scale.x && y === this.scale.y) return;

        const grid = this.#DupeGrid();
        grid.scale = { x: x, y: y };

        const gridData = SceneManager.FindGrid(grid);

        if (gridData != null && gridData !== this.#gridData)
        {
            this.#data.parent = gridData.id;

            SceneView.Refract(`SceneModifier.ChangeParent(${this.#data.id}, ${gridData.id})`);

            SceneManager.DestroyObject(this.#gridData.id);

            this.#gridData = gridData;
            this.#gridComponent = this.#gridData.components.find(item => item.type === "Grid").args ?? { };

            SceneView.Refract(`SceneModifier.FocusGrid(${this.#gridData.id})`);

            return;
        }

        if (SceneManager.GetGridChildren(this.#gridData.id).length === 1)
        {
            if (this.#gridData.transform == null) this.#gridData.transform = { };
        
            this.#gridData.transform.scale = {
                x: x,
                y: y
            };

            SceneView.Refract(`SceneBank.FindByID(${this.#gridData.id}).transform.scale = new Vector2(${x}, ${y})`);

            return;
        }

        this.#gridData = SceneManager.FindGrid(grid) ?? SceneManager.NewGrid(grid);
        this.#gridComponent = this.#gridData.components.find(item => item.type === "Grid").args ?? { };
        this.#data.parent = this.#gridData.id;
        
        requestAnimationFrame(() => SceneView.Refract(`SceneModifier.ChangeParent(${this.#data.id}, ${this.#gridData.id}); SceneModifier.FocusGrid(${this.#gridData.id})`));
    }

    SetCellSize (x, y)
    {
        if (x === this.cellSize.x && y === this.cellSize.y) return;

        const grid = this.#DupeGrid();
        grid.cellSize = { x: x, y: y };

        const gridData = SceneManager.FindGrid(grid);

        if (gridData != null && gridData !== this.#gridData)
        {
            this.#data.parent = gridData.id;

            SceneView.Refract(`SceneModifier.ChangeParent(${this.#data.id}, ${gridData.id})`);

            SceneManager.DestroyObject(this.#gridData.id);

            this.#gridData = gridData;
            this.#gridComponent = this.#gridData.components.find(item => item.type === "Grid").args ?? { };

            SceneView.Refract(`SceneModifier.FocusGrid(${this.#gridData.id})`);

            return;
        }

        if (SceneManager.GetGridChildren(this.#gridData.id).length === 1)
        {
            this.#gridComponent.cellSize = {
                x: x,
                y: y
            };

            SceneView.Refract(`SceneBank.FindByID(${this.#gridData.id}).GetComponent("Grid").cellSize = new Vector2(${x}, ${y})`);

            return;
        }

        this.#gridData = SceneManager.FindGrid(grid) ?? SceneManager.NewGrid(grid);
        this.#gridComponent = this.#gridData.components.find(item => item.type === "Grid").args ?? { };
        this.#data.parent = this.#gridData.id;

        requestAnimationFrame(() => SceneView.Refract(`SceneModifier.ChangeParent(${this.#data.id}, ${this.#gridData.id}); SceneModifier.FocusGrid(${this.#gridData.id})`));
    }

    SetCellGap (x, y)
    {
        if (x === this.cellGap.x && y === this.cellGap.y) return;

        const grid = this.#DupeGrid();
        grid.cellGap = { x: x, y: y };

        const gridData = SceneManager.FindGrid(grid);

        if (gridData != null && gridData !== this.#gridData)
        {
            this.#data.parent = gridData.id;

            SceneView.Refract(`SceneModifier.ChangeParent(${this.#data.id}, ${gridData.id})`);

            SceneManager.DestroyObject(this.#gridData.id);

            this.#gridData = gridData;
            this.#gridComponent = this.#gridData.components.find(item => item.type === "Grid").args ?? { };

            SceneView.Refract(`SceneModifier.FocusGrid(${this.#gridData.id})`);

            return;
        }

        if (SceneManager.GetGridChildren(this.#gridData.id).length === 1)
        {
            this.#gridComponent.cellGap = {
                x: x,
                y: y
            };

            SceneView.Refract(`SceneBank.FindByID(${this.#gridData.id}).GetComponent("Grid").cellGap = new Vector2(${x}, ${y})`);

            return;
        }

        this.#gridData = SceneManager.FindGrid(grid) ?? SceneManager.NewGrid(grid);
        this.#gridComponent = this.#gridData.components.find(item => item.type === "Grid").args ?? { };
        this.#data.parent = this.#gridData.id;

        requestAnimationFrame(() => SceneView.Refract(`SceneModifier.ChangeParent(${this.#data.id}, ${this.#gridData.id}); SceneModifier.FocusGrid(${this.#gridData.id})`));
    }
}

function Selection ()
{
    return focused;
}

function SetSceneName (name)
{
    scenename = name;
}

async function PasteLayer ()
{
    if (copyBuffer == null) return;

    const tilemapBase = copyBuffer.data.components.find(item => item.type === "Tilemap");

    if (tilemapBase.args == null) tilemapBase.args = { };
    if (tilemapBase.args.tiles == null) tilemapBase.args.tiles = [];

    const colorBase = tilemapBase.args.color ?? { };

    const tilemapData = {
        type: "Tilemap",
        args: {
            tiles: [],
            color: {
                r: colorBase.r ?? 255,
                g: colorBase.g ?? 255,
                b: colorBase.b ?? 255,
                a: colorBase.a ?? 255
            }
        }
    };
    
    if (colorBase.trueA != null) tilemapData.args.color.trueA = colorBase.trueA;

    for (let i = 0; i < tilemapBase.args.tiles.length; i++)
    {
        const tile = tilemapBase.args.tiles[i];

        tilemapData.args.tiles.push({
            palette: tile.palette,
            spriteID: tile.spriteID,
            position: {
                x: tile.position.x,
                y: tile.position.y
            }
        });
    }

    let objID = 0;

    const activeScene = SceneManager.GetActiveScene();
    
    while (activeScene.gameObjects.find(item => item.id === objID) != null) objID++;

    let objName = copyBuffer.data.name;
    let nameIndex = objName.match(/ \(\d+\)$/);

    if (nameIndex != null)
    {
        objName = objName.slice(0, -nameIndex[0].length);
        nameIndex = parseInt(nameIndex[0].slice(2, -1));
    }
    else nameIndex = 0;

    const nameRegex = new RegExp(`(${objName}) \\(\\d+\\)$`);

    const nameMatches = activeScene.gameObjects.filter(item => item.name.match(nameRegex) != null || item.name === objName).map(item => parseInt((item.name.match(/ \(\d+\)$/) ?? [" (0)"])[0].slice(2, -1)));
    nameMatches.sort((a, b) => a - b);

    for (let i = 0; i < nameMatches.length; i++)
    {
        if (nameMatches[i] < nameIndex) continue;

        if (nameMatches[i] - nameIndex === 0)
        {
            nameIndex++;

            continue;
        }

        nameIndex = nameMatches[i - 1] + 1;

        break;
    }

    const grid = {
        position: { x: copyBuffer.layer.position.x, y: copyBuffer.layer.position.y },
        scale: { x: copyBuffer.layer.scale.x, y: copyBuffer.layer.scale.y },
        cellSize: { x: copyBuffer.layer.cellSize.x, y: copyBuffer.layer.cellSize.y },
        cellGap: { x: copyBuffer.layer.cellGap.x, y: copyBuffer.layer.cellGap.y }
    };
    let gridData = SceneManager.FindGrid(grid) ?? SceneManager.NewGrid(grid);

    const tilemap = {
        name: nameIndex === 0 ? objName : `${objName} (${nameIndex})`,
        id: objID,
        parent: gridData.id,
        components: [ tilemapData ]
    };

    activeScene.gameObjects.push(tilemap);

    SceneView.Refract(`SceneInjector.GameObject(${JSON.stringify(tilemap)})`);

    await new Promise(resolve => requestAnimationFrame(resolve));

    const layer = new Layer(tilemap, gridData);
    dock.querySelector(".layers")?.append(layer.item);

    layer.Focus();

    if (copyBuffer.clear) copyBuffer = null;
}

function Init ()
{
    if (loaded) return;

    Input.OnMouseUp().Add(() => onDragDrop());

    Loop.Append(() => Update());

    loaded = true;
}

function Update ()
{
    if (!tabFocused) return;
    
    if (Input.GetKey(KeyCode.Ctrl) && Input.GetKey(KeyCode.Shift) && Input.GetKeyDown(KeyCode.N)) SceneManager.NewLayer();
    if (Input.GetKey(KeyCode.Ctrl) && Input.GetKeyDown(KeyCode.V)) PasteLayer();

    if (focused != null)
    {
        if (Input.GetKey(KeyCode.Ctrl) && Input.GetKeyDown(KeyCode.C)) focused.Copy();
        if (Input.GetKey(KeyCode.Ctrl) && Input.GetKeyDown(KeyCode.X)) focused.Cut();
        if (Input.GetKey(KeyCode.Ctrl) && Input.GetKeyDown(KeyCode.D)) focused.Duplicate();
        if (Input.GetKeyDown(KeyCode.Delete)) focused.Delete();
    }

    if (dragging != null)
    {
        if (dragging.dockPos <= (dragging.index - 1) * 24 && dragging.index > 0)
        {
            const switchee = layers[dragging.index - 1];

            switchee.index++;
            switchee.dockPos = switchee.index * 24;

            dragging.index--;

            layers.sort((a, b) => a.index - b.index);
        }

        if (dragging.dockPos >= (dragging.index + 1) * 24 && dragging.index < layers.length - 1)
        {
            const switchee = layers[dragging.index + 1];

            switchee.index--;
            switchee.dockPos = switchee.index * 24;

            dragging.index++;

            layers.sort((a, b) => a.index - b.index);
        }

        const mouseOld = mouse;
        mouse = Math.max(Math.min(Input.MouseY(), content.getBoundingClientRect().top + (layers.length * 24)), content.getBoundingClientRect().top);
        const delta = mouse - mouseOld;

        dragging.dockPos = Math.max(Math.min(dragging.dockPos + delta, (layers.length - 1) * 24), 0);

        if (dragging.dockPos < dragging.index * 24)
        {
            if (dragging.index > 0) layers[dragging.index - 1].dockPos -= delta;

            if (dragging.index < layers.length - 1) layers[dragging.index + 1].dockPos = layers[dragging.index + 1].index * 24;
        }

        if (dragging.dockPos > dragging.index * 24)
        {
            if (dragging.index > 0) layers[dragging.index - 1].dockPos = layers[dragging.index - 1].index * 24;

            if (dragging.index < layers.length - 1) layers[dragging.index + 1].dockPos -= delta;
        }
    }
}

function DrawUI ()
{
    tabFocused = true;

    const sceneName = Dock.Label(scenename);
    sceneName.style.fontWeight = "bold";
    sceneName.style.fontSize = "14px";
    sceneName.style.paddingBottom = "8px";
    sceneName.style.color = "rgb(210, 210, 210)";
    sceneName.style.whiteSpace = "nowrap";
    sceneName.style.overflow = "clip";
    sceneName.style.textOverflow = "ellipsis";
    sceneName.style.margin = "6px 12px";
    sceneName.style.marginBottom = "0";

    content = Dock.ContainerStart();
    content.classList.add("layers");

    for (let i = 0; i < layers.length; i++) Dock.AddContent(layers[i].item);

    Dock.ContainerEnd();
}

function OnContext ()
{
    if (onContext != null)
    {
        onContext();

        return;
    }

    const paste = new MenuShortcutItem("Paste", "Ctrl+V", () => {
        MenuManager.CloseContextMenus();
        
        PasteLayer();
    });
    paste.enabled = copyBuffer != null;

    new ContextMenu(
        [
            paste,
            new MenuLine(),
            new MenuShortcutItem("New Layer", "Ctrl+Shift+N", () => {
                MenuManager.CloseContextMenus();

                SceneManager.NewLayer();
            })
        ],
        {
            posX: Input.MouseX(),
            posY: Input.MouseY(),
            width: 185
        }
    )
}

function OnClear ()
{
    tabFocused = false;
}

function GetOrdering ()
{
    return layers.map(item => item.objID);
}


module.exports = {
    Layer,
    Selection,
    SetSceneName,
    Init,
    DrawUI,
    OnContext,
    OnClear,
    GetOrdering
};