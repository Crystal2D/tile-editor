class SpriteRectInput extends GameBehavior
{
    #moving = false;

    #inputHandler = null;
    #mapperInput = null;
    #renderer = null;
    #clickedPos = null;
    #clickOffset = null;

    get rect ()
    {
        const output = new Rect();
        output.size = new Vector2(this.transform.scale.x, this.transform.scale.y);
        output.center = new Vector2(this.transform.position.x, this.transform.position.y);

        return output;
    }

    Start ()
    {
        const handlers = GameObject.Find("handlers");

        this.#inputHandler = handlers.GetComponent("InputHandler");
        this.#mapperInput = handlers.GetComponent("MapperInput");
        this.#renderer = this.GetComponent("RectRenderer");
    }

    Update ()
    {
        const hovered = this.rect.Contains(this.#inputHandler.mousePos);
        
        if (hovered && InputManager.GetKeyDown("left"))
        {
            if (this.#mapperInput.focused != this)
            {
                if (this.#mapperInput.focused != null)
                {
                    if (this.#mapperInput.focused.rect.Contains(this.#inputHandler.mousePos)) return;

                    this.#mapperInput.focused.Unfocus();
                }

                this.#mapperInput.focused = this;
                this.#renderer.color = new Color(0, 1, 1);
                this.#renderer.thickness = 4;
                this.#renderer.sortingOrder = 1;
            }

            this.#clickedPos = this.#inputHandler.mousePos;
            this.#clickOffset = Vector2.Subtract(this.transform.position, this.#clickedPos);
        }

        if (this.#mapperInput.focused != this) return;

        if (this.#clickedPos != null && !this.#clickedPos.Equals(this.#inputHandler.mousePos))
        {
            this.#moving = true;
            this.#clickedPos = null;
        }

        if (this.#moving) this.transform.position = Vector2.Add(this.#inputHandler.mousePos, this.#clickOffset);

        if (InputManager.GetKeyUp("left"))
        {
            this.#moving = false;
            this.#clickedPos = null;
        }
    }

    Unfocus ()
    {
        this.#mapperInput.focused = null;
        this.#renderer.color = Color.white;
        this.#renderer.thickness = 1;
        this.#renderer.sortingOrder = 0;
        this.#moving = false;
        this.#clickedPos = null;
        this.#clickOffset = null;
    }
}