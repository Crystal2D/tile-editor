class SceneInjector
{
    static async #LoadComponents (components)
    {
        let output = [];
        
        for (let i = 0; i < components.length; i++) output.push(await SceneManager.CreateObject(components[i].type, components[i].args));
        
        return output;
    }

    static async GameObject (...data)
    {
        for (let i = 0; i < data.length; i++)
        {
            const scene = SceneManager.GetActiveScene();
            const components = await this.#LoadComponents(data[i].components ?? []);
            
            let objParent = null;
            
            if (data[i].parent != null) objParent = SceneBank.FindByID(data[i].parent).transform;
            
            let objID = null;

            do objID = Math.floor(Math.random() * 65536) + Math.floor(Math.random() * 65536);
            while (GameObject.FindByID(objID) != null)

            const gameObj = await SceneManager.CreateObject("GameObject", {
                name : data[i].name,
                components : components,
                active : data[i].active,
                transform : data[i].transform,
                id : objID,
                parent : objParent
            });

            gameObj.scene = scene;

            const renderer = gameObj.GetComponent("Renderer");

            if (renderer != null)
            {
                const min = renderer.bounds.min;
                const max = renderer.bounds.max;
                const rect = Rect.MinMaxRect(min.x, min.y, max.x, max.y);

                scene.tree.Insert(gameObj, rect);
            }

            scene.gameObjects.push(gameObj);
            SceneBank.Add(data[i].id, gameObj);
        }
    }

    static async Grid (...data)
    {
        for (let i = 0; i < data.length; i++) data[i].components.push({ type: "GridRenderer" });

        await this.GameObject(...data);
    }

    static Destroy (id)
    {
        const obj = SceneBank.Remove(id);

        if (obj == null) return;

        GameObject.Destroy(obj);
    }

    static DestroyAll ()
    {
        const objs = SceneBank.RemoveAll();

        for (let i = 0; i < objs.length; i++) GameObject.Destroy(objs[i]);
    }

    static async Resources (...paths)
    {
        for (let i = 0; i < paths.length; i++)
        {
            await Resources.Load(paths[i]);

            window.parent.RefractBack(`Refractor.FindEmbed(${window.refractorID}).onResourceLoad.Invoke("${paths[i]}")`);
        }
    }
}