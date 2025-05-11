class RectDraggable
{
    #mouseOver = false;
    #moving = false;
    #lettingGo = false;

    #clickedPos = null;
    #clickOffset = null;

    onMouseEnter = () => { };
    onMouseExit = () => { };
    onMouseDown = () => { };
    onMouseUp = () => { };
    onDrag = (position, positionRaw) => { };

    rect = null;

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

    Update (mousePos)
    {
        const hovered = this.rect.Contains(mousePos);
        let lettingGo = this.#lettingGo;

        if (lettingGo) this.#lettingGo = false;

        if (this.#mouseOver !== hovered)
        {
            if (hovered) this.onMouseEnter();
            else this.onMouseExit();

            this.#mouseOver = hovered;
        }

        if (hovered && Input.GetMouseButtonDown(0))
        {
            this.onMouseDown();

            this.#clickedPos = mousePos;
            this.#clickOffset = Vector2.Subtract(this.rect.center, this.#clickedPos);
        }

        if (this.#clickOffset == null) return;
        
        if (!this.#clickedPos.Equals(mousePos)) this.#moving = true;
        
        if (Input.GetMouseButtonUp(0)) lettingGo = true;

        if (lettingGo)
        {
            this.onMouseUp();
            
            this.#moving = false;
            this.#clickedPos = null;
            this.#clickOffset = null;
        }

        if (this.#moving)
        {
            const newPos = Vector2.Add(mousePos, this.#clickOffset);

            this.onDrag(
                new Vector2(
                    Math.round(newPos.x),
                    Math.round(newPos.y)
                ),
                newPos
            );
        }
    }
}