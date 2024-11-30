class GridRenderer extends Renderer
{
    #loaded = false;

    uColorID = 0;
    uOffsetID = 0;
    uSizeID = 0;

    get isLoaded ()
    {
        return this.#loaded;
    }
    
    constructor ()
    {
        super(new Material(
            Shader.Find("Refractor/Grid", "VERTEX"),
            Shader.Find("Refractor/Grid", "FRAGMENT")
        ));
    }

    Reload ()
    {
        if (this.#loaded) return;
        
        this.uMatrixID = this.material.GetPropertyNameID("uMatrix");
        this.uColorID = this.material.GetPropertyNameID("uColor");
        this.uOffsetID = this.material.GetPropertyNameID("uOffset");
        this.uSizeID = this.material.GetPropertyNameID("uSize");

        this.geometryBufferID = this.material.AddBuffer("geometry", null, 2);
        this.aVertexPosID = this.material.GetAttributeNameID("aVertexPos");

        this.material.SetBuffer(this.geometryBufferID, [
            0, 0,
            0, 1,
            1, 0,

            0, 1,
            1, 1,
            1, 0
        ]);

        this.#loaded = true;
    }

    Render ()
    {
        if (!this.isLoaded || !this.gameObject.activeSelf) return;
        
        const gl = this.material.gl;
        
        const renderMatrix = this.renderMatrix;
        
        this.material.SetMatrix(this.uMatrixID,
            renderMatrix.matrix[0][0],
            renderMatrix.matrix[0][1],
            renderMatrix.matrix[0][2],
            renderMatrix.matrix[1][0],
            renderMatrix.matrix[1][1],
            renderMatrix.matrix[1][2],
            renderMatrix.matrix[2][0],
            renderMatrix.matrix[2][1],
            renderMatrix.matrix[2][2]
        );

        this.material.SetVector(this.uColorID,
            this.color.r,
            this.color.b,
            this.color.g,
            this.color.a
        );
        this.material.SetVector(this.uOffsetID, 0, 0);
        this.material.SetVector(this.uSizeID, 50, 50);

        this.material.SetAttribute(this.aVertexPosID, this.geometryBufferID);
        
        gl.useProgram(this.material.program);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 5);
        
        gl.useProgram(null);
    }
}