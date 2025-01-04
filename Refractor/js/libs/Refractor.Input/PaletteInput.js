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
        const tilemap = SceneModifier.focusedTilemap;

        if (grid == null || tilemap == null) return;

        const hoveredTile = tilemap.GetTile(grid.WorldToCell(this.#inputHandler.mousePosSnapped));

        if (hoveredTile != null && InputManager.GetKeyDown("left") && this.#focusedTile !== hoveredTile)
        {
            this.#selectionRect.transform.position = this.#inputHandler.mousePosSnapped;
            this.#selectionRenderer.color = new Color(0, 1, 1);

            this.#focusedTile = hoveredTile;

            window.parent.RefractBack(`SceneView.Refract("GameObject.FindComponents(\\"MainInput\\")[0].tile = { palette: \\"${hoveredTile.palette}\\", spriteID: ${hoveredTile.spriteID} }");`);
        }

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
}