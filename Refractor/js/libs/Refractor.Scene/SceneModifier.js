class SceneModifier
{
    static #focusedGrid = null;
    static #gridComponent = null;

    static get focusedGrid ()
    {
        return this.#gridComponent;
    }

    static FocusGrid (id)
    {
        this.UnfocusGrid();

        this.#focusedGrid = SceneBank.FindByID(id);
        this.#focusedGrid.GetComponent("GridRenderer").color.a = 0.75;
        this.#gridComponent = this.#focusedGrid.GetComponent("Grid");
    }

    static UnfocusGrid ()
    {
        if (this.#focusedGrid == null) return;
            
        this.#focusedGrid.GetComponent("GridRenderer").color.a = 0;
        this.#focusedGrid = null;
        this.#gridComponent = null;
    }

    static ChangeParent (childID, parentID)
    {
        const child = SceneBank.FindByID(childID);
        const parent = SceneBank.FindByID(parentID);

        if (child == null || parent == null) return;

        child.transform.parent = parent.transform;

        const tilemap = child.GetComponent("Tilemap");

        if (tilemap != null) tilemap.grid = parent.GetComponent("Grid");
    }
}