class RectDraggable
{
    #mouseOver = false;
    #moving = false;

    #clickedPos = null;
    #clickOffset = null;

    onMouseEnter = () => { };
    onMouseExit = () => { };
    onMouseDown = () => { };
    onMouseUp = () => { };
    onDrag = (position) => { };

    rect = null;

    get isMouseOver ()
    {
        return this.#mouseOver;
    }

    Update (mousePos)
    {
        const hovered = this.rect.Contains(mousePos);

        if (this.#mouseOver !== hovered)
        {
            if (hovered) this.onMouseEnter();
            else this.onMouseExit();

            this.#mouseOver = hovered;
        }

        if (hovered && InputManager.GetKeyDown("left"))
        {
            this.onMouseDown();

            this.#clickedPos = mousePos;
            this.#clickOffset = Vector2.Subtract(this.rect.center, this.#clickedPos);
        }

        if (this.#clickOffset == null) return;
        
        if (!this.#clickedPos.Equals(mousePos)) this.#moving = true;

        if (InputManager.GetKeyUp("left"))
        {
            this.onMouseUp();

            this.#moving = false;
            this.#clickedPos = null;
            this.#clickOffset = null;
        }

        if (this.#moving)
        {
            const newPos = Vector2.Add(mousePos, this.#clickOffset);

            this.onDrag(newPos);
        }
    }
}