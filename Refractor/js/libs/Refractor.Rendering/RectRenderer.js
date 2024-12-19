class RectRenderer extends Renderer
{
    #loaded = false;
    #bounds = new Bounds();

    #material = null;

    uColorID = 0;
    uThicknessID = 0;
    thickness = 3;
    color = new Color(0, 0, 0, 0);

    get isLoaded ()
    {
        return this.#loaded;
    }

    get material ()
    {
        return this.#material;
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
            Shader.Find("Refractor/Rect", "VERTEX"),
            Shader.Find("Refractor/Rect", "FRAGMENT")
        );

        let layerID = SortingLayer.layers.find(item => item.name === "Refractor Priority")?.id;

        if (layerID == null)
        {
            layerID = SortingLayer.layers.length;

            SortingLayer.Add([new SortingLayer("Refractor Priority", layerID, 65536)]);
        }

        this.sortingLayer = layerID;
        this.sortingOrder = 1;

        this.Reload();
    }

    Reload ()
    {
        if (this.#loaded) return;
        
        this.uColorID = this.material.GetPropertyNameID("uColor");
        this.uMinID = this.material.GetPropertyNameID("uMin");
        this.uMaxID = this.material.GetPropertyNameID("uMax");
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
        this.#bounds = new Bounds(
            new Vector2(
                this.transform.position.x,
                this.transform.position.y
            ),
            new Vector2(
                this.transform.scale.x,
                this.transform.scale.y
            ),
        );

        super.RecalcBounds();
    }

    Render ()
    {
        if (!this.isLoaded || !this.gameObject.activeSelf) return;
        
        const gl = this.material.gl;
        
        this.material.SetVector(this.uColorID,
            this.color.r,
            this.color.g,
            this.color.b,
            this.color.a
        );

        const rect = new Rect();
        rect.center = Vector2.one;

        const renderMatrix = this.renderMatrix;

        const renderRect = new Rect();
        renderRect.size = new Vector2(
            Math.abs(renderMatrix.GetValue(0, 0)) * 0.5 * Interface.width,
            Math.abs(renderMatrix.GetValue(1, 1)) * 0.5 * Interface.height
        );
        renderRect.center = new Vector2(
            (renderMatrix.GetValue(2, 0) + 1) * Interface.width * 0.5,
            (renderMatrix.GetValue(2, 1) + 1) * Interface.height * 0.5
        );

        this.material.SetVector(this.uMinID, renderRect.xMin, renderRect.yMin);
        this.material.SetVector(this.uMaxID, renderRect.xMax, renderRect.yMax);

        this.material.SetFloat(this.uThicknessID, this.thickness);

        this.material.SetAttribute(this.aVertexPosID, this.geometryBufferID);
        
        gl.useProgram(this.material.program);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 5);
        
        gl.useProgram(null);
    }
}