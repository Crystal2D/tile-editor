class SceneBank
{
    static #objs = [];
    static #ordered = [];

    static Add (id, obj)
    {
        this.#objs.push({
            id: id,
            gameObject: obj
        });
    }

    static FindByID (id)
    {
        return this.#objs.find(item => item.id === id)?.gameObject;
    }

    static Remove (id)
    {
        const obj = this.#objs.find(item => item.id === id);

        if (obj == null) return null;

        const index = this.#objs.indexOf(obj);
        const ordered = this.#ordered.find(item => item.id === id);

        if (ordered != null) this.#ordered.splice(this.#ordered.indexOf(ordered), 1);

        return this.#objs.splice(index, 1)[0].gameObject;
    }

    static SetOrdering (id, index)
    {
        const obj = this.#ordered.find(item => item.id === id);

        if (obj != null && obj.index !== index) obj.index = index;
        else if (obj == null) this.#ordered.push({
            id: id,
            index: index,
            gameObject: this.FindByID(id)
        });

        this.#ordered.sort((a, b) => b.index - a.index);
    }

    static SortOrdering ()
    {
        for (let i = 0; i < this.#ordered.length; i++)
        {
            const renderer = this.#ordered[i].gameObject.GetComponent("Renderer");

            if (renderer != null) renderer.RecalcBounds();
        }
    }
}