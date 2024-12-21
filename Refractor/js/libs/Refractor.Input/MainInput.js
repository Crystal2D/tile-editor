class MainInput extends GameBehavior
{
    #gridScale = Vector2.one;

    #inputHandler = null;
    // #selectionRect = null;
    // #selectionRenderer = null;
    #existingTile = null;
    #tile = null;
    #preview = null;
    #previewRenderer = null;

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
        // this.#selectionRect = GameObject.Find("selection_rect");
    }

    Update ()
    {
        if (this.#preview == null) return;

        const grid = SceneModifier.focusedGrid;
        const tilemap = SceneModifier.focusedTilemap;

        if (grid == null || tilemap == null)
        {
            if (this.#preview.activeSelf) this.#preview.SetActive(false);

            return;
        }

        const gridPos = grid.WorldToCell(this.#inputHandler.mousePosSnapped);

        if (this.#existingTile != null && !this.#existingTile.position.Equals(gridPos))
        {
            tilemap.AddTile(this.#existingTile);

            this.#existingTile = null;
        }

        if (!this.#preview.activeSelf) this.#preview.SetActive(true);

        const gridScale = new Vector2(grid.transform.scale.x, grid.transform.scale.y);

        if (!this.#gridScale.Equals(gridScale))
        {
            // this.#selectionRect.transform.scale = gridSize;

            this.#preview.transform.scale = gridScale;

            this.#gridScale = gridScale;
        }

        const hoveredTile = tilemap.GetTile(gridPos);

        if (hoveredTile != null && (hoveredTile.palette !== this.#tile.palette || hoveredTile.spriteID !== this.#tile.spriteID))
        {
            this.#existingTile = hoveredTile;

            tilemap.RemoveTileByPosition(gridPos);
        }

        this.#preview.transform.position = this.#inputHandler.mousePosSnapped;

        if (InputManager.GetKey("left") && (this.#existingTile?.palette !== this.#tile.palette || this.#existingTile?.spriteID !== this.#tile.spriteID))
        {
            tilemap.AddTile(new Tile(
                this.#tile.palette,
                this.#tile.spriteID,
                gridPos
            ));

            this.#existingTile = null;

            window.parent.RefractBack(`SceneManager.AddTile(${SceneModifier.focusedTilemapID}, { palette: \"${this.#tile.palette}\", spriteID: ${this.#tile.spriteID}, position: { x: ${gridPos.x}, y: ${gridPos.y} } })`);
        }

        // if (InputManager.GetKey("left")) this.#testMap.RemoveTileByPosition(this.#grid.WorldToCell(snappedPos));
    }
}