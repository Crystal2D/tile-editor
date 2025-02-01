let dir = "";
let embeds = [];

class Embed
{
    #loaded = false;
    #index = 0;

    #wrap = null;

    onLoad = new DelegateEvent();
    onResourceLoad = new DelegateEvent();

    content = null;

    get isLoaded ()
    {
        return this.#loaded;
    }

    get id ()
    {
        return this.#index;
    }

    constructor (wrapper, projectDir)
    {
        this.#wrap = wrapper;
        
        this.content = document.createElement("iframe");
        this.content.src = `${dir}Refractor/index.html?dir=${projectDir ?? ProjectManager.ProjectDir()}`;

        wrapper.append(this.content);

        this.#index = embeds.length;
        embeds.push(this);

        this.onLoad.Add(() => {
            this.RecalcSize();

            this.#loaded = true;
        });

        this.content.addEventListener("load", () => {
            this.content.contentWindow.addEventListener("unload", () => this.#loaded = false);

            this.Refract(`window.refractorID = ${this.#index}`);
        });
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

function SetDirectory (directory)
{
    dir = directory;
}

function FindEmbed (id)
{
    return embeds.find(item => item.id === id);
}


module.exports = {
    Embed,
    SetDirectory,
    FindEmbed
};