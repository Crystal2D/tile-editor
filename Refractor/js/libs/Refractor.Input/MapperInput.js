class MapperInput extends GameBehavior
{
    #inputHandler = null;
    #background = null;
    #cam = null;
    #sprRenderer = null;
    #creationRect = null;
    #creationRenderer = null;
    #createStart = null;
    #createEnd = null;

    Start ()
    {
        this.#inputHandler = this.GetComponent("InputHandler");
        this.#background = GameObject.Find("background");
        this.#cam = GameObject.Find("camera").GetComponent("Camera");
        
        let bgLayerID = SortingLayer.layers.find(item => item.name === "Refractor Background")?.id;

        if (bgLayerID == null)
        {
            bgLayerID = SortingLayer.layers.length;

            SortingLayer.Add([new SortingLayer("Refractor Background", bgLayerID, -65536)]);
        }

        this.#background.GetComponent("RectRenderer").sortingLayer = bgLayerID;
    }

    async Update ()
    {
        return;

        if (InputManager.GetKeyDown("left"))
        {
            // bad idea to place await in Update loop
            await SceneInjector.GameObject({
                name: "AAAAAAAAAAAAAAAAAAA",
                id: 1111,
                components: [
                    {
                        type: "RectRenderer"
                    }
                ]
            });

            this.#creationRect = SceneBank.FindByID(1111);
            this.#creationRenderer = this.#creationRect.GetComponent("RectRenderer");
            this.#createStart = this.#inputHandler.mousePos;
        }

        // if (this.#createStart == null)
        // {
        //     if (InputManager.isMouseOver && !this.#selectionRenderer.color.Equals(Color.white)) this.#selectionRenderer.color = Color.white;
        //     else if (!InputManager.isMouseOver) this.#selectionRenderer.color = new Color(0, 0, 0, 0);

        //     const gridSize = Vector2.Add(grid.cellSize, grid.cellGap);

        //     if (!this.#selectionRect.transform.scale.Equals(gridSize)) this.#selectionRect.transform.scale = gridSize;
            
        //     this.#selectionRect.transform.position = this.#inputHandler.mousePosSnapped;
        // }

        if (this.#createStart != null && InputManager.GetKey("left"))
        {
            if (!this.#creationRenderer.color.Equals(new Color(0, 1, 1))) this.#creationRenderer.color = new Color(0, 1, 1);

            this.#createEnd = this.#inputHandler.mousePos;

            const rect = new Rect();

            if (this.#createStart.x < this.#createEnd.x)
            {
                rect.xMin = this.#createStart.x;
                rect.xMax = this.#createEnd.x;
            }
            else
            {
                rect.xMin = this.#createEnd.x;
                rect.xMax = this.#createStart.x;
            }

            if (this.#createStart.y < this.#createEnd.y)
            {
                rect.yMin = this.#createStart.y;
                rect.yMax = this.#createEnd.y;
            }
            else
            {
                rect.yMin = this.#createEnd.y;
                rect.yMax = this.#createStart.y;
            }

            this.#creationRect.transform.position = rect.center;
            this.#creationRect.transform.scale = rect.size;
        }

        if (this.#createStart != null && InputManager.GetKeyUp("left"))
        {
            this.#creationRect = null;
            this.#creationRenderer = null;
            this.#createStart = null;
            this.#createEnd = null;
        }
    }

    async SetRenderer ()
    {
        this.#sprRenderer = SceneBank.FindByID(-1).GetComponent("SpriteRenderer");

        const bounds = this.#sprRenderer.bounds;
        
        this.#cam.transform.position = new Vector2(bounds.center.x, bounds.center.y);
        this.#cam.orthographicSize = Math.max(bounds.size.x, bounds.size.y) + 0.25;
        
        this.#inputHandler.RecalcViewMatrix();

        this.#background.transform.scale = new Vector2(bounds.size.x, bounds.size.y);
        this.#inputHandler.maxZoom = Math.max(bounds.size.x, bounds.size.y) * 2 + 0.25;
        this.#inputHandler.bounds = new Bounds(Vector2.zero, bounds.size);

        const sprites = this.#sprRenderer.sprite.texture.sprites;
        const ppu = this.#sprRenderer.sprite.pixelPerUnit;
        const halfWidth = this.#sprRenderer.sprite.texture.width;
        const halfHeight = this.#sprRenderer.sprite.texture.height;

        for (let i = 1; i < sprites.length; i++)
        {
            const rect = sprites[i].rect;

            await SceneInjector.GameObject({
                name: "AAAAAAAAAAAAAAAAAAA",
                id: 1111,
                transform: {
                    position: {
                        x: (rect.center.x - halfWidth * 0.5) / ppu,
                        y: -(rect.center.y - halfHeight * 0.5) / ppu
                    },
                    scale: {
                        x: rect.size.x / ppu,
                        y: rect.size.y / ppu
                    }
                },
                components: [
                    {
                        type: "RectRenderer",
                        args: {
                            color: {
                                r: 255,
                                g: 255,
                                b: 255
                            },
                            thickness: 1
                        }
                    }
                ]
            });
        }
    }
}