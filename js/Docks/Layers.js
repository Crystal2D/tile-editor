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
        const lastValue = this.#index;

        if (lastValue === value) return;

        ActionManager.Record(
            "Layer.Sort",
            () => {
                SceneManager.MarkAsEdited();
                
                this.indexNonManaged = value;
            },
            () => {
                SceneManager.MarkAsEdited();

                this.indexNonManaged = lastValue;
            }
        );
    }

    get indexNonManaged ()
    {
        return this.#index;
    }

    set indexNonManaged (value)
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
        const lastName = this.name;

        if (lastName === value) return;

        ActionManager.StartRecording("Layer.Rename");
        ActionManager.Record(
            "Layer.Rename",
            () => {
                SceneManager.MarkAsEdited();

                this.#data.name = `tile_${value}`;
                this.#label.textContent = value;
            },
            () => {
                SceneManager.MarkAsEdited();
                
                this.#data.name = `tile_${lastName}`;
                this.#label.textContent = lastName;
            }
        );
        ActionManager.StopRecording("Layer.Rename", () => Inspector.Redraw());
    }

    get active ()
    {
        return this.#data.active ?? true;
    }

    set active (value)
    {
        if (this.active === value) return;

        ActionManager.StartRecording("Layer.SetActive");
        ActionManager.Record(
            "Layer.SetActive",
            () => {
                SceneManager.MarkAsEdited();

                this.#data.active = value;
                SceneView.Refract(`SceneBank.FindByID(${this.#data.id}).SetActive(${value})`);
            },
            () => {
                SceneManager.MarkAsEdited();

                this.#data.active = !value;
                SceneView.Refract(`SceneBank.FindByID(${this.#data.id}).SetActive(${!value})`);
            }
        );
        ActionManager.StopRecording("Layer.SetActive", () => Inspector.Redraw());
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

        const setHidden = value => {
            SceneManager.MarkAsEdited();

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
        };

        ActionManager.StartRecording("Layer.Hide");
        ActionManager.Record(
            "Layer.Hide",
            () => setHidden(value),
            () => setHidden(!value)
        );
        ActionManager.StopRecording("Layer.Hide", () => Inspector.Redraw());
    }

    get sortingLayer ()
    {
        const tilemap = this.#data.components.find(item => item.type === "Tilemap");

        return tilemap.args?.sortingLayer ?? 0;
    }

    set sortingLayer (value)
    {
        const tilemap = this.#data.components.find(item => item.type === "Tilemap");
        const lastValue = tilemap.args?.sortingLayer ?? 0;

        if (lastValue === value) return;

        ActionManager.StartRecording("Layer.SortLayer");
        ActionManager.Record(
            "Layer.SortLayer",
            () => {
                SceneManager.MarkAsEdited();

                if (tilemap.args == null) tile.args = { };

                tilemap.args.sortingLayer = value;
                    
                SceneView.Refract(`SceneBank.FindByID(${this.#data.id}).GetComponent("Tilemap").sortingLayer = ${value}`);
            },
            () => {
                SceneManager.MarkAsEdited();

                if (tilemap.args == null) tile.args = { };

                tilemap.args.sortingLayer = lastValue;
                    
                SceneView.Refract(`SceneBank.FindByID(${this.#data.id}).GetComponent("Tilemap").sortingLayer = ${lastValue}`);
            }
        );
        ActionManager.StopRecording("Layer.SortLayer", () => Inspector.Redraw());
    }

    get sortingOrder ()
    {
        const tilemap = this.#data.components.find(item => item.type === "Tilemap");

        return tilemap.args?.sortingOrder ?? 0;
    }

    set sortingOrder (value)
    {
        const tilemap = this.#data.components.find(item => item.type === "Tilemap");
        const lastValue = tilemap.args?.sortingOrder ?? 0;

        if (lastValue === value) return;

        ActionManager.StartRecording("Layer.SortOrder");
        ActionManager.Record(
            "Layer.SortOrder",
            () => {
                SceneManager.MarkAsEdited();
                
                if (tilemap.args == null) tile.args = { };

                tilemap.args.sortingOrder = value;

                SceneView.Refract(`SceneBank.FindByID(${this.#data.id}).GetComponent("Tilemap").sortingOrder = ${value}`);
            },
            () => {
                SceneManager.MarkAsEdited();

                if (tilemap.args == null) tile.args = { };

                tilemap.args.sortingOrder = lastValue;
                    
                SceneView.Refract(`SceneBank.FindByID(${this.#data.id}).GetComponent("Tilemap").sortingOrder = ${lastValue}`);
            }
        );
        ActionManager.StopRecording("Layer.SortOrder", () => Inspector.Redraw());
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
                    new MenuItem("Delete", () => {
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

            ActionManager.StartRecording("Layer.Sort");

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

        Loop.Append(() => { if (SceneManager.IsLoaded()) requestAnimationFrame(() => this.indexNonManaged = index); }, null, () => SceneManager.IsLoaded());
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

    FocusBase ()
    {
        UnfocusBase();
        
        this.item.setAttribute("focused", 1);
        focused = this;

        SceneView.Refract(`SceneModifier.FocusGrid(${this.#gridData.id}); SceneModifier.FocusTilemap(${this.#data.id})`);

        this.item.scrollIntoViewIfNeeded();
    }

    Focus ()
    {
        const lastFocused = focused;

        if (lastFocused === this) return;

        ActionManager.StartRecording("Layer.Focus");
        ActionManager.Record(
            "Layer.Focus",
            () => this.FocusBase(),
            () => lastFocused != null ? lastFocused.FocusBase() : UnfocusBase()
        );
        ActionManager.StopRecording("Layer.Focus");
    }

    DeleteBase ()
    {
        SceneManager.MarkAsEdited();

        onDragDrop();

        const procedingLayers = layers.filter((item, index) => index > this.index);

        if (ActionManager.RecordExists("Layer.Sort"))
        {
            for (let i = 0; i < procedingLayers.length; i++)
            {
                procedingLayers[i].index--;
                procedingLayers[i].dockPos = procedingLayers[i].index * 24;
            }
    
            ActionManager.StopRecording("Layer.Sort", () => {
                layers.sort((a, b) => a.index - b.index);
    
                for (let i = 0; i < layers.length; i++) layers[i].dockPos = layers[i].index * 24;
            });
        }
        else
        {
            for (let i = 0; i < procedingLayers.length; i++)
            {
                procedingLayers[i].indexNonManaged--;
                procedingLayers[i].dockPos = procedingLayers[i].index * 24;
            }

            ActionManager.Record(
                "Layer.Delete",
                () => {
                    layers.sort((a, b) => a.index - b.index);
    
                    for (let i = 0; i < layers.length; i++) layers[i].dockPos = layers[i].index * 24;
                },
                () => { }
            );
        }

        this.item.remove();
        layers.splice(this.index, 1);

        if (focused === this) UnfocusBase();

        const onlyChild = SceneManager.GetGridChildren(this.#gridData.id).length === 1;

        SceneManager.DestroyObject(this.objID);

        if (onlyChild) SceneManager.DestroyObject(this.#gridData.id);

        if (layers.length === 0)
        {
            onContext = null;

            Redraw();
        }
    }

    async UndeleteBase ()
    {
        SceneManager.MarkAsEdited();

        const procedingLayers = layers.filter((item, index) => index >= this.index);

        for (let i = 0; i < procedingLayers.length; i++)
        {
            procedingLayers[i].indexNonManaged++;
            procedingLayers[i].dockPos = procedingLayers[i].index * 24;
        }

        layers.push(this);
        layers.sort((a, b) => a.index - b.index);
        
        const gridBase = {
            position: { x: this.position.x, y: this.position.y },
            scale: { x: this.scale.x, y: this.scale.y },
            cellSize: { x: this.cellSize.x, y: this.cellSize.y },
            cellGap: { x: this.cellGap.x, y: this.cellGap.y }
        };
        const gridData = SceneManager.FindGrid(gridBase) ?? SceneManager.NewGrid(gridBase);

        SceneManager.GetActiveScene().gameObjects.push(this.#data);

        await new Promise(resolve => requestAnimationFrame(resolve));

        this.#gridData = gridData;
        this.#gridComponent = gridData.components.find(item => item.type === "Grid").args ?? { };

        Redraw();

        SceneView.Refract(`(async () => { await SceneInjector.Grid(${JSON.stringify(this.#gridData)}); SceneInjector.GameObject(${JSON.stringify(this.#data)})})();`);
        
        await new Promise(resolve => requestAnimationFrame(resolve));

        this.FocusBase();
    }

    Delete ()
    {
        ActionManager.StartRecording("Layer.Delete");
        ActionManager.Record(
            "Layer.Delete",
            () => this.DeleteBase(),
            () => this.UndeleteBase()
        );
        ActionManager.StopRecording("Layer.Delete");
    }

    Copy ()
    {
        copyBuffer = {
            grid: {
                position: { x: this.position.x, y: this.position.y },
                scale: { x: this.scale.x, y: this.scale.y },
                cellSize: { x: this.cellSize.x, y: this.cellSize.y },
                cellGap: { x: this.cellGap.x, y: this.cellGap.y }
            },
            data: { name: this.#data.name },
            clear: false
        };

        const tilemapBase = this.#data.components.find(item => item.type === "Tilemap");

        if (tilemapBase.args == null) tilemapBase.args = { };
        if (tilemapBase.args.tiles == null) tilemapBase.args.tiles = [];

        const colorBase = tilemapBase.args.color ?? { };

        const tilemap = {
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

        if (colorBase.trueA != null) tilemap.args.color.trueA = colorBase.trueA;

        for (let i = 0; i < tilemapBase.args.tiles.length; i++)
        {
            const tile = tilemapBase.args.tiles[i];

            tilemap.args.tiles.push({
                palette: tile.palette,
                spriteID: tile.spriteID,
                position: {
                    x: tile.position.x,
                    y: tile.position.y
                }
            });
        }

        copyBuffer.data.tilemap = tilemap;
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
        const lastPos = { x: this.position.x, y: this.position.y };

        if (x === lastPos.x && y === lastPos.y) return;

        const setPosition = (x, y) => {
            SceneManager.MarkAsEdited();

            SceneView.Refract("GameObject.FindComponents(\"MainInput\")[0].Deselect()");

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
        };

        ActionManager.StartRecording("Layer.SetPosition");
        ActionManager.Record(
            "Layer.SetPosition",
            () => setPosition(x, y),
            () => setPosition(lastPos.x, lastPos.y)
        );
        ActionManager.StopRecording("Layer.SetPosition", () => Inspector.Redraw());
    }

    SetScale (x, y)
    {
        const lastScale = { x: this.scale.x, y: this.scale.y };

        if (x === lastScale.x && y === lastScale.y) return;

        const setScale = (x, y) => {
            SceneManager.MarkAsEdited();

            SceneView.Refract("GameObject.FindComponents(\"MainInput\")[0].Deselect()");

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
        };

        ActionManager.StartRecording("Layer.SetScale");
        ActionManager.Record(
            "Layer.SetScale",
            () => setScale(x, y),
            () => setScale(lastScale.x, lastScale.y)
        );
        ActionManager.StopRecording("Layer.SetScale", () => Inspector.Redraw());
    }

    SetCellSize (x, y)
    {
        const lastCellSize = { x: this.cellSize.x, y: this.cellSize.y };

        if (x === lastCellSize.x && y === lastCellSize.y) return;

        const setCellSize = (x, y) => {
            SceneManager.MarkAsEdited();

            SceneView.Refract("GameObject.FindComponents(\"MainInput\")[0].Deselect()");

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
        };

        ActionManager.StartRecording("Layer.SetCellSize");
        ActionManager.Record(
            "Layer.SetCellSize",
            () => setCellSize(x, y),
            () => setCellSize(lastCellSize.x, lastCellSize.y)
        );
        ActionManager.StopRecording("Layer.SetCellSize", () => Inspector.Redraw());
    }

    SetCellGap (x, y)
    {
        const lastCellGap = { x: this.cellGap.x, y: this.cellGap.y };

        if (x === lastCellGap.x && y === lastCellGap.y) return;

        const setCellGap = (x, y) => {
            SceneManager.MarkAsEdited();

            SceneView.Refract("GameObject.FindComponents(\"MainInput\")[0].Deselect()");
        
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
        };

        ActionManager.StartRecording("Layer.SetCellGap");
        ActionManager.Record(
            "Layer.SetCellGap",
            () => setCellGap(x, y),
            () => setCellGap(lastCellGap.x, lastCellGap.y)
        );
        ActionManager.StopRecording("Layer.SetCellGap", () => Inspector.Redraw());
    }
}

function Unfocus ()
{
    const lastFocused = focused;

    if (lastFocused == null) return;

    ActionManager.StartRecording("Layers.Unfocus");
    ActionManager.Record(
        "Layers.Unfocus",
        () => UnfocusBase(),
        () => lastFocused.FocusBase()
    );
    ActionManager.StopRecording("Layers.Unfocus");
}

function UnfocusBase ()
{
    if (focused == null) return;

    SceneView.Refract("GameObject.FindComponents(\"MainInput\")[0].ClearActions(); SceneModifier.UnfocusTilemap(); SceneModifier.UnfocusGrid()");

    focused?.item.setAttribute("focused", 0);

    focused = null;
    dragging = null;
    onDragDrop = () => { };
}

function Selection ()
{
    return focused;
}

function SetSceneName (name)
{
    scenename = name;

    const sceneName = dock.querySelector(".layers-scene");

    if (sceneName != null) sceneName.innerText = name;
}

async function PasteLayerBase ()
{
    if (copyBuffer == null) return;

    SceneManager.MarkAsEdited();

    const tilemapBase = copyBuffer.data.tilemap;

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

    const activeScene = SceneManager.GetActiveScene();

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

    let gridData = SceneManager.FindGrid(copyBuffer.grid) ?? SceneManager.NewGrid(copyBuffer.grid);

    await new Promise(resolve => requestAnimationFrame(resolve));

    let objID = 0;

    while (activeScene.gameObjects.find(item => item.id === objID) != null) objID++;

    const tilemap = {
        name: nameIndex === 0 ? objName : `${objName} (${nameIndex})`,
        id: objID,
        parent: gridData.id,
        components: [tilemapData]
    };

    activeScene.gameObjects.push(tilemap);

    SceneView.Refract(`SceneInjector.GameObject(${JSON.stringify(tilemap)})`);

    await new Promise(resolve => requestAnimationFrame(resolve));

    const layer = new Layer(tilemap, gridData);
    dock.querySelector(".layers")?.append(layer.item);

    if (layers.length === 1) Redraw();

    layer.FocusBase();

    if (copyBuffer.clear) copyBuffer = null;

    return layer;
}

async function PasteLayer ()
{
    const layer = await PasteLayerBase();
    let done = false;

    ActionManager.StartRecording("Layers.Paste");
    ActionManager.Record(
        "Layers.Paste",
        () => { if (done) layer.UndeleteBase(); },
        () => layer.DeleteBase()
    );
    ActionManager.StopRecording("Layers.Paste");

    done = true;
}

function Init ()
{
    if (loaded) return;

    Input.OnMouseUp().Add(() => {
        onDragDrop();

        ActionManager.StopRecording("Layer.Sort", () => {
            layers.sort((a, b) => a.index - b.index);

            for (let i = 0; i < layers.length; i++) layers[i].dockPos = layers[i].index * 24;
        });
    });

    Loop.Append(() => Update());

    loaded = true;
}

function Update ()
{
    if (!tabFocused) return;

    if (!LoadingScreen.IsEnabled())
    {
        if (Input.OnCtrlShift(KeyCode.N)) SceneManager.NewLayer();
        if (Input.OnCtrl(KeyCode.V)) PasteLayer();

        if (focused != null)
        {
            if (Input.OnCtrl(KeyCode.C)) focused.Copy();
            if (Input.OnCtrl(KeyCode.X)) focused.Cut();
            if (Input.OnCtrl(KeyCode.D)) focused.Duplicate();
        }
    }
    else if (dragging != null)
    {
        onDragDrop();

        ActionManager.StopRecording("Layer.Sort",() => {
            layers.sort((a, b) => a.index - b.index);

            for (let i = 0; i < layers.length; i++) layers[i].dockPos = layers[i].index * 24;
        });
    }

    if (dragging != null)
    {
        if (dragging.dockPos <= (dragging.index - 1) * 24 && dragging.index > 0)
        {
            const switchee = layers[dragging.index - 1];

            switchee.indexNonManaged++;
            switchee.dockPos = switchee.index * 24;

            dragging.indexNonManaged--;

            layers.sort((a, b) => a.index - b.index);
        }

        if (dragging.dockPos >= (dragging.index + 1) * 24 && dragging.index < layers.length - 1)
        {
            const switchee = layers[dragging.index + 1];

            switchee.indexNonManaged--;
            switchee.dockPos = switchee.index * 24;

            dragging.indexNonManaged++;

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

    const sceneName = document.createElement("div");
    sceneName.setAttribute("spellcheck", false);
    sceneName.classList.add("layers-scene");
    sceneName.append(scenename);
    Dock.AddContent(sceneName);

    sceneName.addEventListener("mousedown", event => { if (event.button === 0) Unfocus(); });
    sceneName.addEventListener("mouseout", () => onContext = null);
    sceneName.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;

        event.preventDefault();

        sceneName.blur();
    })
    sceneName.addEventListener("input", () => {
        sceneName.textContent = sceneName.textContent.replace(/(?:\r\n|\r|\n)/g, "");
    });
    sceneName.addEventListener("focus", () => {
        const range = document.createRange();
        range.selectNodeContents(sceneName);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    });

    const wrap = Dock.ContainerStart();
    wrap.setAttribute("renaming-scene", 0);
    wrap.classList.add("layers-wrap");

    if (layers.length > 0)
    {
        content = Dock.ContainerStart();
        content.classList.add("layers");

        content.addEventListener("mousedown", event => { if (event.button === 0 && onContext == null) Unfocus(); });

        for (let i = 0; i < layers.length; i++) Dock.AddContent(layers[i].item);

        Dock.ContainerEnd();
    }
    else Dock.Info("You got no layers o~O", "Press Ctrl+Shift+N or right click to make one");

    Dock.ContainerEnd();

    sceneName.addEventListener("mouseover", () => onContext = () => {
        const paste = new MenuShortcutItem("Paste", "Ctrl+V", () => {
            MenuManager.CloseContextMenus();
            
            PasteLayer();
        });
        paste.enabled = copyBuffer != null;

        new ContextMenu(
            [
                new MenuItem("Rename Scene", () => {
                    MenuManager.CloseContextMenus();

                    sceneName.contentEditable = "plaintext-only";
                    wrap.setAttribute("renaming-scene", 1);

                    requestAnimationFrame(() => sceneName.focus());
                }),
                new MenuLine(),
                paste,
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
    sceneName.addEventListener("blur", async () => {
        let text = sceneName.innerText.trim();

        if (text.length === 0) text = scenename;

        sceneName.innerText = text;

        sceneName.contentEditable = "false";
        wrap.setAttribute("renaming-scene", 0);

        if (text === scenename) return;

        SceneManager.RenameScene(text);
    });
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

function ClearLayers ()
{
    UnfocusBase();
    
    scenename = null;
    dragging = null;
    layers = [];
    onDragDrop = () => { };
    onContext = null;
}

function Redraw ()
{
    if (!tabFocused) return;

    Dock.Unfocus();
    Dock.FocusByIndex(0);
}

module.exports = {
    Layer,
    Selection,
    SetSceneName,
    Init,
    DrawUI,
    OnContext,
    OnClear,
    GetOrdering,
    ClearLayers,
    Unfocus,
    Redraw
};