class SpriteRectInput extends GameBehavior
{
    #posDraggable = new RectDraggable();
    #upDraggable = new RectDraggable();
    #downDraggable = new RectDraggable();
    #leftDraggable = new RectDraggable();
    #rightDraggable = new RectDraggable();
    #upleftDraggable = new RectDraggable();
    #uprightDraggable = new RectDraggable();
    #downleftDraggable = new RectDraggable();
    #downrightDraggable = new RectDraggable();

    #inputHandler = null;
    #mapperInput = null;
    #renderer = null;
    #cam = null;
    #rect = null;
    #onWheel = null;

    spriteName = "";
    pivot = new Vector2(0.5, 0.5);

    get rect ()
    {
        return new Rect(this.#rect.x, this.#rect.y, this.#rect.width, this.#rect.height);
    }

    get finalRect ()
    {
        return new Rect(
            this.#rect.x + this.#mapperInput.baseWidth,
            -this.#rect.yMax + this.#mapperInput.baseHeight,
            this.#rect.width,
            this.#rect.height
        );
    }

    get hovered ()
    {
        return this.#mapperInput.pivot.isMouseOver || this.#posDraggable.isMouseOver || this.#upDraggable.isMouseOver || this.#downDraggable.isMouseOver || this.#leftDraggable.isMouseOver || this.#rightDraggable.isMouseOver || this.#upleftDraggable.isMouseOver || this.#uprightDraggable.isMouseOver || this.#downleftDraggable.isMouseOver || this.#downrightDraggable.isMouseOver;
    }

    OnEnable ()
    {
        this.#onWheel = InputManager.onWheel.Add(() => this.#RecalcDraggables(true));
    }

    OnDisable ()
    {
        InputManager.onWheel.Remove(this.#onWheel);
    }

    SetBaseRect ()
    {
        this.#rect = new Rect();
        this.#rect.size = new Vector2(this.transform.scale.x, this.transform.scale.y);
        this.#rect.center = new Vector2(this.transform.position.x, this.transform.position.y);

        this.#RecalcDraggables(true);
    }

    LetGo ()
    {
        this.#posDraggable.LetGo();
        this.#upDraggable.LetGo();
        this.#downDraggable.LetGo();
        this.#leftDraggable.LetGo();
        this.#rightDraggable.LetGo();
        this.#upleftDraggable.LetGo();
        this.#uprightDraggable.LetGo();
        this.#downleftDraggable.LetGo();
        this.#downrightDraggable.LetGo();
    }

    Start ()
    {
        const handlers = GameObject.Find("handlers");

        this.#inputHandler = handlers.GetComponent("InputHandler");
        this.#mapperInput = handlers.GetComponent("MapperInput");
        this.#renderer = this.GetComponent("RectRenderer");
        this.#cam = GameObject.Find("camera").GetComponent("Camera");

        this.SetBaseRect();

        const onMouseDown = () => {
            this.#mapperInput.StartRecording();
            this.#mapperInput.cursorLocked = true;
        };
        const onMouseUp = () => {
            this.#mapperInput.StopRecording();
            this.#mapperInput.cursorLocked = false;
        };

        this.#posDraggable.onMouseDown = () => this.Focus();
        this.#posDraggable.onMouseUp = () => onMouseUp();
        this.#posDraggable.onDrag = (pos, posRaw) => {
            if (this.#mapperInput.focused !== this) return;

            if (!this.#mapperInput.cursorLocked)
            {
                this.#mapperInput.StartRecording();

                this.#mapperInput.SetCursor("");
                this.#mapperInput.cursorLocked = true;
            }

            this.#rect.position = Vector2.Clamp(
                new Vector2(
                    Math.round(posRaw.x - this.#rect.width * 0.5),
                    Math.round(posRaw.y - this.#rect.height * 0.5)
                ),
                new Vector2(-this.#mapperInput.baseWidth, -this.#mapperInput.baseHeight),
                Vector2.Add(
                    new Vector2(this.#mapperInput.baseWidth, this.#mapperInput.baseHeight),
                    new Vector2(-this.#rect.width, -this.#rect.height)
                )
            );
            this.transform.position = this.#rect.center;
            
            this.#RecalcDraggables();
        };

        this.#upDraggable.onMouseEnter = () => this.#mapperInput.SetCursor("n-resize");
        this.#upDraggable.onMouseExit = () => this.#mapperInput.SetCursor("");
        this.#upDraggable.onMouseDown = () => onMouseDown();
        this.#upDraggable.onMouseUp = () => {
            onMouseUp();

            if (!this.#upDraggable.isMouseOver) this.#mapperInput.SetCursor("");
        };
        this.#upDraggable.onDrag = pos => {
            this.#rect.yMax = Math.Clamp(
                pos.y,
                this.#rect.yMin + 1,
                this.#mapperInput.baseHeight
            );
            this.transform.position = this.#rect.center;
            this.transform.scale = this.#rect.size;

            this.#RecalcDraggables();
        };

        this.#downDraggable.onMouseEnter = () => this.#mapperInput.SetCursor("s-resize");
        this.#downDraggable.onMouseExit = () => this.#mapperInput.SetCursor("");
        this.#downDraggable.onMouseDown = () => onMouseDown();
        this.#downDraggable.onMouseUp = () => {
            onMouseUp();

            if (!this.#downDraggable.isMouseOver) this.#mapperInput.SetCursor("");
        };
        this.#downDraggable.onDrag = pos => {
            this.#rect.yMin = Math.Clamp(
                pos.y,
                -this.#mapperInput.baseHeight,
                this.#rect.yMax - 1
            );
            this.transform.position = this.#rect.center;
            this.transform.scale = this.#rect.size;

            this.#RecalcDraggables();
        };

        this.#leftDraggable.onMouseEnter = () => this.#mapperInput.SetCursor("w-resize");
        this.#leftDraggable.onMouseExit = () => this.#mapperInput.SetCursor("");
        this.#leftDraggable.onMouseDown = () => onMouseDown();
        this.#leftDraggable.onMouseUp = () => {
            onMouseUp();

            if (!this.#leftDraggable.isMouseOver) this.#mapperInput.SetCursor("");
        };
        this.#leftDraggable.onDrag = pos => {
            this.#rect.xMin = Math.Clamp(
                pos.x,
                -this.#mapperInput.baseWidth,
                this.#rect.xMax - 1
            );
            this.transform.position = this.#rect.center;
            this.transform.scale = this.#rect.size;

            this.#RecalcDraggables();
        };

        this.#rightDraggable.onMouseEnter = () => this.#mapperInput.SetCursor("e-resize");
        this.#rightDraggable.onMouseExit = () => this.#mapperInput.SetCursor("");
        this.#rightDraggable.onMouseDown = () => onMouseDown();
        this.#rightDraggable.onMouseUp = () => {
            onMouseUp();

            if (!this.#rightDraggable.isMouseOver) this.#mapperInput.SetCursor("");
        };
        this.#rightDraggable.onDrag = pos => {
            this.#rect.xMax = Math.Clamp(
                pos.x,
                this.#rect.xMin + 1,
                this.#mapperInput.baseWidth
            );
            this.transform.position = this.#rect.center;
            this.transform.scale = this.#rect.size;

            this.#RecalcDraggables();
        };

