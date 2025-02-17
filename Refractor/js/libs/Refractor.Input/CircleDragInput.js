class CircleDragInput extends GameBehavior
{
    #inputHandler = null;
    #mapperInput = null;
    #renderer = null;
    #cam = null;
    #rect = null;

    Start ()
    {
        const handlers = GameObject.Find("handlers");

        this.#inputHandler = handlers.GetComponent("InputHandler");
        this.#mapperInput = handlers.GetComponent("MapperInput");
        this.#renderer = this.GetComponent("CircleRenderer");
        this.#cam = GameObject.Find("camera").GetComponent("Camera");
    }

    Update ()
    {
        const mousePos = this.#inputHandler.mousePos;

        if (Vector2.Distance(mousePos, this.transform.position) > (this.#cam.orthographicSize * 0.15 * (4 / 40))) return;

        this.#mapperInput.SetCursor("move");
    }
}