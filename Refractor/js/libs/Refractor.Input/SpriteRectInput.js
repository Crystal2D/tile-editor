class SpriteRectInput extends GameBehavior
{
    #cursorLocked = false;
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
        return this.#posDraggable.isMouseOver || this.#upDraggable.isMouseOver || this.#downDraggable.isMouseOver || this.#leftDraggable.isMouseOver || this.#rightDraggable.isMouseOver || this.#upleftDraggable.isMouseOver || this.#uprightDraggable.isMouseOver || this.#downleftDraggable.isMouseOver || this.#downrightDraggable.isMouseOver;
    }

    OnEnable ()
    {
        this.#onWheel = InputManager.onWheel.Add(() => this.#RecalcDraggables());
    }

    OnDisable ()
    {
        InputManager.onWheel.Remove(this.#onWheel);
    }

    async #SetCursor (cursor)
    {
        if (this.#cursorLocked) return;

        if (cursor !== "") await new Promise(resolve => requestAnimationFrame(resolve));

        document.body.style.cursor = cursor;
    }

    Start ()
    {
        const handlers = GameObject.Find("handlers");

        this.#inputHandler = handlers.GetComponent("InputHandler");
        this.#mapperInput = handlers.GetComponent("MapperInput");
        this.#renderer = this.GetComponent("RectRenderer");
        this.#cam = GameObject.Find("camera").GetComponent("Camera");

        this.#rect = new Rect();
        this.#rect.size = new Vector2(this.transform.scale.x, this.transform.scale.y);
        this.#rect.center = new Vector2(this.transform.position.x, this.transform.position.y);

        this.#RecalcDraggables(true);

        this.#posDraggable.onMouseDown = () => {
            this.Focus();

            this.#cursorLocked = true;
        };
        this.#posDraggable.onMouseUp = () => this.#cursorLocked = false;
        this.#posDraggable.onDrag = (pos, posRaw) => {
            if (this.#mapperInput.focused !== this) return;

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

        this.#upDraggable.onMouseEnter = () => this.#SetCursor("n-resize");
        this.#upDraggable.onMouseExit = () => this.#SetCursor("");
        this.#upDraggable.onMouseDown = () => this.#cursorLocked = true;
        this.#upDraggable.onMouseUp = () => {
            this.#cursorLocked = false;

            this.#SetCursor("");
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

        this.#downDraggable.onMouseEnter = () => this.#SetCursor("s-resize");
        this.#downDraggable.onMouseExit = () => this.#SetCursor("");
        this.#downDraggable.onMouseDown = () => this.#cursorLocked = true;
        this.#downDraggable.onMouseUp = () => {
            this.#cursorLocked = false;

            this.#SetCursor("");
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

        this.#leftDraggable.onMouseEnter = () => this.#SetCursor("w-resize");
        this.#leftDraggable.onMouseExit = () => this.#SetCursor("");
        this.#leftDraggable.onMouseDown = () => this.#cursorLocked = true;
        this.#leftDraggable.onMouseUp = () => {
            this.#cursorLocked = false;

            this.#SetCursor("");
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

        this.#rightDraggable.onMouseEnter = () => this.#SetCursor("e-resize");
        this.#rightDraggable.onMouseExit = () => this.#SetCursor("");
        this.#rightDraggable.onMouseDown = () => this.#cursorLocked = true;
        this.#rightDraggable.onMouseUp = () => {
            this.#cursorLocked = false;

            this.#SetCursor("");
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

        this.#upleftDraggable.onMouseEnter = () => this.#SetCursor("nw-resize");
        this.#upleftDraggable.onMouseExit = () => this.#SetCursor("");
        this.#upleftDraggable.onMouseDown = () => this.#cursorLocked = true;
        this.#upleftDraggable.onMouseUp = () => {
            this.#cursorLocked = false;

            this.#SetCursor("");
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

        this.#uprightDraggable.onMouseEnter = () => this.#SetCursor("ne-resize");
        this.#uprightDraggable.onMouseExit = () => this.#SetCursor("");
        this.#uprightDraggable.onMouseDown = () => this.#cursorLocked = true;
        this.#uprightDraggable.onMouseUp = () => {
            this.#cursorLocked = false;

            this.#SetCursor("");
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

        this.#downleftDraggable.onMouseEnter = () => this.#SetCursor("sw-resize");
        this.#downleftDraggable.onMouseExit = () => this.#SetCursor("");
        this.#downleftDraggable.onMouseDown = () => this.#cursorLocked = true;
        this.#downleftDraggable.onMouseUp = () => {
            this.#cursorLocked = false;

            this.#SetCursor("");
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

        this.#downrightDraggable.onMouseEnter = () => this.#SetCursor("se-resize");
        this.#downrightDraggable.onMouseExit = () => this.#SetCursor("");
        this.#downrightDraggable.onMouseDown = () => this.#cursorLocked = true;
        this.#downrightDraggable.onMouseUp = () => {
            this.#cursorLocked = false;

            this.#SetCursor("");
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
        const position = this.finalRect.position;
        const size = this.finalRect.size;

        if (!ignoreOnDock) window.parent.RefractBack(`
            SetPosition(${position.x}, ${position.y});
            SetSize(${size.x}, ${size.y});
        `);

        const halfThickness = (this.#cam.orthographicSize * 0.15 * (this.#renderer.thickness / 40));

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
        
        this.#RecalcDraggables(true);
    }

    Update ()
    {
        const mousePos = this.#inputHandler.mousePos;
        const focused = this.#mapperInput.focused === this;

        this.#posDraggable.Update(mousePos);

        if (!focused) return;

        this.#upDraggable.Update(mousePos);
        this.#downDraggable.Update(mousePos);
        this.#leftDraggable.Update(mousePos);
        this.#rightDraggable.Update(mousePos);

        this.#upleftDraggable.Update(mousePos);
        this.#uprightDraggable.Update(mousePos);
        this.#downleftDraggable.Update(mousePos);
        this.#downrightDraggable.Update(mousePos);
    }

    Focus ()
    {
        if (this.#mapperInput.focused === this) return;
        
        if (this.#mapperInput.focused != null)
        {
            if (this.#mapperInput.focused.hovered) return;
    
            this.#mapperInput.focused.Unfocus();
        }

        window.parent.RefractBack(`FocusSprite(${JSON.stringify(this.spriteName)})`);
    
        this.#mapperInput.focused = this;
        this.#renderer.color = new Color(0, 1, 1);
        this.#renderer.thickness = 4;
        this.#renderer.sortingOrder = 1;

        this.#RecalcDraggables(true);
    }

    Unfocus ()
    {
        this.#mapperInput.focused = null;
        this.#renderer.color = Color.white;
        this.#renderer.thickness = 1;
        this.#renderer.sortingOrder = 0;

        this.#RecalcDraggables(true);
    }
}