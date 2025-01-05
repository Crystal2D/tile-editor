class PaletteInput extends GameBehavior
{
    #gridSize = Vector2.one;

    #inputHandler = null;
    #focusedTile = null;
    #selectionRect = null;
    #selectionRenderer = null;

    Start ()
    {
        this.#inputHandler = this.GetComponent("InputHandler");
        this.#selectionRect = GameObject.Find("selection_rect");
        this.#selectionRenderer = this.#selectionRect.GetComponent("RectRenderer");
    }

    Update ()
    {
        const grid = SceneModifier.focusedGrid;
        
        if (grid == null || SceneModifier.focusedTilemap == null) return;
        
        if (InputManager.GetKeyDown("left")) this.SelectTileByPos(grid.WorldToCell(this.#inputHandler.mousePosSnapped));

       const gridSize = Vector2.Add(grid.cellSize, grid.cellGap);

        if (!this.#gridSize.Equals(gridSize))
        {
            this.#selectionRect.transform.scale = gridSize;

            this.#gridSize = gridSize;
        }
    }

    Deselect ()
    {
        this.#focusedTile = null;
        this.#selectionRenderer.color = new Color(0, 0, 0, 0);

        window.parent.RefractBack("SceneView.Refract(\"GameObject.FindComponents(\\\"MainInput\\\")[0].tile = null\");");
    }

    SelectTileByPos (pos)
    {
        if (SceneModifier.focusedGrid == null || SceneModifier.focusedTilemap == null) return;

        const tile = SceneModifier.focusedTilemap.GetTile(pos);

        if (tile == null || this.#focusedTile === tile) return;
        
        this.#selectionRect.transform.position = SceneModifier.focusedGrid.CellToWorld(pos);
        this.#selectionRenderer.color = new Color(0, 1, 1);

        this.#focusedTile = tile;

        window.parent.RefractBack(`SceneView.Refract("GameObject.FindComponents(\\"MainInput\\")[0].tile = { palette: \\"${tile.palette}\\", spriteID: ${tile.spriteID} }");`);
        
    }
}