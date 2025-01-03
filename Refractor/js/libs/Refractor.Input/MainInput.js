class MainInput extends GameBehavior
{
    #transforming = false;
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

    set tile (value)
    {
        this.#tile = value;

        this.#LoadTile();
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

    Start ()
    {
        this.#inputHandler = this.GetComponent("InputHandler");
        this.#selectionRect = GameObject.Find("selection_rect");
        this.#selectionRenderer = this.#selectionRect.GetComponent("RectRenderer");
    }

    Update ()
    {
        const grid = SceneModifier.focusedGrid;
        const tilemap = SceneModifier.focusedTilemap;

        if (grid == null || tilemap == null)
        {
            if (this.#preview != null && this.#preview.activeSelf) this.#preview.SetActive(false);
            if (this.#selectionRenderer.color.a !== 0) this.#selectionRenderer.color = new Color(0, 0, 0, 0);

            return;
        }

        const gridPos = grid.WorldToCell(this.#inputHandler.mousePosSnapped);

        if (Input.GetKey(KeyCode.Ctrl) && Input.GetKey(KeyCode.A)) this.#inputHandler.CancelWalk();

        switch (this.#action)
        {
            case 0:
                this.PencilAction(tilemap, grid, gridPos);
                return;
            case 1:
                this.EraserAction(tilemap, grid, gridPos);
                return;
            case 2:
                this.SelectAction(grid);
                return;
        }
    }

    UseAction (index)
    {
        if (this.#action === index) return;

        if (this.#action === 0 && this.#existingTiles.length > 0) SceneModifier.focusedTilemap.AddTile(this.#existingTiles[0]);

        if (this.#action === 3) this.Deselect();

        if (index === 3 && SceneModifier.focusedTilemap != null)
        {
            if (this.#selectStart == null) this.SelectAll();
                    
            this.#transforming = true;
            index = 2;
        }
        else if (this.#action === 2) this.Deselect();
        else this.#selectionRenderer.color = new Color(0, 0, 0, 0);

        this.#action = index;
    }

    PencilAction (tilemap, grid, gridPos)
    {
        if (this.#existingTiles.length > 0 && (!this.#existingTiles[0].position.Equals(gridPos) || !InputManager.isMouseOver))
        {
            tilemap.AddTile(this.#existingTiles[0]);

            this.#existingTiles = [];
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
        }

        if (!InputManager.GetKey("left") || (hoveredTile?.palette === this.#tile.palette && hoveredTile?.spriteID === this.#tile.spriteID) || (this.#existingTiles[0]?.palette === this.#tile.palette && this.#existingTiles[0]?.spriteID === this.#tile.spriteID)) return;
        
        tilemap.AddTile(new Tile(
            this.#tile.palette,
            this.#tile.spriteID,
            gridPos
        ));

        if (this.#existingTiles.length > 0) window.parent.RefractBack(`SceneManager.RemoveTile(${SceneModifier.focusedTilemapID}, { x: ${gridPos.x}, y: ${gridPos.y} })`);
        
        this.#existingTiles = [];

        window.parent.RefractBack(`SceneManager.AddTile(${SceneModifier.focusedTilemapID}, { palette: \"${this.#tile.palette}\", spriteID: ${this.#tile.spriteID}, position: { x: ${gridPos.x}, y: ${gridPos.y} } })`);
    }

    EraserAction (tilemap, grid, gridPos)
    {
        if (this.#preview != null && this.#preview.activeSelf) this.#preview.SetActive(false);

        if (InputManager.isMouseOver && !this.#selectionRenderer.color.Equals(Color.red)) this.#selectionRenderer.color = Color.red;
        else if (!InputManager.isMouseOver) this.#selectionRenderer.color = new Color(0, 0, 0, 0);

        const gridSize = Vector2.Add(grid.cellSize, grid.cellGap);

        if (!this.#selectionRect.transform.scale.Equals(gridSize)) this.#selectionRect.transform.scale = gridSize;

        this.#selectionRect.transform.position = this.#inputHandler.mousePosSnapped;

        if (!InputManager.GetKey("left") || tilemap.GetTile(gridPos) == null) return;

        tilemap.RemoveTileByPosition(gridPos);

        window.parent.RefractBack(`SceneManager.RemoveTile(${SceneModifier.focusedTilemapID}, { x: ${gridPos.x}, y: ${gridPos.y} })`);
    }

    SelectAction (grid)
    {
        if (this.#preview != null && this.#preview.activeSelf) this.#preview.SetActive(false);

        if (InputManager.GetKeyDown("left") && !this.#transforming) this.#selectStart = this.#inputHandler.mousePosSnapped;

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

        if (this.#transforming && InputManager.GetKeyUp("left")) this.#lastTransPos = null;

        if (Input.GetKeyDown(KeyCode.Backspace)) this.DeleteSelection();
        if (Input.GetKey(KeyCode.Ctrl) && Input.GetKeyDown(KeyCode.F)) this.FillSelection();

        if (Input.GetKey(KeyCode.Ctrl) && Input.GetKey(KeyCode.Shift) && Input.GetKey(KeyCode.A))
        {
            this.#inputHandler.CancelWalk();

            if (Input.GetKeyDown(KeyCode.A)) this.Deselect();
        }
    }

    SelectAll ()
    {
        if (this.#action !== 2) this.UseAction(2);

        if (!this.#selectionRenderer.color.Equals(new Color(0, 1, 1))) this.#selectionRenderer.color = new Color(0, 1, 1);

        const bounds = SceneModifier.focusedTilemap.bounds;

        if (bounds.center.Equals(new Vector2(NaN, NaN))) return;

        const gridSizeOffset = Vector2.Scale(Vector2.Add(SceneModifier.focusedGrid.cellSize, SceneModifier.focusedGrid.cellGap), 0.5);  

        this.#selectStart = Vector2.Add(bounds.min, gridSizeOffset);
        this.#selectEnd = Vector2.Subtract(bounds.max, gridSizeOffset);

        this.#selection = this.#GetSelection();

        const rect = new Rect();
        rect.min = new Vector2(this.#selectStart.x, this.#selectStart.y);
        rect.max = new Vector2(this.#selectEnd.x, this.#selectEnd.y);

        this.#selectionRect.transform.position = rect.center;
        this.#selectionRect.transform.scale = Vector2.Add(rect.size, Vector2.Add(SceneModifier.focusedGrid.cellSize, SceneModifier.focusedGrid.cellGap));
    }

    Deselect ()
    {
        if (this.#selectStart == null) return;

        if (this.#transforming) window.parent.RefractBack("Palette.UseAction(2)");

        this.#selectStart = null;
        this.#selectEnd = null;
        this.#selectionRenderer.color = new Color(0, 0, 0, 0);
        this.#selection = [];
        this.#existingTiles = [];
        this.#transforming = false;

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

        for (let i = 0; i < this.#selection.length; i++)
        {
            SceneModifier.focusedTilemap.RemoveTileByPosition(this.#selection[i].position);

            window.parent.RefractBack(`SceneManager.RemoveTile(${SceneModifier.focusedTilemapID}, { x: ${this.#selection[i].position.x}, y: ${this.#selection[i].position.y} })`);
        }

        if (this.#selection.length > 0) this.Deselect();
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

                    window.parent.RefractBack(`SceneManager.RemoveTile(${SceneModifier.focusedTilemapID}, { x: ${x}, y: ${y} })`);
                }

                SceneModifier.focusedTilemap.AddTile(new Tile(
                    this.#tile.palette,
                    this.#tile.spriteID,
                    pos
                ));

                window.parent.RefractBack(`SceneManager.AddTile(${SceneModifier.focusedTilemapID}, { palette: \"${this.#tile.palette}\", spriteID: ${this.#tile.spriteID}, position: { x: ${x}, y: ${y} } })`);
            }
        }

        this.Deselect();
    }

    TransformSelection (dir)
    {
        if (this.#selectStart == null || dir.Equals(Vector2.zero)) return;

        for (let i = 0; i < this.#selection.length; i++)
        {
            SceneModifier.focusedTilemap.RemoveTileByPosition(this.#selection[i].position);

            window.parent.RefractBack(`SceneManager.RemoveTile(${SceneModifier.focusedTilemapID}, { x: ${this.#selection[i].position.x}, y: ${this.#selection[i].position.y} })`);
        }

        for (let i = 0; i < this.#selection.length; i++)
        {
            const newPos = Vector2.Add(this.#selection[i].position, SceneModifier.focusedGrid.WorldToCell(dir));

            const existingTile = SceneModifier.focusedTilemap.GetTile(newPos);

            if (existingTile != null)
            {
                this.#existingTiles.push(existingTile);

                SceneModifier.focusedTilemap.RemoveTileByPosition(existingTile.position);

                window.parent.RefractBack(`SceneManager.RemoveTile(${SceneModifier.focusedTilemapID}, { x: ${existingTile.position.x}, y: ${existingTile.position.y} })`);
            }
            
            this.#selection[i].position = newPos;

            SceneModifier.focusedTilemap.AddTile(this.#selection[i]);

            window.parent.RefractBack(`SceneManager.AddTile(${SceneModifier.focusedTilemapID}, { palette: \"${this.#selection[i].palette}\", spriteID: ${this.#selection[i].spriteID}, position: { x: ${this.#selection[i].position.x}, y: ${this.#selection[i].position.y} } })`);
        }

        for (let i = 0; i < this.#existingTiles.length; i++)
        {
            if (this.#selection.find(item => item.position.Equals(this.#existingTiles[i].position)) != null) return;

            SceneModifier.focusedTilemap.AddTile(this.#existingTiles[i]);

            window.parent.RefractBack(`SceneManager.AddTile(${SceneModifier.focusedTilemapID}, { palette: \"${this.#existingTiles[i].palette}\", spriteID: ${this.#existingTiles[i].spriteID}, position: { x: ${this.#existingTiles[i].position.x}, y: ${this.#existingTiles[i].position.y} } })`);
        }

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
    }

    RectAction ()
    {
        
    }
}