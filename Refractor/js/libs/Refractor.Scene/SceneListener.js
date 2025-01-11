class SceneListener extends GameBehavior
{
    #delay = 1 / 20;
    #time = 0;

    Start ()
    {
        window.parent.RefractBack(`Refractor.FindEmbed(${window.refractorID}).onLoad.Invoke()`);
    }

    LateUpdate ()
    {
        if (this.#time > 0)
        {
            this.#time -= Time.unscaledDeltaTime;

            return;
        }

        SceneBank.SortOrdering();

        this.#time = this.#delay;
    }

    SortOrdering ()
    {
        this.#time = 0;
    }
}