class MainInput extends GameBehavior
{
    #inputHandler = null;
    #selectionRect = null;
    #selectionRenderer = null;
    #existingTile = null;
    #tile = null;
    #preview = null;
    #previewRenderer = null;
    #selectStart = null;
    #selectEnd = null;

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

        if (this.#existingTile != null && !this.#existingTile.position.Equals(gridPos))
        {
            tilemap.AddTile(this.#existingTile);

            this.#existingTile = null;
        }

        this.SelectAction(grid);
    }

    PencilAction (tilemap, grid, gridPos)
    {
        if (this.#selectionRenderer.color.a !== 0) this.#selectionRenderer.color = new Color(0, 0, 0, 0);

        if (this.#preview == null) return;

        if (InputManager.isMouseOver && !this.#preview.activeSelf) this.#preview.SetActive(true);
        else if (!InputManager.isMouseOver) this.#preview.SetActive(false);

        const gridScale = new Vector2(grid.transform.scale.x, grid.transform.scale.y);

        if (!this.#preview.transform.scale.Equals(gridScale)) this.#preview.transform.scale = gridScale;

        this.#preview.transform.position = this.#inputHandler.mousePosSnapped;

        const hoveredTile = tilemap.GetTile(gridPos);

        if (hoveredTile != null && (hoveredTile.palette !== this.#tile.palette || hoveredTile.spriteID !== this.#tile.spriteID))
        {
            this.#existingTile = hoveredTile;

            tilemap.RemoveTileByPosition(gridPos);
        }

        if (!InputManager.GetKey("left") || (this.#existingTile?.palette === this.#tile.palette && this.#existingTile?.spriteID === this.#tile.spriteID)) return;
        
        tilemap.AddTile(new Tile(
            this.#tile.palette,
            this.#tile.spriteID,
            gridPos
        ));

        this.#existingTile = null;

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

        if (!InputManager.GetKey("left")) return;

        tilemap.RemoveTileByPosition(gridPos);

        window.parent.RefractBack(`SceneManager.RemoveTile(${SceneModifier.focusedTilemapID}, { x: ${gridPos.x}, y: ${gridPos.y} })`);
    }

    SelectAction (grid)
    {
        if (this.#preview != null && this.#preview.activeSelf) this.#preview.SetActive(false);

        if (InputManager.GetKeyDown("left")) this.#selectStart = this.#inputHandler.mousePosSnapped;

        if (this.#selectStart != null && InputManager.GetKey("left"))
        {
            if (InputManager.isMouseOver && !this.#selectionRenderer.color.Equals(new Color(0, 1, 1))) this.#selectionRenderer.color = new Color(0, 1, 1);
            else if (!InputManager.isMouseOver) this.#selectionRenderer.color = new Color(0, 0, 0, 0);

            this.#selectEnd = this.#inputHandler.mousePosSnapped;

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

        if (Input.GetKeyDown(KeyCode.Delete)) this.DeleteSelection();
        if (Input.GetKeyDown(KeyCode.F)) this.FillSelection();
    }

    Deselect ()
    {
        this.#selectStart = null;
        this.#selectEnd = null;
        this.#selectionRenderer.color = new Color(0, 0, 0, 0);
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

        const tiles = this.#GetSelection();

        for (let i = 0; i < tiles.length; i++) SceneModifier.focusedTilemap.RemoveTileByPosition(tiles[i].position);

        if (tiles.length > 0) this.Deselect();
    }

    FillSelection ()
    {
        if (this.#selectStart == null || this.#tile == null) return;

        const tiles = this.#GetSelection();

        for (let i = 0; i < tiles.length; i++) SceneModifier.focusedTilemap.RemoveTileByPosition(tiles[i].position);

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
                SceneModifier.focusedTilemap.AddTile(new Tile(
                    this.#tile.palette,
                    this.#tile.spriteID,
                    new Vector2(x, y)
                ));
            }
        }

        this.Deselect();
    }

    RectAction ()
    {
        
    }
}