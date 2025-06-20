class Tile
{   
    palette = "";
    spriteID = 0;
    position = Vector2.zero;

    sprite = null;

    constructor (palette, spriteID, position)
    {
        this.palette = palette;
        this.spriteID = spriteID ?? 0;
        this.position = position ?? Vector2.zero;
    }

    Duplicate ()
    {
        const tile = new Tile(
            this.palette,
            this.spriteID,
            this.position,
        );

        tile.sprite = this.sprite.Duplicate();

        return tile;
    }
}