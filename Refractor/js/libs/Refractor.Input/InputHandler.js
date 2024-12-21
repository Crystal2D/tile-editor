class InputHandler extends GameBehavior
{
    #recalcViewMat = false;
    #draggingView = false;
    #mouseX = 0;
    #mouseY = 0;
    #mouseXOld = 0;
    #mouseYOld = 0;
    #onWheel = () => { };
    #onMouseEnter = () => { };
    #onMouseExit = () => { };
    #onResize = () => { };
    #mousePosSnapped = Vector2.zero;

    #docBody = null;
    #cam = null;
    #viewMat = null;
    #mousePos = null;

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

        FPSMeter.SetActive(true);
    }

    OnEnable ()
    {
        this.#onWheel = InputManager.onWheel.Add(delta => {
            const zoomOld = this.#cam.orthographicSize;
            
            if (zoomOld + zoomOld * delta < 0) return;

            this.#cam.orthographicSize += zoomOld * delta;

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

            this.#recalcViewMat = true;
        });
        this.#onMouseEnter = InputManager.onMouseEnter.Add(() => this.previewTile?.SetActive(true));
        this.#onMouseExit = InputManager.onMouseExit.Add(() => this.previewTile?.SetActive(false));

        this.#onResize = Interface.onResize.Add(() => this.#recalcViewMat = true);

        this.#recalcViewMat = true;

    }

    OnDisable ()
    {
        InputManager.onWheel.Remove(this.#onWheel);
        InputManager.onMouseEnter.Remove(this.#onMouseEnter);
        InputManager.onMouseExit.Remove(this.#onMouseExit);
        Interface.onResize.Remove(this.#onResize);
    }

    Update ()
    {
        this.#mouseXOld = this.#mouseX;
        this.#mouseX = InputManager.GetMouseX();

        this.#mouseYOld = this.#mouseY;
        this.#mouseY = InputManager.GetMouseY();

        this.WalkView();

        if (InputManager.GetKey("right") || InputManager.GetKey("middle")) this.DragView();
        if (this.#draggingView && ((InputManager.GetKeyUp("right") && !InputManager.GetKey("middle")) || (InputManager.GetKeyUp("middle") && !InputManager.GetKey("right"))))
        {
            this.#docBody.style.cursor = "auto";
            this.#draggingView = false;
        }

        if (this.#recalcViewMat)
        {
            this.#viewMat = Matrix3x3.TRS(
                Vector2.Scale(this.#cam.transform.position, new Vector2(1, -1)),
                5.555555555555556e-3 * -this.#cam.transform.rotation * Math.PI,
                this.#cam.bounds.size
            );
            this.#recalcViewMat = false;
        }

        const mouseMat = Matrix3x3.Translate(new Vector2(
            (this.#mouseX / Interface.width) - 0.5,
            (this.#mouseY / Interface.height) - 0.5,
        ));
        const targetMat = Matrix3x3.Multiply(this.#viewMat, mouseMat);

        this.#mousePos = new Vector2(targetMat.GetValue(2, 0), -targetMat.GetValue(2, 1));

        if (SceneModifier.focusedGrid == null) return;

        this.#mousePosSnapped = SceneModifier.focusedGrid.SnapToGrid(this.#mousePos);
    }

    LateUpdate ()
    {
        FPSMeter.Update();
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

        this.#recalcViewMat = true;
    }

    WalkView ()
    {
        const input = new Vector2(
            +Input.GetKey(KeyCode.D) - +Input.GetKey(KeyCode.A),
            +Input.GetKey(KeyCode.W) - +Input.GetKey(KeyCode.S)
        );

        if (input.Equals(Vector2.zero)) return;

        this.#cam.transform.position = Vector2.Add(
            this.#cam.transform.position,
            Vector2.Scale(input.normalized, this.#cam.orthographicSize * Time.deltaTime * (Input.GetKey(KeyCode.Shift) ? 2 : 1.25))
        );
        
        this.#recalcViewMat = true;
    }
}