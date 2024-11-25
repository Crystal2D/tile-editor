class Interface
{
    static #x = 0;
    static #y = 0;
    static #aspect = 0;
    
    static get width ()
    {
        return this.#x;
    }
    
    static get height ()
    {
        return this.#y;
    }

    static get aspect ()
    {
        return this.#aspect;
    }
    
    static SetResolution (width, height)
    {
        this.#x = width;
        this.#y = height;

        Application.htmlCanvas.width = this.#x;
        Application.htmlCanvas.height = this.#y;
            
        this.#aspect = this.#x / this.#y;
    }
}