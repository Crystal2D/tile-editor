class CircleDragInput extends GameBehavior
{
    #enabled = false;
    #mouseOver = false;
    #moving = false;
    #lettingGo = false;

    #inputHandler = null;
    #mapperInput = null;
    #renderer = null;
    #outline = null;
    #cam = null;
    #clickedPos = null;
    #clickOffset = null;

    get isMouseOver ()
    {
        return this.#mouseOver;
    }

    get isHeld ()
    {
        return this.#clickedPos != null;
    }

    LetGo ()
    {
        this.#lettingGo = true;
    }

    SetActive (state)
    {
        if (state === this.#enabled) return;

        this.#enabled = state;

        this.#renderer.color.a = +state;
        this.#outline.SetActive(state);
    }

    Start ()
    {
        const handlers = GameObject.Find("handlers");
        this.#inputHandler = handlers.GetComponent("InputHandler");
        this.#mapperInput = handlers.GetComponent("MapperInput");
        this.#renderer = this.GetComponent("CircleRenderer");

        this.#outline = GameObject.Find("pivot_outline");
        this.#outline.SetActive(false);

        this.#cam = GameObject.Find("camera").GetComponent("Camera");
    }

    Update ()
    {
        if (!this.#enabled) return;

        const mousePos = this.#inputHandler.mousePos;
        const hovered = Vector2.Distance(mousePos, this.transform.position) <= (this.#cam.orthographicSize * 0.15 * (4.5 / 40));

        let lettingGo = this.#lettingGo;

        if (lettingGo) this.#lettingGo = false;

        if (this.#mouseOver !== hovered)
        {
            if (hovered) this.#OnMouseEnter();
            else this.#OnMouseExit();

            this.#mouseOver = hovered;
        }

        if (hovered && Input.GetMouseButtonDown(0))
        {
            this.#OnMouseDown();

            this.#clickedPos = mousePos;
            this.#clickOffset = Vector2.Subtract(this.transform.position, this.#clickedPos);
        }

        if (this.#clickOffset == null) return;

        if (!this.#clickedPos.Equals(mousePos)) this.#moving = true;
        
        if (Input.GetMouseButtonUp(0)) lettingGo = true;

        if (lettingGo)
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
        this.#mapperInput.StartRecording();
        this.#mapperInput.cursorLocked = true;
    }

    #OnMouseUp ()
    {
        this.#mapperInput.StopRecording();
        this.#mapperInput.cursorLocked = false;

        if (!this.isMouseOver) this.#mapperInput.SetCursor("");
    }

    #OnDrag (pos)
    {
        const rect = this.#mapperInput.focused.rect

        pos = Vector2.Clamp(
            pos,
            rect.min,
            rect.max,
        );

        this.transform.position = pos;

        const pivot = new Vector2(
            ((pos.x - rect.xMin) / (rect.xMax - rect.xMin)).toFixed(4),
            ((pos.y - rect.yMax) / (rect.yMin - rect.yMax)).toFixed(4)
        );

        this.#mapperInput.focused.pivot = pivot;

        window.parent.RefractBack(`SetPivot(${pivot.x}, ${pivot.y})`);
    }
}