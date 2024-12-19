class PaletteInput extends GameBehavior
{
    #inputHandler = null;
    #selectionRect = null;
    #selectionRenderer = null;
    #gridSize = Vector2.one;

    Start ()
    {
        this.#inputHandler = this.GetComponent("InputHandler");
        this.#selectionRect = GameObject.Find("selection_rect");
        this.#selectionRenderer = this.#selectionRect.GetComponent("RectRenderer");
    }

    Update ()
    {
        const grid = SceneModifier.focusedGrid;

        if (grid == null) return;

        if (InputManager.GetKeyDown("left"))
        {
            this.#selectionRect.transform.position = this.#inputHandler.mousePosSnapped;
            
            this.#selectionRenderer.color = new Color(120 / 255, 130 / 255, 170 / 255);
        }

        const gridSize = Vector2.Add(grid.cellSize, grid.cellGap);

        if (!this.#gridSize.Equals(gridSize))
        {
            this.#selectionRect.transform.scale = gridSize;

            this.#gridSize = gridSize;
        }
    }
}