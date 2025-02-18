class CircleDragInput extends GameBehavior
{
    #mouseOver = false;
    #moving = false;

    #inputHandler = null;
    #mapperInput = null;
    #cam = null;
    #clickedPos = null;
    #clickOffset = null;

    get isMouseOver ()
    {
        return this.#mouseOver;
    }

    Start ()
    {
        const handlers = GameObject.Find("handlers");

        this.#inputHandler = handlers.GetComponent("InputHandler");
        this.#mapperInput = handlers.GetComponent("MapperInput");
        this.#cam = GameObject.Find("camera").GetComponent("Camera");
    }

    Update ()
    {
        const mousePos = this.#inputHandler.mousePos;
        const hovered = Vector2.Distance(mousePos, this.transform.position) <= (this.#cam.orthographicSize * 0.15 * (4 / 40));

        if (this.#mouseOver !== hovered)
        {
            if (hovered) this.#OnMouseEnter();
            else this.#OnMouseExit();

            this.#mouseOver = hovered;
        }

        if (hovered && InputManager.GetKeyDown("left"))
        {
            this.#OnMouseDown();

            this.#clickedPos = mousePos;
            this.#clickOffset = Vector2.Subtract(this.transform.position, this.#clickedPos);
        }

        if (this.#clickOffset == null) return;
        
        if (!this.#clickedPos.Equals(mousePos)) this.#moving = true;

        if (InputManager.GetKeyUp("left"))
        {
            this.#OnMouseUp();
            
            this.#moving = false;
            this.#clickedPos = null;
            this.#clickOffset = null;
        }

        if (this.#moving)
        {
            const newPos = Vector2.Add(mousePos, this.#clickOffset);

            this.#OnDrag(newPos);
        }
    }

    #OnMouseEnter ()
    {
        this.#mapperInput.SetCursor("move");
    }

    #OnMouseExit ()
    {
        this.#mapperInput.SetCursor("");
    }

    #OnMouseDown ()
    {
        this.#mapperInput.cursorLocked = true;
    }

    #OnMouseUp ()
    {
        this.#mapperInput.cursorLocked = false;

        this.#mapperInput.SetCursor("");
    }

    #OnDrag (pos)
    {
        pos = Vector2.Clamp(
            pos,
            this.#mapperInput.focused.rect.min,
            this.#mapperInput.focused.rect.max,
        );

        this.transform.position = pos;
    }
}