class MainInput extends GameBehavior
{
    #transforming = false;
    #recording = false;
    #action = 0;
    #copyTime = 0;
    #existingTiles = [];
    #selection = [];

    #inputHandler = null;
    #selectionRect = null;
    #selectionRenderer = null;
    #selectionOutlineRect = null;
    #tile = null;
    #preview = null;
    #previewRenderer = null;
    #selectStart = null;
    #selectEnd = null;
    #lastTransPos = null;
    #sceneListener = null;
    #cam = null;
    #copyBuffer = null;
    #camFocus = null; 

    set tile (value)
    {
        this.#tile = value;

        if (value != null)
        {
            this.#LoadTile();

            return;
        }
        
        if (this.#preview == null) return;

        GameObject.Destroy(this.#preview);

        this.#preview = null;
        this.#previewRenderer = null;
    }

    ReloadPreview ()
    {
        if (this.#previewRenderer != null) this.#previewRenderer.Reload();
    }

    async #InjectPreview (sprite)
    {
        this.#previewRenderer = new SpriteRenderer(sprite);
        this.#previewRenderer.color = new Color(1, 1, 1, 0.5);

        let objID = null;

        do objID = Math.floor(Math.random() * 65536) + Math.floor(Math.random() * 65536);
        while (GameObject.FindByID(objID) != null)

        this.#preview = await SceneManager.CreateObject("GameObject", {
            name : "preview_tile",
            id : objID,
            active: false,
            components : [this.#previewRenderer]
        });

        const scene = SceneManager.GetActiveScene();

        this.#preview.scene = scene;

        const min = this.#previewRenderer.bounds.min;
        const max = this.#previewRenderer.bounds.max;
        const rect = Rect.MinMaxRect(min.x, min.y, max.x, max.y);

        scene.tree.Insert(this.#preview, rect);

        scene.gameObjects.push(this.#preview);
    }

    async #LoadTile ()
    {
        let palette = TilePalette.Find(this.#tile.palette);

        if (palette == null)
        {
            await TilePalette.Load(this.#tile.palette);
            palette = TilePalette.Find(this.#tile.palette);
        }

        const sprite = palette.sprites.find(item => item.id === this.#tile.spriteID).sprite;

        if (this.#preview == null) await this.#InjectPreview(sprite);
        else this.#previewRenderer.sprite = sprite;
    }

    #StartRecording ()
    {
        if (this.#recording) return;

        window.parent.RefractBack("ActionManager.StartRecording(\"Scene.TileModify\")");

        this.#recording = true;
    }

    #AlertCopied (isCut)
    {
        window.parent.RefractBack(`
            const footerItem = Footer.FindItem("copy");
            footerItem.text = "${isCut ? "CUT SELECTION!" : "COPIED SELECTION!"}";
            footerItem.visible = true;
        `);

        if (!isCut) this.#selectionRenderer.color = new Color(1, 1, 0);

        this.#copyTime = 1;
    }

    StopRecording ()
    {
        if (!this.#recording) return;

        window.parent.RefractBack("ActionManager.StopRecording(\"Scene.TileModify\")");

        this.#recording = false;
    }

    Start ()
    {
        this.#inputHandler = this.GetComponent("InputHandler");
        this.#selectionRect = GameObject.Find("selection_rect");
        this.#selectionRenderer = this.#selectionRect.GetComponent("RectRenderer");

        this.#selectionOutlineRect = GameObject.Find("selection_outline_rect");
        this.#selectionOutlineRect.SetActive(false);

        this.#sceneListener = this.GetComponent("SceneListener");

        this.#cam = GameObject.Find("camera").GetComponent("Camera");

        InputManager.onMouseEnter.Add(() => window.parent.RefractBack("Footer.FindItem(\"cursor\").visible = true"));
        InputManager.onMouseExit.Add(() => window.parent.RefractBack("Footer.FindItem(\"cursor\").visible = false"));
    }

    Update ()
    {
        if (this.#copyTime > 0)
        {
            this.#copyTime -= Time.deltaTime;

            if (this.#copyTime <= 0)
            {
                window.parent.RefractBack("Footer.FindItem(\"copy\").visible = false");

                if (this.#selectionRenderer.color.Equals(new Color(1, 1, 0))) this.#selectionRenderer.color = new Color(0, 1, 1);
            }
        }

        if (this.#camFocus != null)
        {
            this.#camFocus.time -= Time.deltaTime * 2;

            this.#cam.transform.position = Vector2.Lerp(
                this.#cam.transform.position,
                this.#camFocus.pos,
                1 - this.#camFocus.time
            );
            this.#cam.orthographicSize = Math.Lerp(
                this.#cam.orthographicSize,
                this.#camFocus.size,
                1 - this.#camFocus.time
            );

            if (this.#camFocus.time <= 0) this.#camFocus = null;

            return;
        }

        const min = this.#cam.bounds.min;
        const max = this.#cam.bounds.max;

        window.parent.RefractBack(`Footer.FindItem("camera").text = "Min: (${min.x.toFixed(2)}, ${min.y.toFixed(2)}) Max: (${max.x.toFixed(2)}, ${max.y.toFixed(2)})"`);

        if (Input.mousePresent) window.parent.RefractBack(`Footer.FindItem("cursor").text = "(${this.#inputHandler.mousePos.x.toFixed(2)}, ${this.#inputHandler.mousePos.y.toFixed(2)})"`);

        const grid = SceneModifier.focusedGrid;
        const tilemap = SceneModifier.focusedTilemap;

        if (grid == null || tilemap == null || tilemap.color.a === 0)
        {
            if (this.#preview != null && this.#preview.activeSelf) this.#preview.SetActive(false);
            if (this.#selectionRenderer.color.a !== 0)
            {
                this.#selectionRenderer.color.a = 0;
                this.#selectionOutlineRect.SetActive(false);
            }

            return;
        }

        const gridPos = grid.WorldToCell(this.#inputHandler.mousePosSnapped);

        if (Input.mousePresent && Input.OnCtrl(KeyCode.V)) this.Paste();
        if (Input.GetKeyDown(KeyCode.F) && !Input.GetKey(KeyCode.Ctrl) && !Input.GetKey(KeyCode.Shift))
        {
            let bounds = null;

            if (this.#selectStart != null && this.#selectEnd != null)
            {
                const rect = new Rect();

                if (this.#selectStart.x < this.#selectEnd.x)
                {
                    rect.xMin = this.#selectStart.x;
                    rect.xMax = this.#selectEnd.x;
                }
                else
                {
                    rect.xMin = this.#selectEnd.x;
                    rect.xMax = this.#selectStart.x;
                }
            
                if (this.#selectStart.y < this.#selectEnd.y)
                {
                    rect.yMin = this.#selectStart.y;
                    rect.yMax = this.#selectEnd.y;
                }
                else
                {
                    rect.yMin = this.#selectEnd.y;
                    rect.yMax = this.#selectStart.y;
                }

                bounds = new Bounds(
                    rect.center,
                    Vector2.Add(rect.size, Vector2.Scale(
                        Vector2.Add(grid.cellSize, grid.cellGap),
                        grid.transform.scale
                    ))
                );
            }
            else bounds = SceneModifier.focusedTilemap.bounds;

            if (!bounds.center.Equals(new Vector2(NaN, NaN)))
            {
                const camBounds = this.#cam.bounds;
                const size = Math.max(bounds.size.x, bounds.size.y) * 1.25;

                if (!camBounds.center.Equals(bounds.center) || size !== this.#cam.orthographicSize) this.#camFocus = {
                    time: 1,
                    pos: bounds.center,
                    size: size
                };
            }
        }

        switch (this.#action)
        {
            case 0:
                this.PencilAction(tilemap, grid, gridPos);
                return;
            case 1:
                this.EraserAction(tilemap, grid, gridPos);
                return;
            case 2:
                this.EyedropperAction(tilemap, grid, gridPos);
                return;
            case 3:
            case 4:
                this.SelectAction(grid);
                return;
        }
    }

    LateUpdate ()
    {
        window.parent.RefractBack(`
            viewerFPS.main = ${(Application.targetFrameRate > 0 && Application.vSyncCount === 0) ? Math.min(
                1 / (Time.deltaTime || Time.maximumDeltaTime),
                Application.targetFrameRate
            ) : 1 / (Time.deltaTime || Time.maximumDeltaTime)};
        `);
    }

    ClearActions ()
    {
        if (this.#existingTiles.length > 0)
        {
            SceneModifier.focusedTilemap.AddTile(this.#existingTiles[0]);

            this.#existingTiles = [];
        }

        this.Deselect();
    }

    UseAction (index)
    {
        if (this.#action === index) return;
        
        this.StopRecording();

        if (this.#action === 0)
        {
            if (this.#preview != null && this.#preview.activeSelf) this.#preview.SetActive(false);

            if (this.#existingTiles.length > 0)
            {
                SceneModifier.focusedTilemap.AddTile(this.#existingTiles[0]);

                this.#existingTiles = [];
            }
        }

        if (this.#action === 4) this.Deselect(index !== 3);

        if (index === 4 && SceneModifier.focusedTilemap != null) { }
        else if (this.#action === 3) this.Deselect();
        else
        {
            this.#selectionRenderer.color.a = 0;
            this.#selectionOutlineRect.SetActive(false);
        }

        this.#action = index;

        if (index === 4 && SceneModifier.focusedTilemap != null)
        {
            if (this.#selectStart == null) this.SelectAll();
            
            this.#transforming = true;
        }
    }

    PencilAction (tilemap, grid, gridPos)
    {
        if (this.#existingTiles.length > 0 && (!this.#existingTiles[0].position.Equals(gridPos) || !Input.mousePresent))
        {
            tilemap.AddTile(this.#existingTiles[0]);
            this.#existingTiles = [];

            this.#sceneListener.SortOrdering();
        }

        if (Input.mousePresent && !this.#selectionRenderer.color.Equals(Color.green))
        {
            this.#selectionRenderer.color = Color.green;
            this.#selectionOutlineRect.SetActive(true);
        }
        else if (!Input.mousePresent)
        {
            this.#selectionRenderer.color.a = 0;
            this.#selectionOutlineRect.SetActive(false);
        }

        const gridSize = Vector2.Scale(Vector2.Add(grid.cellSize, grid.cellGap), grid.transform.scale);

        if (!this.#selectionRect.transform.scale.Equals(gridSize)) this.#selectionRect.transform.scale = gridSize;

        this.#selectionRect.transform.position = this.#inputHandler.mousePosSnapped;

        if (this.#preview == null) return;

        if (Input.mousePresent && !this.#preview.activeSelf) this.#preview.SetActive(true);
        else if (!Input.mousePresent) this.#preview.SetActive(false);

        const gridScale = new Vector2(grid.transform.scale.x, grid.transform.scale.y);

        if (!this.#preview.transform.scale.Equals(gridScale)) this.#preview.transform.scale = gridScale;

        this.#preview.transform.position = this.#inputHandler.mousePosSnapped;

        const hoveredTile = tilemap.GetTile(gridPos);

        if (hoveredTile != null && Input.mousePresent && (hoveredTile.palette !== this.#tile.palette || hoveredTile.spriteID !== this.#tile.spriteID))
        {
            this.#existingTiles.push(hoveredTile);
            tilemap.RemoveTileByPosition(gridPos);

            this.#sceneListener.SortOrdering();
        }

        if (Input.GetMouseButtonUp(0)) this.StopRecording();

        if (!Input.GetMouseButton(0) || (hoveredTile?.palette === this.#tile.palette && hoveredTile?.spriteID === this.#tile.spriteID) || (this.#existingTiles[0]?.palette === this.#tile.palette && this.#existingTiles[0]?.spriteID === this.#tile.spriteID)) return;

        this.#StartRecording();

        tilemap.AddTile(new Tile(
            this.#tile.palette,
            this.#tile.spriteID,
            gridPos
        ));

        this.#sceneListener.SortOrdering();

        if (this.#existingTiles.length > 0) window.parent.RefractBack(`
            SceneManager.RemoveTile(
                ${SceneModifier.focusedTilemapID},
                {
                    x: ${gridPos.x},
                    y: ${gridPos.y}
                }
            );
        `);
        
        this.#existingTiles = [];

        window.parent.RefractBack(`
            SceneManager.AddTile(
                ${SceneModifier.focusedTilemapID},
                {
                    palette: \"${this.#tile.palette}\",
                    spriteID: ${this.#tile.spriteID},
                    position: {
                        x: ${gridPos.x},
                        y: ${gridPos.y}
                    }
                }
            );
        `);
    }

    EraserAction (tilemap, grid, gridPos)
    {
        if (Input.mousePresent && !this.#selectionRenderer.color.Equals(Color.red))
        {
            this.#selectionRenderer.color = Color.red;
            this.#selectionOutlineRect.SetActive(true);
        }
        else if (!Input.mousePresent)
        {
            this.#selectionRenderer.color.a = 0;
            this.#selectionOutlineRect.SetActive(false);
        }

        const gridSize = Vector2.Scale(Vector2.Add(grid.cellSize, grid.cellGap), grid.transform.scale);

        if (!this.#selectionRect.transform.scale.Equals(gridSize)) this.#selectionRect.transform.scale = gridSize;

        this.#selectionRect.transform.position = this.#inputHandler.mousePosSnapped;

        if (Input.GetMouseButtonUp(0)) this.StopRecording();

        if (!Input.GetMouseButton(0) || tilemap.GetTile(gridPos) == null) return;

        this.#StartRecording();

        tilemap.RemoveTileByPosition(gridPos);

        this.#sceneListener.SortOrdering();

        window.parent.RefractBack(`
            SceneManager.RemoveTile(
                ${SceneModifier.focusedTilemapID},
                {
                    x: ${gridPos.x},
                    y: ${gridPos.y}
                }
            );
        `);
    }

    EyedropperAction (tilemap, grid, gridPos)
    {
        if (Input.mousePresent && !this.#selectionRenderer.color.Equals(Color.blue))
        {
            this.#selectionRenderer.color = Color.blue;
            this.#selectionOutlineRect.SetActive(true);
        }
        else if (!Input.mousePresent)
        {
            this.#selectionRenderer.color.a = 0;
            this.#selectionOutlineRect.SetActive(false);
        }

        const gridSize = Vector2.Scale(Vector2.Add(grid.cellSize, grid.cellGap), grid.transform.scale);

        if (!this.#selectionRect.transform.scale.Equals(gridSize)) this.#selectionRect.transform.scale = gridSize;

        this.#selectionRect.transform.position = this.#inputHandler.mousePosSnapped;

        if (!Input.GetMouseButtonUp(0)) return;

        const tile = tilemap.GetTile(gridPos);

        if (tile != null) window.parent.RefractBack(`(async () => {
            await Palette.LoadMap("${tile.palette}");
            
            const tilePos = Palette.GetTilePos(${tile.spriteID});
            
            if (tilePos == null) return;
            
            Palette.PaletteView().Refract(\`requestAnimationFrame(() => GameObject.FindComponents("PaletteInput")[0].SelectTileByPos(new Vector2(\${tilePos.x}, \${tilePos.y})))\`);
        })()`);
        else window.parent.RefractBack("Palette.PaletteView().Refract(\"GameObject.FindComponents(\\\"PaletteInput\\\")[0].Deselect()\")");

        window.parent.RefractBack("Palette.UseAction(0)");
    }

    SelectAction (grid)
    {
        if (Input.GetMouseButtonDown(0) && !this.#transforming)
        {
            this.#selectStart = this.#inputHandler.mousePosSnapped;

            window.parent.RefractBack("Footer.FindItem(\"rect\").visible = true");
        }

        if (this.#selectStart == null)
        {
            if (Input.mousePresent && !this.#selectionRenderer.color.Equals(Color.white))
            {
                this.#selectionRenderer.color = Color.white;
                this.#selectionOutlineRect.SetActive(true);
            }
            else if (!Input.mousePresent)
            {
                this.#selectionRenderer.color.a = 0;
                this.#selectionOutlineRect.SetActive(false);
            }

            const gridSize = Vector2.Scale(Vector2.Add(grid.cellSize, grid.cellGap), grid.transform.scale);

            if (!this.#selectionRect.transform.scale.Equals(gridSize)) this.#selectionRect.transform.scale = gridSize;
            
            this.#selectionRect.transform.position = this.#inputHandler.mousePosSnapped;
        }

        if (this.#selectStart != null && !this.#transforming && Input.GetMouseButton(0))
        {
            if (!this.#selectionRenderer.color.Equals(new Color(0, 1, 1)))
            {
                this.#selectionRenderer.color = new Color(0, 1, 1);
                this.#selectionOutlineRect.SetActive(true);
            }

            this.#selectEnd = this.#inputHandler.mousePosSnapped;

            this.#selection = this.#GetSelection();

            const rect = new Rect();

            if (this.#selectStart.x < this.#selectEnd.x)
            {
                rect.xMin = this.#selectStart.x;
                rect.xMax = this.#selectEnd.x;
            }
            else
            {
                rect.xMin = this.#selectEnd.x;
                rect.xMax = this.#selectStart.x;
            }

            if (this.#selectStart.y < this.#selectEnd.y)
            {
                rect.yMin = this.#selectStart.y;
                rect.yMax = this.#selectEnd.y;
            }
            else
            {
                rect.yMin = this.#selectEnd.y;
                rect.yMax = this.#selectStart.y;
            }

            this.#selectionRect.transform.position = rect.center;
            this.#selectionRect.transform.scale = Vector2.Add(rect.size, Vector2.Scale(Vector2.Add(grid.cellSize, grid.cellGap), grid.transform.scale));

            const disSize = Vector2.Add(
                Vector2.Subtract(
                    grid.WorldToCell(rect.max),
                    grid.WorldToCell(rect.min)
                ),
                1
            );

            window.parent.RefractBack(`Footer.FindItem("rect").text = "(${rect.center.x.toFixed(2)}, ${rect.center.y.toFixed(2)}) W: ${disSize.x} H: ${disSize.y}"`);
        }

        if (this.#transforming && !Input.GetMouseButton(2) && !Input.GetMouseButton(1)) document.body.style.cursor = "move";

        if (this.#transforming && Input.GetMouseButton(0))
        {
            if (this.#lastTransPos != null)
            {
                const delta = Vector2.Subtract(this.#inputHandler.mousePosSnapped, this.#lastTransPos);

                this.TransformSelection(delta);
            }

            this.#lastTransPos = this.#inputHandler.mousePosSnapped;
        }

        if (this.#transforming && Input.GetMouseButtonUp(0))
        {
            this.#lastTransPos = null;

            this.StopRecording();
        }

        if ((Input.GetKeyDown(KeyCode.Backspace) || Input.GetKeyDown(KeyCode.Delete)) && !Input.GetKey(KeyCode.Ctrl) && !Input.GetKey(KeyCode.Shift)) this.DeleteSelection();
        if (Input.OnCtrl(KeyCode.F)) this.FillSelection();
        if (Input.OnCtrlShift(KeyCode.A)) this.Deselect();

        if (!Input.mousePresent || this.#selection.length === 0) return;

        if (Input.OnCtrl(KeyCode.C))
        {
            this.#copyBuffer = {
                selection: this.#selection,
                start: Vector2.Scale(this.#selectStart, 1),
                end: Vector2.Scale(this.#selectEnd, 1)
            };

            this.#AlertCopied();
        }
        if (Input.OnCtrl(KeyCode.X))
        {
            this.#copyBuffer = {
                selection: this.#selection,
                start: Vector2.Scale(this.#selectStart, 1),
                end: Vector2.Scale(this.#selectEnd, 1)
            };

            this.DeleteSelection();

            this.#AlertCopied(true);
        }
    }

    SelectAll ()
    {
        if (this.#transforming) this.Deselect();

        if (this.#action !== 3) this.UseAction(3);

        if (!this.#selectionRenderer.color.Equals(new Color(0, 1, 1)))
        {
            this.#selectionRenderer.color = new Color(0, 1, 1);
            this.#selectionOutlineRect.SetActive(true);
        }

        const bounds = SceneModifier.focusedTilemap.bounds;

        if (bounds.center.Equals(new Vector2(NaN, NaN))) return;

        const gridSize = Vector2.Scale(Vector2.Add(SceneModifier.focusedGrid.cellSize, SceneModifier.focusedGrid.cellGap), SceneModifier.focusedGrid.transform.scale);
        const gridSizeOffset = Vector2.Scale(gridSize, 0.5);  

        if (this.#selectStart == null) window.parent.RefractBack("Footer.FindItem(\"rect\").visible = true");

        this.#selectStart = Vector2.Add(bounds.min, gridSizeOffset);
        this.#selectEnd = Vector2.Subtract(bounds.max, gridSizeOffset);

        this.#selection = this.#GetSelection();

        const rect = new Rect();
        rect.min = new Vector2(this.#selectStart.x, this.#selectStart.y);
        rect.max = new Vector2(this.#selectEnd.x, this.#selectEnd.y);

        this.#selectionRect.transform.position = rect.center;
        this.#selectionRect.transform.scale = Vector2.Add(rect.size, gridSize);

        const disSize = Vector2.Add(
            Vector2.Subtract(
                SceneModifier.focusedGrid.WorldToCell(rect.max),
                SceneModifier.focusedGrid.WorldToCell(rect.min)
            ),
            1
        );

        window.parent.RefractBack(`Footer.FindItem("rect").text = "(${rect.center.x.toFixed(2)}, ${rect.center.y.toFixed(2)}) W: ${disSize.x} H: ${disSize.y}"`);
    }

    Deselect (ignoreTransform)
    {
        if (this.#selectStart == null) return;

        window.parent.RefractBack("Footer.FindItem(\"rect\").visible = false");

        if (this.#transforming && !ignoreTransform) window.parent.RefractBack("Palette.UseAction(3)");

        this.#selectStart = null;
        this.#selectEnd = null;
        this.#selectionRenderer.color.a = 0;
        this.#selectionOutlineRect.SetActive(false);
        this.#selection = [];
        this.#existingTiles = [];
        this.#transforming = false;
        this.#lastTransPos = null;

        document.body.style.cursor = "";
    }

    #GetSelection ()
    {
        if (this.#selectStart == null) return;

        const rect = new Rect();

        if (this.#selectStart.x < this.#selectEnd.x)
        {
            rect.xMin = this.#selectStart.x;
            rect.xMax = this.#selectEnd.x;
        }
        else
        {
            rect.xMin = this.#selectEnd.x;
            rect.xMax = this.#selectStart.x;
        }

        if (this.#selectStart.y < this.#selectEnd.y)
        {
            rect.yMin = this.#selectStart.y;
            rect.yMax = this.#selectEnd.y;
        }
        else
        {
            rect.yMin = this.#selectEnd.y;
            rect.yMax = this.#selectStart.y;
        }

        const min = SceneModifier.focusedGrid.WorldToCell(rect.min);
        const max = SceneModifier.focusedGrid.WorldToCell(rect.max);

        let output = [];

        for (let y = min.y; y <= max.y; y++)
        {
            for (let x = min.x; x <= max.x; x++)
            {
                const tile = SceneModifier.focusedTilemap.GetTile(new Vector2(x, y));

                if (tile != null) output.push(tile);
            }
        }

        return output
    }

    DeleteSelection ()
    {
        if (this.#selectStart == null) return;

        if (this.#selection.length > 0) this.#StartRecording();

        for (let i = 0; i < this.#selection.length; i++)
        {
            SceneModifier.focusedTilemap.RemoveTileByPosition(this.#selection[i].position);

            window.parent.RefractBack(`
                SceneManager.RemoveTile(
                    ${SceneModifier.focusedTilemapID},
                    {
                        x: ${this.#selection[i].position.x},
                        y: ${this.#selection[i].position.y}
                    }
                );
            `);
        }

        if (this.#selection.length > 0)
        {
            if (!this.#transforming) this.StopRecording();

            this.Deselect();
            this.#sceneListener.SortOrdering();
        }
    }

    FillSelection ()
    {
        if (this.#selectStart == null || this.#tile == null) return;

        const rect = new Rect();

        if (this.#selectStart.x < this.#selectEnd.x)
        {
            rect.xMin = this.#selectStart.x;
            rect.xMax = this.#selectEnd.x;
        }
        else
        {
            rect.xMin = this.#selectEnd.x;
            rect.xMax = this.#selectStart.x;
        }

        if (this.#selectStart.y < this.#selectEnd.y)
        {
            rect.yMin = this.#selectStart.y;
            rect.yMax = this.#selectEnd.y;
        }
        else
        {
            rect.yMin = this.#selectEnd.y;
            rect.yMax = this.#selectStart.y;
        }

        const min = SceneModifier.focusedGrid.WorldToCell(rect.min);
        const max = SceneModifier.focusedGrid.WorldToCell(rect.max);

        this.#StartRecording();

        for (let y = min.y; y <= max.y; y++)
        {
            for (let x = min.x; x <= max.x; x++)
            {
                const pos = new Vector2(x, y);

                const existingTile = SceneModifier.focusedTilemap.GetTile(pos);

                if (existingTile?.palette === this.#tile.palette && existingTile?.spriteID === this.#tile.spriteID) continue;

                if (existingTile != null)
                {
                    SceneModifier.focusedTilemap.RemoveTileByPosition(pos);

                    window.parent.RefractBack(`
                        SceneManager.RemoveTile(
                            ${SceneModifier.focusedTilemapID},
                            {
                                x: ${x},
                                y: ${y}
                            }
                        );
                    `);
                }

                SceneModifier.focusedTilemap.AddTile(new Tile(
                    this.#tile.palette,
                    this.#tile.spriteID,
                    pos
                ));

                window.parent.RefractBack(`
                    SceneManager.AddTile(
                        ${SceneModifier.focusedTilemapID},
                        {
                            palette: \"${this.#tile.palette}\",
                            spriteID: ${this.#tile.spriteID},
                            position: {
                                x: ${x},
                                y: ${y}
                            }
                        }
                    );
                `);
            }
        }

        if (!this.#transforming) this.StopRecording();

        this.Deselect();
        this.#sceneListener.SortOrdering();
    }

    TransformSelection (dir)
    {
        if (this.#selectStart == null || dir.Equals(Vector2.zero)) return;

        this.#StartRecording();

        for (let i = 0; i < this.#selection.length; i++)
        {
            SceneModifier.focusedTilemap.RemoveTileByPosition(this.#selection[i].position);

            this.#sceneListener.SortOrdering();

            window.parent.RefractBack(`
                SceneManager.RemoveTile(
                    ${SceneModifier.focusedTilemapID},
                    {
                        x: ${this.#selection[i].position.x},
                        y: ${this.#selection[i].position.y}
                    }
                );
            `);
        }

        for (let i = 0; i < this.#selection.length; i++)
        {
            const newPos = Vector2.Add(
                this.#selection[i].position,
                SceneModifier.focusedGrid.WorldToCell(Vector2.Add(
                    dir,
                    SceneModifier.focusedGrid.transform.position
                ))
            );

            const existingTile = SceneModifier.focusedTilemap.GetTile(newPos);

            if (existingTile != null)
            {
                this.#existingTiles.push(existingTile);

                SceneModifier.focusedTilemap.RemoveTileByPosition(existingTile.position);

                this.#sceneListener.SortOrdering();

                window.parent.RefractBack(`
                    SceneManager.RemoveTile(
                        ${SceneModifier.focusedTilemapID},
                        {
                            x: ${existingTile.position.x},
                            y: ${existingTile.position.y}
                        }
                    );
                `);
            }
            
            this.#selection[i].position = newPos;

            SceneModifier.focusedTilemap.AddTile(this.#selection[i]);

            this.#sceneListener.SortOrdering();

            window.parent.RefractBack(`
                SceneManager.AddTile(
                    ${SceneModifier.focusedTilemapID},
                    {
                        palette: \"${this.#selection[i].palette}\",
                        spriteID: ${this.#selection[i].spriteID},
                        position: {
                            x: ${this.#selection[i].position.x},
                            y: ${this.#selection[i].position.y}
                        }
                    }
                );
            `);
        }

        let reexistingTiles = [];

        for (let i = 0; i < this.#existingTiles.length; i++)
        {
            if (this.#selection.find(item => item.position.Equals(this.#existingTiles[i].position)) != null) continue;

            SceneModifier.focusedTilemap.AddTile(this.#existingTiles[i]);

            this.#sceneListener.SortOrdering();

            window.parent.RefractBack(`
                SceneManager.AddTile(
                    ${SceneModifier.focusedTilemapID},
                    {
                        palette: \"${this.#existingTiles[i].palette}\",
                        spriteID: ${this.#existingTiles[i].spriteID},
                        position: {
                            x: ${this.#existingTiles[i].position.x},
                            y: ${this.#existingTiles[i].position.y}
                        }
                    }
                );
            `);

            reexistingTiles.push(this.#existingTiles[i]);
        }

        for (let i = 0; i < reexistingTiles.length; i++) this.#existingTiles.splice(this.#existingTiles.indexOf(reexistingTiles[i]), 1);

        this.#selectStart = Vector2.Add(this.#selectStart, dir);
        this.#selectEnd = Vector2.Add(this.#selectEnd, dir);

        const rect = new Rect();

        if (this.#selectStart.x < this.#selectEnd.x)
        {
            rect.xMin = this.#selectStart.x;
            rect.xMax = this.#selectEnd.x;
        }
        else
        {
            rect.xMin = this.#selectEnd.x;
            rect.xMax = this.#selectStart.x;
        }

        if (this.#selectStart.y < this.#selectEnd.y)
        {
            rect.yMin = this.#selectStart.y;
            rect.yMax = this.#selectEnd.y;
        }
        else
        {
            rect.yMin = this.#selectEnd.y;
            rect.yMax = this.#selectStart.y;
        }

        this.#selectionRect.transform.position = rect.center;
        this.#selectionRect.transform.scale = Vector2.Add(rect.size, Vector2.Scale(Vector2.Add(SceneModifier.focusedGrid.cellSize, SceneModifier.focusedGrid.cellGap), SceneModifier.focusedGrid.transform.scale));

        const disSize = Vector2.Add(
            Vector2.Subtract(
                SceneModifier.focusedGrid.WorldToCell(rect.max),
                SceneModifier.focusedGrid.WorldToCell(rect.min)
            ),
            1
        );

        window.parent.RefractBack(`Footer.FindItem("rect").text = "(${rect.center.x.toFixed(2)}, ${rect.center.y.toFixed(2)}) W: ${disSize.x} H: ${disSize.y}"`);
    }

    async Paste ()
    {
        if (this.#copyBuffer == null) return;

        if (this.#action !== 3) window.parent.RefractBack("Palette.UseAction(3)");

        await CrystalEngine.Wait(() => this.#action === 3);

        this.#selectStart = Vector2.zero;
        this.#selectEnd = Vector2.zero;

        window.parent.RefractBack("Palette.UseAction(4)");

        await CrystalEngine.Wait(() => this.#transforming);

        if (!this.#selectionRenderer.color.Equals(new Color(1, 0, 1)))
        {
            this.#selectionRenderer.color = new Color(1, 0, 1);
            this.#selectionOutlineRect.SetActive(true);
        }

        if (this.#selectStart == null) window.parent.RefractBack("Footer.FindItem(\"rect\").visible = true");

        this.#selectStart = Vector2.Scale(this.#copyBuffer.start, 1);
        this.#selectEnd = Vector2.Scale(this.#copyBuffer.end, 1);

        this.#StartRecording();

        this.#selection = this.#copyBuffer.selection.map(item => item.Duplicate());

        for (let i = 0; i < this.#selection.length; i++)
        {
            const existingTile = SceneModifier.focusedTilemap.GetTile(this.#selection[i].position);

            if (existingTile != null)
            {
                this.#existingTiles.push(existingTile);

                SceneModifier.focusedTilemap.RemoveTileByPosition(existingTile.position);

                this.#sceneListener.SortOrdering();

                window.parent.RefractBack(`
                    SceneManager.RemoveTile(
                        ${SceneModifier.focusedTilemapID},
                        {
                            x: ${existingTile.position.x},
                            y: ${existingTile.position.y}
                        }
                    );
                `);
            }

            SceneModifier.focusedTilemap.AddTile(this.#selection[i]);

            this.#sceneListener.SortOrdering();

            window.parent.RefractBack(`
                SceneManager.AddTile(
                    ${SceneModifier.focusedTilemapID},
                    {
                        palette: \"${this.#selection[i].palette}\",
                        spriteID: ${this.#selection[i].spriteID},
                        position: {
                            x: ${this.#selection[i].position.x},
                            y: ${this.#selection[i].position.y}
                        }
                    }
                );
            `);
        }

        const rect = new Rect();

        if (this.#selectStart.x < this.#selectEnd.x)
        {
            rect.xMin = this.#selectStart.x;
            rect.xMax = this.#selectEnd.x;
        }
        else
        {
            rect.xMin = this.#selectEnd.x;
            rect.xMax = this.#selectStart.x;
        }

        if (this.#selectStart.y < this.#selectEnd.y)
        {
            rect.yMin = this.#selectStart.y;
            rect.yMax = this.#selectEnd.y;
        }
        else
        {
            rect.yMin = this.#selectEnd.y;
            rect.yMax = this.#selectStart.y;
        }

        this.#selectionRect.transform.position = rect.center;
        this.#selectionRect.transform.scale = Vector2.Add(rect.size, Vector2.Scale(Vector2.Add(SceneModifier.focusedGrid.cellSize, SceneModifier.focusedGrid.cellGap), SceneModifier.focusedGrid.transform.scale));

        if (!this.#cam.bounds.Intersects(this.#selectionRenderer.bounds))
        {
            const camSize = Vector2.Add(rect.size, Vector2.Scale(
                Vector2.Add(SceneModifier.focusedGrid.cellSize, SceneModifier.focusedGrid.cellGap),
                SceneModifier.focusedGrid.transform.scale
            ));

            this.#camFocus = {
                time: 1,
                pos: rect.center,
                size: Math.max(
                    Math.max(camSize.x, camSize.y) * 1.25,
                    this.#cam.orthographicSize
                )
            };
        }

        const disSize = Vector2.Add(
            Vector2.Subtract(
                SceneModifier.focusedGrid.WorldToCell(rect.max),
                SceneModifier.focusedGrid.WorldToCell(rect.min)
            ),
            1
        );

        window.parent.RefractBack(`Footer.FindItem("rect").text = "(${rect.center.x.toFixed(2)}, ${rect.center.y.toFixed(2)}) W: ${disSize.x} H: ${disSize.y}"`);
    }
}