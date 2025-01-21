class PaletteInput extends GameBehavior
{
    #gridSize = Vector2.one;

    #inputHandler = null;
    #focusedTile = null;
    #lastFocusedTile = null;
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

    DeselectBase ()
    {
        this.#focusedTile = null;
        this.#selectionRenderer.color = new Color(0, 0, 0, 0);

        window.parent.RefractBack("SceneView.Refract(\"GameObject.FindComponents(\\\"MainInput\\\")[0].tile = null\");");
    }

    Deselect (fromPaletteLoad)
    {
        const lastTilePos = this.#focusedTile?.position;

        if (lastTilePos == null) return;

        if (fromPaletteLoad) window.parent.RefractBack(`
            ActionManager.Record(
                "Palette.MapLoad",
                () => Palette.PaletteView().Refract("GameObject.FindComponents(\\"PaletteInput\\")[0].DeselectBase()"),
                () => Palette.PaletteView().Refract("GameObject.FindComponents(\\"PaletteInput\\")[0].SelectTileByPosBase(new Vector2(${lastTilePos.x}, ${lastTilePos.y}))")
            );
        `);
        else window.parent.RefractBack(`
            ActionManager.StartRecording("Palette.TileDeselect");
            ActionManager.Record(
                "Palette.TileDeselect",
                () => Palette.PaletteView().Refract("GameObject.FindComponents(\\"PaletteInput\\")[0].DeselectBase()"), 
                () => Palette.PaletteView().Refract("GameObject.FindComponents(\\"PaletteInput\\")[0].SelectTileByPosBase(new Vector2(${lastTilePos.x}, ${lastTilePos.y}))")
            );
            ActionManager.StopRecording("Palette.TileDeselect");
        `);
    }

    SelectTileByPosBase (pos)
    {
        if (SceneModifier.focusedGrid == null || SceneModifier.focusedTilemap == null) return;

        const tile = SceneModifier.focusedTilemap.GetTile(pos);

        if (tile == null || this.#focusedTile === tile) return;
        
        this.#selectionRect.transform.position = SceneModifier.focusedGrid.CellToWorld(pos);
        this.#selectionRenderer.color = new Color(0, 1, 1);

        this.#focusedTile = tile;
        this.#lastFocusedTile = tile;

        window.parent.RefractBack(`SceneView.Refract("GameObject.FindComponents(\\"MainInput\\")[0].tile = { palette: \\"${tile.palette}\\", spriteID: ${tile.spriteID} }")`);
    }

    SelectTileByPos (pos)
    {
        if (SceneModifier.focusedGrid == null || SceneModifier.focusedTilemap == null) return;

        const tile = SceneModifier.focusedTilemap.GetTile(pos);

        if (tile == null || this.#focusedTile === tile) return;

        const lastTilePos = this.#focusedTile?.position;

        window.parent.RefractBack("ActionManager.StartRecording(\"Palette.TileSelect\")");

        if (lastTilePos == null) window.parent.RefractBack(`
            ActionManager.Record(
                "Palette.TileSelect",
                () => Palette.PaletteView().Refract("GameObject.FindComponents(\\"PaletteInput\\")[0].SelectTileByPosBase(new Vector2(${pos.x}, ${pos.y}))"),
                () => Palette.PaletteView().Refract("GameObject.FindComponents(\\"PaletteInput\\")[0].DeselectBase()")
            );
        `);
        else window.parent.RefractBack(`
            ActionManager.Record(
                "Palette.TileSelect",
                () => Palette.PaletteView().Refract("GameObject.FindComponents(\\"PaletteInput\\")[0].SelectTileByPosBase(new Vector2(${pos.x}, ${pos.y}))"),
                () => Palette.PaletteView().Refract("GameObject.FindComponents(\\"PaletteInput\\")[0].SelectTileByPosBase(new Vector2(${lastTilePos.x}, ${lastTilePos.y}))")
            );
        `);

        window.parent.RefractBack("ActionManager.StopRecording(\"Palette.TileSelect\")");
    }
}