        this.#upleftDraggable.onMouseEnter = () => this.#mapperInput.SetCursor("nw-resize");
        this.#upleftDraggable.onMouseExit = () => this.#mapperInput.SetCursor("");
        this.#upleftDraggable.onMouseDown = () => onMouseDown();
        this.#upleftDraggable.onMouseUp = () => {
            onMouseUp();

            if (!this.#upleftDraggable.isMouseOver) this.#mapperInput.SetCursor("");
        };
        this.#upleftDraggable.onDrag = pos => {
            this.#rect.xMin = Math.Clamp(
                pos.x,
                -this.#mapperInput.baseWidth,
                this.#rect.xMax - 1
            );
            this.#rect.yMax = Math.Clamp(
                pos.y,
                this.#rect.yMin + 1,
                this.#mapperInput.baseHeight
            );
            this.transform.position = this.#rect.center;
            this.transform.scale = this.#rect.size;

            this.#RecalcDraggables();
        };

        this.#uprightDraggable.onMouseEnter = () => this.#mapperInput.SetCursor("ne-resize");
        this.#uprightDraggable.onMouseExit = () => this.#mapperInput.SetCursor("");
        this.#uprightDraggable.onMouseDown = () => onMouseDown();
        this.#uprightDraggable.onMouseUp = () => {
            onMouseUp();

            if (!this.#uprightDraggable.isMouseOver) this.#mapperInput.SetCursor("");
        };
        this.#uprightDraggable.onDrag = pos => {
            this.#rect.max = Vector2.Clamp(
                pos,
                Vector2.Add(this.#rect.min, 1),
                new Vector2(this.#mapperInput.baseWidth, this.#mapperInput.baseHeight)
            );
            this.transform.position = this.#rect.center;
            this.transform.scale = this.#rect.size;

            this.#RecalcDraggables();
        };

        this.#downleftDraggable.onMouseEnter = () => this.#mapperInput.SetCursor("sw-resize");
        this.#downleftDraggable.onMouseExit = () => this.#mapperInput.SetCursor("");
        this.#downleftDraggable.onMouseDown = () => onMouseDown();
        this.#downleftDraggable.onMouseUp = () => {
            onMouseUp();

            if (!this.#downleftDraggable.isMouseOver) this.#mapperInput.SetCursor("");
        };
        this.#downleftDraggable.onDrag = pos => {
            this.#rect.min = Vector2.Clamp(
                pos,
                new Vector2(-this.#mapperInput.baseWidth, -this.#mapperInput.baseHeight),
                Vector2.Add(this.#rect.max, -1)
            );
            this.transform.position = this.#rect.center;
            this.transform.scale = this.#rect.size;

            this.#RecalcDraggables();
        };

        this.#downrightDraggable.onMouseEnter = () => this.#mapperInput.SetCursor("se-resize");
        this.#downrightDraggable.onMouseExit = () => this.#mapperInput.SetCursor("");
        this.#downrightDraggable.onMouseDown = () => onMouseDown();
        this.#downrightDraggable.onMouseUp = () => {
            onMouseUp();

            if (!this.#downrightDraggable.isMouseOver) this.#mapperInput.SetCursor("");
        };
        this.#downrightDraggable.onDrag = pos => {
            this.#rect.xMax = Math.Clamp(
                pos.x,
                this.#rect.xMin + 1,
                this.#mapperInput.baseWidth
            );
            this.#rect.yMin = Math.Clamp(
                pos.y,
                -this.#mapperInput.baseHeight,
                this.#rect.yMax - 1
            );
            this.transform.position = this.#rect.center;
            this.transform.scale = this.#rect.size;

            this.#RecalcDraggables();
        };
    }

    #RecalcDraggables (ignoreOnDock)
    {
        if (!ignoreOnDock)
        {
            const position = this.finalRect.position;
            const size = this.finalRect.size;

            window.parent.RefractBack(`
                SetPosition(${position.x}, ${position.y});
                SetSize(${size.x}, ${size.y});
            `);

            this.#mapperInput.pivot.transform.position = new Vector2(
                this.#rect.xMin + (this.#rect.xMax - this.#rect.xMin) * this.pivot.x,
                this.#rect.yMax + (this.#rect.yMin - this.#rect.yMax) * this.pivot.y
            );
        }

        const halfThickness = (this.#cam.orthographicSize * 0.15 * (this.#renderer.thickness === 1 ? 0 : this.#renderer.thickness / 40));

        this.#posDraggable.rect = new Rect(this.#rect.x + halfThickness * 0.5, this.#rect.y + halfThickness * 0.5, this.#rect.width - halfThickness, this.#rect.height - halfThickness);

        this.#upDraggable.rect = new Rect(this.#posDraggable.rect.x, this.#rect.yMax - halfThickness * 0.5, this.#posDraggable.rect.width, halfThickness);
        this.#downDraggable.rect = new Rect(this.#posDraggable.rect.x, this.#rect.yMin - halfThickness * 0.5, this.#posDraggable.rect.width, halfThickness);
        this.#leftDraggable.rect = new Rect(this.#rect.xMin - halfThickness * 0.5, this.#posDraggable.rect.y, halfThickness, this.#posDraggable.rect.height);
        this.#rightDraggable.rect = new Rect(this.#rect.xMax - halfThickness * 0.5, this.#posDraggable.rect.y, halfThickness, this.#posDraggable.rect.height);

        this.#upleftDraggable.rect = new Rect(this.#rect.xMin - halfThickness * 0.5, this.#rect.yMax - halfThickness * 0.5, halfThickness, halfThickness);
        this.#uprightDraggable.rect = new Rect(this.#rect.xMax - halfThickness * 0.5, this.#rect.yMax - halfThickness * 0.5, halfThickness, halfThickness);
        this.#downleftDraggable.rect = new Rect(this.#rect.xMin - halfThickness * 0.5, this.#rect.yMin - halfThickness * 0.5, halfThickness, halfThickness);
        this.#downrightDraggable.rect = new Rect(this.#rect.xMax - halfThickness * 0.5, this.#rect.yMin - halfThickness * 0.5, halfThickness, halfThickness);
    }

    SetPosition (pos)
    {
        this.#rect.position = Vector2.Clamp(
            new Vector2(
                pos.x - this.#mapperInput.baseWidth,
                -pos.y + this.#mapperInput.baseHeight - this.#rect.height
            ),
            new Vector2(-this.#mapperInput.baseWidth, -this.#mapperInput.baseHeight),
            Vector2.Add(
                new Vector2(this.#mapperInput.baseWidth, this.#mapperInput.baseHeight),
                new Vector2(-this.#rect.width, -this.#rect.height)
            )
        );
        this.transform.position = this.#rect.center;

        this.#mapperInput.pivot.transform.position = new Vector2(
            this.#rect.xMin + (this.#rect.xMax - this.#rect.xMin) * this.pivot.x,
            this.#rect.yMax + (this.#rect.yMin - this.#rect.yMax) * this.pivot.y
        );
        
        this.#RecalcDraggables(true);
    }

    SetSize (size)
    {
        this.#rect.xMax = Math.Clamp(
            size.x + this.#rect.xMin,
            this.#rect.xMin + 1,
            this.#mapperInput.baseWidth
        );
        this.#rect.yMin = Math.Clamp(
            -size.y + this.#rect.yMax,
            -this.#mapperInput.baseHeight,
            this.#rect.yMax - 1
        );
        this.transform.position = this.#rect.center;
        this.transform.scale = this.#rect.size;

        this.#mapperInput.pivot.transform.position = new Vector2(
            this.#rect.xMin + (this.#rect.xMax - this.#rect.xMin) * this.pivot.x,
            this.#rect.yMax + (this.#rect.yMin - this.#rect.yMax) * this.pivot.y
        );
        
        this.#RecalcDraggables(true);
    }

    SetPivot (pivot)
    {
        this.pivot = pivot;

        this.#mapperInput.pivot.transform.position = new Vector2(
            this.#rect.xMin + (this.#rect.xMax - this.#rect.xMin) * this.pivot.x,
            this.#rect.yMax + (this.#rect.yMin - this.#rect.yMax) * this.pivot.y
        );
    }

    Update ()
    {
        if (this.#mapperInput.pivot.isMouseOver && !this.#posDraggable.isHeld) return;

        const mousePos = this.#inputHandler.mousePos;
        const focused = this.#mapperInput.focused === this;

        this.#posDraggable.Update(mousePos);

        if (this.#mapperInput.pivot.isMouseOver || !focused) return;

        this.#upDraggable.Update(mousePos);
        this.#downDraggable.Update(mousePos);
        this.#leftDraggable.Update(mousePos);
        this.#rightDraggable.Update(mousePos);

        this.#upleftDraggable.Update(mousePos);
        this.#uprightDraggable.Update(mousePos);
        this.#downleftDraggable.Update(mousePos);
        this.#downrightDraggable.Update(mousePos);
    }

    Focus (ignoreOnDock)
    {
        if (this.#mapperInput.focused === this) return;
        
        if (this.#mapperInput.focused != null)
        {
            if (this.#mapperInput.focused.hovered) return;
    
            this.#mapperInput.focused.Unfocus(true);
        }

        if (!ignoreOnDock) window.parent.RefractBack(`FocusSprite(${JSON.stringify(this.spriteName)})`);
    
        this.#mapperInput.focused = this;
        this.#mapperInput.outlineRect.SetActive(true);
        this.#mapperInput.outlineRect.transform.parent = this.#renderer.transform;
        this.#renderer.color = new Color(0, 1, 1);
        this.#renderer.thickness = 3;
        this.#renderer.sortingOrder = 2;

        this.#mapperInput.pivot.transform.position = new Vector2(
            this.#rect.xMin + (this.#rect.xMax - this.#rect.xMin) * this.pivot.x,
            this.#rect.yMax + (this.#rect.yMin - this.#rect.yMax) * this.pivot.y
        );
        this.#mapperInput.pivot.SetActive(true);

        this.#RecalcDraggables(true);
    }

    Unfocus (ignoreOnDock)
    {
        if (!ignoreOnDock) window.parent.RefractBack("FocusSprite(null)");

        this.#mapperInput.pivot.LetGo();
        this.LetGo();

        this.#mapperInput.cursorLocked = false;
        this.#mapperInput.SetCursor("");

        this.#mapperInput.focused = null;
        this.#mapperInput.outlineRect.SetActive(false);
        this.#mapperInput.outlineRect.transform.parent = null;
        this.#renderer.color = Color.blue;
        this.#renderer.thickness = 1;
        this.#renderer.sortingOrder = 0;

        this.#mapperInput.pivot.SetActive(false);

        this.#RecalcDraggables(true);
    }
}