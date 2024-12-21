let loaded = false;
let mouse = 0;
let layers = [];
let onDragDrop = () => { };

let content = null;
let focused = null;
let dragging = null;
let scenename = null;
let onContext = null

class Layer
{
    #pos = 0;

    #data = null;
    #gridData = null;
    #gridComponent = null;
    #label = null;

    index = 0;

    item = null;

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
            const paste = new MenuShortcutItem("Paste", "Ctrl+V");
            paste.enabled = false;

            new ContextMenu(
                [
                    new MenuItem("Hide"),
                    new MenuItem("Rename"),
                    new MenuLine(),
                    new MenuShortcutItem("Copy", "Ctrl+C"),
                    new MenuShortcutItem("Cut", "Ctrl+X"),
                    paste,
                    new MenuShortcutItem("Duplicate", "Ctrl+D"),
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

        this.#label = document.createElement("div");
        this.#label.classList.add("label");
        this.#label.append(this.name);

        const visibility = document.createElement("img");
        visibility.classList.add("visibility");
        visibility.src = "img/eye/show.svg";

        visibility.addEventListener("mousedown", event => {
            if (event.button !== 0) return;

            cancelSelect = true;
            cancelDrag = true;
        });

        this.item.append(this.#label, visibility);

        this.index = layers.length;
        this.dockPos = this.index * 24;

        layers.push(this);
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
        focused?.item.setAttribute("focused", 0);
        this.item.setAttribute("focused", 1);

        focused = this;
        SceneView.Refract(`SceneModifier.FocusGrid(${this.#gridData.id}); SceneModifier.FocusTilemap(${this.#data.id})`);
    }

    Delete ()
    {
        this.item.remove();
        layers.splice(this.index, 1);

        if (focused === this) SceneView.Refract("SceneModifier.UnfocusGrid()");

        const onlyChild = SceneManager.GetGridChildren(this.#gridData.id).length === 1;

        SceneManager.DestroyObject(this.objID);

        if (onlyChild) SceneManager.DestroyObject(this.#gridData.id);
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

function Init ()
{
    if (loaded) return;

    Input.OnMouseUp().Add(() => onDragDrop());

    RequestUpdate();

    loaded = true;
}

function RequestUpdate ()
{
    requestAnimationFrame(Update.bind(this));
}

function Update ()
{
    if (dragging == null)
    {
        RequestUpdate();

        return;
    }

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

    RequestUpdate();
}

function DrawUI ()
{
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

    const paste = new MenuShortcutItem("Paste", "Ctrl+V");
    paste.enabled = false;

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


module.exports = {
    Layer,
    Selection,
    SetSceneName,
    Init,
    DrawUI,
    OnContext
};