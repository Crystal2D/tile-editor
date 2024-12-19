class TilePalette
{
    static #loaded = false;

    static #unloadedPal = [];
    static #palettes = [];

    name = "";
    sprites = [];

    static get isLoaded ()
    {
        return this.#loaded;
    }

    static async Set ()
    {
        if (this.#loaded) return;

        const dataRequest = await fetch(`${Application.projectDir}\\data\\tilepalettes.json`);
        this.#unloadedPal = await dataRequest.json();

        this.#loaded = true;
    }

    static async Load (name)
    {
        const data = this.#unloadedPal.find(item => item.name === name);

        const obj = new TilePalette();
        obj.name = name;

        for (let i = 0; i < data.textures.length; i++)
        {
            if (data.textures.sprites?.length === 0) continue;

            const texture = Resources.Find(data.textures[i].src);

            obj.sprites.push(...data.textures[i].sprites.map(item => {
                return {
                    id: item.id,
                    sprite: texture.sprites[item.index].Duplicate()
                };
            }));
        }

        this.#palettes.push(obj);
    }

    static async UnloadAll ()
    {
        this.#palettes = [];
    }
    
    static Find (name)
    {
        return this.#palettes.find(item => item.name === name);
    }
}

TilePalette.Set();