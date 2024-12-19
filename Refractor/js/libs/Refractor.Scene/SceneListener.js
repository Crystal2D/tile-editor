class SceneListener extends GameBehavior
{
    Start ()
    {
        window.parent.RefractBack(`Refractor.FindEmbed(${window.refractorID}).onLoad.Invoke()`);
    }
}