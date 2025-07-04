class InputHandler extends GameBehavior
{
    #draggingView = false;
    #cancelWalk = false;
    #mouseX = 0;
    #mouseY = 0;
    #mouseXOld = 0;
    #mouseYOld = 0;
    #onWheel = () => { };
    #onResize = () => { };
    #mousePosSnapped = Vector2.zero;

    #docBody = null;
    #cam = null;
    #mousePos = null;

    maxZoom = null;
    bounds = null;

    get mousePos ()
    {
        return this.#mousePos;
    }

    get mousePosSnapped ()
    {
        return this.#mousePosSnapped;
    }

    Start ()
    {
        this.#docBody = document.body;
        this.#cam = GameObject.Find("camera").GetComponent("Camera");

        // FPSMeter.SetActive(true);
    }

    OnEnable ()
    {
        this.#onWheel = InputManager.onWheel.Add(delta => {
            const zoomOld = this.#cam.orthographicSize;
            let nextZoom = zoomOld + zoomOld * delta;
            
            if (nextZoom < 0) return;

            if (this.maxZoom != null && nextZoom > this.maxZoom) nextZoom = this.maxZoom;

            this.#cam.orthographicSize = nextZoom;

            this.#cam.transform.position = Vector2.Add(
                this.#cam.transform.position,
                Vector2.Scale(
                    Vector2.Subtract(
                        this.#mousePos,
                        this.#cam.transform.position
                    ),
                    (zoomOld - this.#cam.orthographicSize) / zoomOld
                )
            );

            if (this.bounds != null) this.#cam.transform.position = Vector2.Clamp(
                this.#cam.transform.position,
                this.bounds.min,
                this.bounds.max
            );
        });
    }

    OnDisable ()
    {
        InputManager.onWheel.Remove(this.#onWheel);
        Interface.onResize.Remove(this.#onResize);
    }

    Update ()
    {
        this.#mouseXOld = this.#mouseX;
        this.#mouseX = Input.mousePosition.x;

        this.#mouseYOld = this.#mouseY;
        this.#mouseY = Input.mousePosition.y;

        if (Input.GetMouseButton(1) || Input.GetMouseButton(2)) this.DragView();
        if (this.#draggingView && ((Input.GetMouseButtonUp(1) && !Input.GetMouseButton(2)) || (Input.GetMouseButtonUp(2) && !Input.GetMouseButton(1))))
        {
            this.#docBody.style.cursor = "auto";
            this.#draggingView = false;
        }

        this.#mousePos = this.#cam.ScreenToWorldPoint(Input.mousePosition);

        if (InputManager.mousePresent !== Input.mousePresent)
        {
            InputManager.mousePresent = Input.mousePresent;

            if (InputManager.mousePresent) InputManager.onMouseEnter.Invoke();
            else InputManager.onMouseExit.Invoke();
        }

        if (SceneModifier.focusedGrid == null) return;

        this.#mousePosSnapped = SceneModifier.focusedGrid.SnapToGrid(this.#mousePos);
    }

    LateUpdate ()
    {
        this.WalkView();

        // FPSMeter.Update();
    }

    DragView ()
    {
        const deltaX = this.#mouseXOld - this.#mouseX;
        const deltaY = this.#mouseY - this.#mouseYOld;

        if (Math.abs(deltaX) <= 0 && Math.abs(deltaY) <= 0 && !this.#draggingView) return;

        this.#draggingView = true;

        this.#docBody.style.cursor = "grabbing";

        const camSize = this.#cam.bounds.size;

        this.#cam.transform.position = Vector2.Add(this.#cam.transform.position, new Vector2(
            deltaX * (camSize.x / Interface.width),
            deltaY * (camSize.y / Interface.height)
        ));

        if (this.bounds != null) this.#cam.transform.position = Vector2.Clamp(
            this.#cam.transform.position,
            this.bounds.min,
            this.bounds.max
        );
    }

    CancelWalk ()
    {
        this.#cancelWalk = true;
    }

    WalkView ()
    {
        if (this.#cancelWalk || Input.GetKey(KeyCode.Ctrl))
        {
            this.#cancelWalk = false;

            return;
        }

        const input = new Vector2(
            +Input.GetKey(KeyCode.D) - +Input.GetKey(KeyCode.A),
            +Input.GetKey(KeyCode.W) - +Input.GetKey(KeyCode.S)
        );

        if (input.Equals(Vector2.zero)) return;

        this.#cam.transform.position = Vector2.Add(
            this.#cam.transform.position,
            Vector2.Scale(
                input.normalized,
                this.#cam.orthographicSize * Time.deltaTime * (Input.GetKey(KeyCode.Shift) ? 2 : 1.25)
            )
        );

        if (this.bounds != null) this.#cam.transform.position = Vector2.Clamp(
            this.#cam.transform.position,
            this.bounds.min,
            this.bounds.max
        );
    }
}