class SceneModifier
{
    static #focusedGrid = null;
    static #gridID = null;
    static #gridComponent = null;
    static #focusedMap = null;
    static #mapID = null;

    static get focusedGrid ()
    {
        return this.#gridComponent;
    }

    static get focusedGridID ()
    {
        return this.#gridID;
    }

    static get focusedTilemap ()
    {
        return this.#focusedMap;
    }

    static get focusedTilemapID ()
    {
        return this.#mapID;
    }

    static FocusGrid (id)
    {
        this.UnfocusGrid();

        this.#focusedGrid = SceneBank.FindByID(id);
        this.#focusedGrid.GetComponent("GridRenderer").color.a = 0.5;
        this.#gridID = id;
        this.#gridComponent = this.#focusedGrid.GetComponent("Grid");
    }

    static UnfocusGrid ()
    {
        if (this.#focusedGrid == null) return;
            
        this.#gridComponent = null;
        this.#gridID = null;
        this.#focusedGrid.GetComponent("GridRenderer").color.a = 0;
        this.#focusedGrid = null;
    }

    static FocusTilemap (id)
    {
        this.UnfocusTilemap();

        this.#focusedMap = SceneBank.FindByID(id).GetComponent("Tilemap");
        this.#mapID = id;
    }

    static UnfocusTilemap ()
    {
        if (this.#focusedMap == null) return;
        
        this.#mapID = null;
        this.#focusedMap = null;
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