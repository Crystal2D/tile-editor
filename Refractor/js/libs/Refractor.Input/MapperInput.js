class MapperInput extends GameBehavior
{
    #inputHandler = null;
    #background = null;

    Start ()
    {
        this.#inputHandler = this.GetComponent("InputHandler");
        this.#background = GameObject.Find("background");

        let bgLayerID = SortingLayer.layers.find(item => item.name === "Refractor Background")?.id;

        if (bgLayerID == null)
        {
            bgLayerID = SortingLayer.layers.length;

            SortingLayer.Add([new SortingLayer("Refractor Background", bgLayerID, -65536)]);
        }

        this.#background.GetComponent("RectRenderer").sortingLayer = bgLayerID;
    }

    SetBounds (size)
    {
        this.#background.transform.scale = size;
        this.#inputHandler.maxZoom = Math.max(size.x, size.y) * 2 + 0.25;
        this.#inputHandler.bounds = new Bounds(Vector2.zero, size);
    }
}