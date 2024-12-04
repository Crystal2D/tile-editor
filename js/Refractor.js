class Embed
{
    #wrap = null;

    content = null;

    constructor (wrapper)
    {
        this.#wrap = wrapper;
        
        this.content = document.createElement("iframe");
        this.content.src = `Refractor/index.html?dir=${ProjectManager.ProjectDir()}`;

        wrapper.append(this.content);

        this.RecalcSize();
    }

    RecalcSize ()
    {
        const width = this.#wrap.getBoundingClientRect().width;
        const height = this.#wrap.getBoundingClientRect().height;

        this.content.style.width = `${width}px`;
        this.content.style.height = `${height}px`;

        this.Refract(`Interface.SetResolution(${width}, ${height})`);
    }

    Refract (data)
    {
        if (this.content.contentWindow.Refract != null) this.content.contentWindow.Refract(data);
    }
}


module.exports = {
    Embed
};