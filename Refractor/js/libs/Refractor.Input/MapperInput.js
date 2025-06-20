class MapperInput extends GameBehavior
{
    #inputHandler = null;
    #background = null;
    #grid = null;
    #cam = null;
    #sprRenderer = null;
    #creationRect = null;
    #createStart = null;
    #createEnd = null;
    #lastRect = null;
    #lastPivot = null;

    cursorLocked = false;
    baseWidth = 0;
    baseHeight = 0;
    spriteRects = [];

    pivot = null;
    focused = null;
    outlineRect = null;

    StartRecording ()
    {
        if (this.#lastRect != null) return;

        window.parent.RefractBack("ActionManager.StartRecording(\"RefractedChange\")");

        this.#lastRect = this.focused.finalRect;
        this.#lastPivot = new Vector2(this.focused.pivot.x, this.focused.pivot.y);
    }

    StopRecording ()
    {
        if (this.#lastRect == null) return;

        this.focused.LetGo();
        this.pivot.LetGo();

        const lastPosition = this.#lastRect.position;
        const lastSize = this.#lastRect.size;

        const finalRect = this.focused.finalRect;
        const position = finalRect.position;
        const size = finalRect.size;
        const pivot = this.focused.pivot;

        window.parent.RefractBack(`
            let done = false;

            ActionManager.Record(
                "RefractedChange",
                () => {
                    MarkAsEdited();

                    if (!done) return;
                    
                    SetPosition(${position.x}, ${position.y});
                    SetSize(${size.x}, ${size.y});
                    SetPivot(${pivot.x}, ${pivot.y});
                },
                () => {
                    MarkAsEdited();
                    
                    SetPosition(${lastPosition.x}, ${lastPosition.y});
                    SetSize(${lastSize.x}, ${lastSize.y});
                    SetPivot(${this.#lastPivot.x}, ${this.#lastPivot.y});
                }
            );
            ActionManager.StopRecording("RefractedChange", () => MapperView.Refract(\`
                const rect = GameObject.FindComponents("MapperInput")[0].focused;

                rect.SetPosition(new Vector2(\${focusedSprite.rect.x}, \${focusedSprite.rect.y}));
                rect.SetSize(new Vector2(\${focusedSprite.rect.width}, \${focusedSprite.rect.height}));

                rect.SetPivot(new Vector2(\${focusedSprite.pivot.x}, \${focusedSprite.pivot.y}));
            \`));

            done = true;
        `);

        this.#lastRect = null;
    }

    async SetCursor (cursor)
    {
        if (this.cursorLocked) return;

        if (cursor !== "") await new Promise(resolve => requestAnimationFrame(resolve));

        document.body.style.cursor = cursor;
    }

    Start ()
    {
        this.#inputHandler = this.GetComponent("InputHandler");
        this.#background = GameObject.Find("background");
        this.#grid = GameObject.Find("grid").GetComponent("Grid");
        this.#cam = GameObject.Find("camera").GetComponent("Camera");

        this.pivot = GameObject.Find("pivot").GetComponent("CircleDragInput");

        this.outlineRect = GameObject.Find("outline_rect");
        this.outlineRect.SetActive(false);
        
        let bgLayerID = SortingLayer.layers.find(item => item.name === "Refractor Background")?.id;

        if (bgLayerID == null)
        {
            bgLayerID = SortingLayer.layers.length;

            SortingLayer.Add([new SortingLayer("Refractor Background", bgLayerID, -65536)]);
        }

        this.#background.GetComponent("RectRenderer").sortingLayer = bgLayerID;
    }

    async CreateSprite (name, position, size, pivot)
    {
        let objID = null;

        do objID = Math.floor(Math.random() * 65536) + Math.floor(Math.random() * 65536);
        while (SceneBank.FindByID(objID) != null)

        await SceneInjector.GameObject({
            name: `rect_${objID}`,
            id: objID,
            transform: {
                position: {
                    x: (position.x + size.x * 0.5) - this.baseWidth,
                    y: -(position.y + size.y * 0.5) + this.baseHeight
                },
                scale: {
                    x: size.x,
                    y: size.y
                }
            },
            components: [
                {
                    type: "RectRenderer",
                    args: {
                        color: {
                            r: 0,
                            g: 0,
                            b: 255
                        },
                        thickness: 1
                    }
                },
                {
                    type: "SpriteRectInput",
                    args: {
                        spriteName: name,
                        pivot: pivot
                    }
                }
            ]
        });

        this.spriteRects.push(SceneBank.FindByID(objID).GetComponent("SpriteRectInput"));
    }

    Delete (name)
    {
        const spriteRect = this.spriteRects.find(item => item.spriteName === name);

        this.spriteRects.splice(this.spriteRects.indexOf(spriteRect), 1);

        spriteRect.Unfocus(true);

        GameObject.Destroy(spriteRect.gameObject);
    }

    async #CreateSpriteStart ()
    {
        const mousePosSnapped = this.#grid.SnapToGrid(this.#inputHandler.mousePos);

        if (mousePosSnapped.x < -this.baseWidth + 0.5 || mousePosSnapped.x > this.baseWidth - 0.5) return;
        if (mousePosSnapped.y < -this.baseHeight + 0.5 || mousePosSnapped.y > this.baseHeight - 0.5) return;

        let objID = null;

        do objID = Math.floor(Math.random() * 65536) + Math.floor(Math.random() * 65536);
        while (SceneBank.FindByID(objID) != null)

        let nameObj = this.#sprRenderer.sprite.texture.name;
        let nameIndex = nameObj.match(/ \(\d+\)$/);

        if (nameIndex != null)
        {
            nameObj = nameObj.slice(0, -nameIndex[0].length);
            nameIndex = parseInt(nameIndex[0].slice(2, -1));
        }
        else nameIndex = 0;

        const nameRegex = new RegExp(`(${nameObj}) \\(\\d+\\)$`);

        const nameMatches = this.spriteRects.filter(item => item.spriteName.match(nameRegex) != null || item.spriteName === nameObj).map(item => parseInt((item.spriteName.match(/ \(\d+\)$/) ?? [" (0)"])[0].slice(2, -1)));
        nameMatches.sort((a, b) => a - b);

        for (let i = 0; i < nameMatches.length; i++)
        {
            if (nameMatches[i] < nameIndex) continue;

            if (nameMatches[i] - nameIndex === 0)
            {
                nameIndex++;

                continue;
            }

            nameIndex = nameMatches[i - 1] + 1;

            break;
        }

        if (Number.isNaN(nameIndex)) nameIndex = 0;

        await SceneInjector.GameObject({
            name: `rect_${objID}`,
            id: objID,
            components: [
                {
                    type: "RectRenderer",
                    args: {
                        color: {
                            r: 255,
                            g: 0,
                            b: 255
                        },
                        sortingOrder: 2
                    }
                },
                {
                    type: "SpriteRectInput",
                    args: {
                        spriteName: `${nameObj} (${nameIndex})`
                    }
                }
            ]
        });

        this.#creationRect = SceneBank.FindByID(objID).GetComponent("RectRenderer");
        this.#createStart = mousePosSnapped;
        this.outlineRect.SetActive(true);
        this.outlineRect.transform.parent = this.#creationRect.transform;
    }

    Update ()
    {
        if (this.#sprRenderer == null) return;

        if (Input.GetMouseButtonDown(0))
        {
            let run = true;

            for (let i = 0; i < this.spriteRects.length; i++) if (this.spriteRects[i].hovered) run = false;

            if (run)
            {
                if (this.focused != null) this.focused.Unfocus();

                this.#CreateSpriteStart();
            }
        }

        if (this.#createStart == null) return;

        this.#createEnd = Vector2.Clamp(
            this.#grid.SnapToGrid(this.#inputHandler.mousePos),
            new Vector2(-this.baseWidth + 0.5, -this.baseHeight + 0.5),
            new Vector2(this.baseWidth - 0.5, this.baseHeight - 0.5)
        );

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
        this.#creationRect.transform.scale = Vector2.Add(rect.size, Vector2.one);

        if (Input.GetMouseButtonUp(0))
        {
            const rectInput = this.#creationRect.GetComponent("SpriteRectInput");
            rectInput.SetBaseRect();

            const position = rectInput.finalRect.position;
            const size = rectInput.finalRect.size;

            window.parent.RefractBack(`
                let done = false;

                ActionManager.StartRecording("Create");
                ActionManager.Record(
                    "Create",
                    async () => {
                        MarkAsEdited();

                        const spriteData = {
                            name: ${JSON.stringify(rectInput.spriteName)},
                            rect: {
                                x: ${position.x},
                                y: ${position.y},
                                width: ${size.x},
                                height: ${size.y}
                            }
                        };

                        texture.args.sprites.push(spriteData);

                        if (done) MapperView.Refract(\`(async () => {
                            const input = GameObject.FindComponents("MapperInput")[0];

                            await input.CreateSprite(
                                \${JSON.stringify(spriteData.name)},
                                new Vector2(\${spriteData.rect.x}, \${spriteData.rect.y}),
                                new Vector2(\${spriteData.rect.width}, \${spriteData.rect.height}),
                                new Vector2(0.5, 0.5)
                            );

                            await new Promise(resolve => requestAnimationFrame(resolve));
                                
                            input.Focus(\${JSON.stringify(spriteData.name)});

                            window.parent.RefractBack(\\\`FocusSpriteBase(${JSON.stringify(rectInput.spriteName)});\\\`);
                        })();\`);
                    },
                    () => {
                        MarkAsEdited();

                        DeleteBase(${JSON.stringify(rectInput.spriteName)});
                    }
                );
                ActionManager.StopRecording("Create");

                done = true;

                FocusSpriteBase(${JSON.stringify(rectInput.spriteName)});
            `);

            rectInput.Focus(true);

            this.spriteRects.push(rectInput);

            this.#creationRect = null;
            this.#createStart = null;
            this.#createEnd = null;
        }
    }

    SetRenderer ()
    {
        const spriteObj = SceneBank.FindByID(0);
        this.#sprRenderer = spriteObj.GetComponent("SpriteRenderer");

        const ppu = this.#sprRenderer.sprite.pixelPerUnit;

        spriteObj.transform.scale = Vector2.Scale(Vector2.one, ppu);

        const bounds = this.#sprRenderer.bounds;
        this.#cam.orthographicSize = Math.max(bounds.size.x, bounds.size.y) * 1.25;

        this.#sprRenderer.color = Color.white;

        this.#background.transform.scale = new Vector2(bounds.size.x, bounds.size.y);
        this.#inputHandler.maxZoom = Math.max(bounds.size.x, bounds.size.y) * 2.25;
        this.#inputHandler.bounds = new Bounds(Vector2.zero, bounds.size);

        const sprites = this.#sprRenderer.sprite.texture.sprites;

        this.baseWidth = this.#sprRenderer.sprite.texture.width * 0.5;
        this.baseHeight = this.#sprRenderer.sprite.texture.height * 0.5;

        this.#grid.transform.position = new Vector2(
            +(this.#sprRenderer.sprite.texture.width % 2 === 0) * 0.5,
            +(this.#sprRenderer.sprite.texture.height % 2 === 0) * 0.5
        )

        for (let i = 1; i < sprites.length; i++)
        {
            const rect = sprites[i].rect;

            this.CreateSprite(
                sprites[i].name,
                rect.position,
                rect.size,
                sprites[i].pivot
            );
        }
    }

    Focus (name)
    {
        if (name == null) this.focused.Unfocus(true);
        else this.spriteRects.find(item => item.spriteName === name).Focus(true);
    }
}