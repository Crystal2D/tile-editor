class MainInput extends GameBehavior
{
    #transforming = false;
    #recording = false;
    #action = 0;
    #existingTiles = [];
    #selection = [];

    #inputHandler = null;
    #selectionRect = null;
    #selectionRenderer = null;
    #tile = null;
    #preview = null;
    #previewRenderer = null;
    #selectStart = null;
    #selectEnd = null;
    #lastTransPos = null;
    #sceneListener = null;

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
        this.#sceneListener = this.GetComponent("SceneListener");

        const camera = GameObject.Find("camera").GetComponent("Camera");

        this.#inputHandler.onRecalcMatrix.Add(() => {
            const min = camera.bounds.min;
            const max = camera.bounds.max;

            window.parent.RefractBack(`Footer.FindItem("camera").text = "Min: (${min.x.toFixed(2)}, ${min.y.toFixed(2)}) Max: (${max.x.toFixed(2)}, ${max.y.toFixed(2)})"`);
        });
        InputManager.onMouseEnter.Add(() => window.parent.RefractBack("Footer.FindItem(\"cursor\").visible = true"));
        InputManager.onMouseExit.Add(() => window.parent.RefractBack("Footer.FindItem(\"cursor\").visible = false"));
    }

    Update ()
    {
        if (InputManager.isMouseOver) window.parent.RefractBack(`Footer.FindItem("cursor").text = "(${this.#inputHandler.mousePos.x.toFixed(2)}, ${this.#inputHandler.mousePos.y.toFixed(2)})"`);

        const grid = SceneModifier.focusedGrid;
        const tilemap = SceneModifier.focusedTilemap;

        if (grid == null || tilemap == null || tilemap.color.a === 0)
        {
            if (this.#preview != null && this.#preview.activeSelf) this.#preview.SetActive(false);
            if (this.#selectionRenderer.color.a !== 0) this.#selectionRenderer.color = new Color(0, 0, 0, 0);

            return;
        }

        const gridPos = grid.WorldToCell(this.#inputHandler.mousePosSnapped);

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
        else this.#selectionRenderer.color = new Color(0, 0, 0, 0);

        this.#action = index;

        if (index === 4 && SceneModifier.focusedTilemap != null)
        {
            if (this.#selectStart == null) this.SelectAll();
            
            this.#transforming = true;
        }
    }

    PencilAction (tilemap, grid, gridPos)
    {
        if (this.#existingTiles.length > 0 && (!this.#existingTiles[0].position.Equals(gridPos) || !InputManager.isMouseOver))
        {
            tilemap.AddTile(this.#existingTiles[0]);
            this.#existingTiles = [];

            this.#sceneListener.SortOrdering();
        }

        if (InputManager.isMouseOver && !this.#selectionRenderer.color.Equals(Color.green)) this.#selectionRenderer.color = Color.green;
        else if (!InputManager.isMouseOver) this.#selectionRenderer.color = new Color(0, 0, 0, 0);

        const gridSize = Vector2.Add(grid.cellSize, grid.cellGap);

        if (!this.#selectionRect.transform.scale.Equals(gridSize)) this.#selectionRect.transform.scale = gridSize;

        this.#selectionRect.transform.position = this.#inputHandler.mousePosSnapped;

        if (this.#preview == null) return;

        if (InputManager.isMouseOver && !this.#preview.activeSelf) this.#preview.SetActive(true);
        else if (!InputManager.isMouseOver) this.#preview.SetActive(false);

        const gridScale = new Vector2(grid.transform.scale.x, grid.transform.scale.y);

        if (!this.#preview.transform.scale.Equals(gridScale)) this.#preview.transform.scale = gridScale;

        this.#preview.transform.position = this.#inputHandler.mousePosSnapped;

        const hoveredTile = tilemap.GetTile(gridPos);

        if (hoveredTile != null && InputManager.isMouseOver && (hoveredTile.palette !== this.#tile.palette || hoveredTile.spriteID !== this.#tile.spriteID))
        {
            this.#existingTiles.push(hoveredTile);
            tilemap.RemoveTileByPosition(gridPos);

            this.#sceneListener.SortOrdering();
        }

        if (InputManager.GetKeyUp("left")) this.StopRecording();

        if (!InputManager.GetKey("left") || (hoveredTile?.palette === this.#tile.palette && hoveredTile?.spriteID === this.#tile.spriteID) || (this.#existingTiles[0]?.palette === this.#tile.palette && this.#existingTiles[0]?.spriteID === this.#tile.spriteID)) return;

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
        if (InputManager.isMouseOver && !this.#selectionRenderer.color.Equals(Color.red)) this.#selectionRenderer.color = Color.red;
        else if (!InputManager.isMouseOver) this.#selectionRenderer.color = new Color(0, 0, 0, 0);

        const gridSize = Vector2.Add(grid.cellSize, grid.cellGap);

        if (!this.#selectionRect.transform.scale.Equals(gridSize)) this.#selectionRect.transform.scale = gridSize;

        this.#selectionRect.transform.position = this.#inputHandler.mousePosSnapped;

        if (InputManager.GetKeyUp("left")) this.StopRecording();

        if (!InputManager.GetKey("left") || tilemap.GetTile(gridPos) == null) return;

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
        if (InputManager.isMouseOver && !this.#selectionRenderer.color.Equals(Color.blue)) this.#selectionRenderer.color = Color.blue;
        else if (!InputManager.isMouseOver) this.#selectionRenderer.color = new Color(0, 0, 0, 0);

        const gridSize = Vector2.Add(grid.cellSize, grid.cellGap);

        if (!this.#selectionRect.transform.scale.Equals(gridSize)) this.#selectionRect.transform.scale = gridSize;

        this.#selectionRect.transform.position = this.#inputHandler.mousePosSnapped;

        if (!InputManager.GetKeyUp("left")) return;

        const tile = tilemap.GetTile(gridPos)

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
        if (InputManager.GetKeyDown("left") && !this.#transforming)
        {
            this.#selectStart = this.#inputHandler.mousePosSnapped;

            window.parent.RefractBack("Footer.FindItem(\"rect\").visible = true");
        }

        if (this.#selectStart == null)
        {
            if (InputManager.isMouseOver && !this.#selectionRenderer.color.Equals(Color.white)) this.#selectionRenderer.color = Color.white;
            else if (!InputManager.isMouseOver) this.#selectionRenderer.color = new Color(0, 0, 0, 0);

            const gridSize = Vector2.Add(grid.cellSize, grid.cellGap);

            if (!this.#selectionRect.transform.scale.Equals(gridSize)) this.#selectionRect.transform.scale = gridSize;
            
            this.#selectionRect.transform.position = this.#inputHandler.mousePosSnapped;
        }

        if (this.#selectStart != null && !this.#transforming && InputManager.GetKey("left"))
        {
            if (!this.#selectionRenderer.color.Equals(new Color(0, 1, 1))) this.#selectionRenderer.color = new Color(0, 1, 1);

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
            this.#selectionRect.transform.scale = Vector2.Add(rect.size, Vector2.Add(grid.cellSize, grid.cellGap));

            const disSize = Vector2.Add(
                Vector2.Subtract(
                    grid.WorldToCell(rect.max),
                    grid.WorldToCell(rect.min)
                ),
                1
            );

            window.parent.RefractBack(`Footer.FindItem("rect").text = "(${rect.center.x.toFixed(2)}, ${rect.center.y.toFixed(2)}) W: ${disSize.x} H: ${disSize.y}"`);
        }

        if (this.#transforming && !InputManager.GetKey("middle") && !InputManager.GetKey("right")) document.body.style.cursor = "move";

        if (this.#transforming && InputManager.GetKey("left"))
        {
            if (this.#lastTransPos != null)
            {
                const delta = Vector2.Subtract(this.#inputHandler.mousePosSnapped, this.#lastTransPos);

                this.TransformSelection(delta);
            }

            this.#lastTransPos = this.#inputHandler.mousePosSnapped;
        }

        if (this.#transforming && InputManager.GetKeyUp("left"))
        {
            this.#lastTransPos = null;

            this.StopRecording();
        }

        if ((Input.GetKeyDown(KeyCode.Backspace) || Input.GetKeyDown(KeyCode.Delete)) && !Input.GetKey(KeyCode.Ctrl) && !Input.GetKey(KeyCode.Shift)) this.DeleteSelection();
        if (Input.OnCtrl(KeyCode.F)) this.FillSelection();
        if (Input.OnCtrlShift(KeyCode.A)) this.Deselect();
    }

    SelectAll ()
    {
        if (this.#action !== 3 && this.#action !== 4) this.UseAction(3);

        if (!this.#selectionRenderer.color.Equals(new Color(0, 1, 1))) this.#selectionRenderer.color = new Color(0, 1, 1);

        const bounds = SceneModifier.focusedTilemap.bounds;

        if (bounds.center.Equals(new Vector2(NaN, NaN))) return;

        const gridSizeOffset = Vector2.Scale(Vector2.Add(SceneModifier.focusedGrid.cellSize, SceneModifier.focusedGrid.cellGap), 0.5);  

        if (this.#selectStart == null) window.parent.RefractBack("Footer.FindItem(\"rect\").visible = true");

        this.#selectStart = Vector2.Add(bounds.min, gridSizeOffset);
        this.#selectEnd = Vector2.Subtract(bounds.max, gridSizeOffset);

        this.#selection = this.#GetSelection();

        const rect = new Rect();
        rect.min = new Vector2(this.#selectStart.x, this.#selectStart.y);
        rect.max = new Vector2(this.#selectEnd.x, this.#selectEnd.y);

        this.#selectionRect.transform.position = rect.center;
        this.#selectionRect.transform.scale = Vector2.Add(rect.size, Vector2.Add(SceneModifier.focusedGrid.cellSize, SceneModifier.focusedGrid.cellGap));

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
        this.#selectionRenderer.color = new Color(0, 0, 0, 0);
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
            const newPos = Vector2.Add(this.#selection[i].position, SceneModifier.focusedGrid.WorldToCell(dir));

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
        this.#selectionRect.transform.scale = Vector2.Add(rect.size, Vector2.Add(
            SceneModifier.focusedGrid.cellSize,
            SceneModifier.focusedGrid.cellGap
        ));

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