class GridRenderer extends Renderer
{
    #loaded = false;
    #boundsPos = Vector2.zero;
    #bounds = new Bounds();

    #material = null;
    #grid = null;
    #camera = null;

    uColorID = 0;
    uOffsetID = 0;
    uSizeID = 0;
    uThicknessID = 0;
    thickness = 1;
    color = new Color(1, 1, 1, 0);

    get isLoaded ()
    {
        return this.#loaded;
    }

    get material ()
    {
        return this.#material;
    }

    get meshChanged ()
    {
        return true;
    }

    get bounds ()
    {
        return new Bounds(this.#bounds.center, this.#bounds.size);
    }

    get localToWorldMatrix ()
    {
        return this.transform.localToWorldMatrix;
    }
    
    constructor ()
    {
        super();

        this.#material = new Material(
            Shader.Find("Refractor/Grid", "VERTEX"),
            Shader.Find("Refractor/Grid", "FRAGMENT")
        );

        let layerID = SortingLayer.layers.find(item => item.name === "Refractor Priority")?.id;

        if (layerID == null)
        {
            layerID = SortingLayer.layers.length;

            SortingLayer.Add([new SortingLayer("Refractor Priority", layerID, 65536)]);
        }

        this.sortingLayer = layerID;

        this.Reload();
    }

    Reload ()
    {
        if (this.#loaded) return;
        
        this.uColorID = this.material.GetPropertyNameID("uColor");
        this.uOffsetID = this.material.GetPropertyNameID("uOffset");
        this.uSizeID = this.material.GetPropertyNameID("uSize");
        this.uThicknessID = this.material.GetPropertyNameID("uThickness");

        this.geometryBufferID = this.material.AddBuffer("geometry", null, 2);
        this.aVertexPosID = this.material.GetAttributeNameID("aVertexPos");

        this.material.SetBuffer(this.geometryBufferID, [
            -1, -1,
            -1, 1,
            1, -1,

            -1, 1,
            1, 1,
            1, -1
        ]);

        this.#loaded = true;
    }

    RecalcBounds ()
    {
        this.#bounds = new Bounds(this.#boundsPos, Vector2.zero);

        super.RecalcBounds();
    }

    ForceMeshUpdate ()
    {
        if (this.#grid == null) this.#grid = this.GetComponent("Grid");
        if (this.#camera == null) this.#camera = GameObject.FindComponents("Camera")[0];

        if (!this.#boundsPos.Equals(this.#camera.transform.position))
        {
            this.#boundsPos = this.#camera.transform.position;

            this.RecalcBounds();
        }
    }

    Render ()
    {
        if (!this.isLoaded || !this.gameObject.activeSelf) return;
        
        const gl = this.material.gl;
        
        const renderMatrix = this.renderMatrix;

        const scale = new Vector2(
            Math.abs(renderMatrix.GetValue(0, 0)),
            Math.abs(renderMatrix.GetValue(1, 1))
        );
        const gridSize = Vector2.Scale(
            Vector2.Scale(
                Vector2.Add(this.#grid.cellSize, this.#grid.cellGap),
                Vector2.Scale(scale, 0.5)
            ),
            new Vector2(Interface.width, Interface.height)
        );

        this.material.SetVector(this.uColorID,
            this.color.r,
            this.color.g,
            this.color.b,
            this.color.a * Math.min(((Interface.aspect > 1 ? gridSize.y : gridSize.x) - 10) / 10, 1)
        );

        const gridOffset = this.#grid.CellToWorld(Vector2.Scale(
            scale,
            Vector2.Divide(new Vector2(0.5, 0.5), this.transform.scale)
        ));

        this.material.SetVector(this.uOffsetID,
            (renderMatrix.GetValue(2, 0) + this.transform.position.x + 1 - gridOffset.x) * Interface.width * 0.5,
            (renderMatrix.GetValue(2, 1) + this.transform.position.y + 1 - gridOffset.y) * Interface.height * 0.5
        );
        this.material.SetVector(this.uSizeID, gridSize.x, gridSize.y);
        this.material.SetFloat(this.uThicknessID, this.thickness);

        this.material.SetAttribute(this.aVertexPosID, this.geometryBufferID);
        
        gl.useProgram(this.material.program);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 5);
        
        gl.useProgram(null);
    }
}