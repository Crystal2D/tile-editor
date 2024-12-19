class SceneBank
{
    static #objs = [];

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

        return this.#objs.splice(index, 1).gameObject;
    }
}