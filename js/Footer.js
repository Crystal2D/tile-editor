let items = []

let leftSide = null;
let rightSide = null;

class FooterItem
{
    #shown = false;

    #id = null;
    #element = null;
    #text = null;

    get id ()
    {
        return this.#id;
    }

    get text ()
    {
        return this.#text.innerText;
    }

    set text (value)
    {
        this.#text.innerText = value;
    }

    get visible ()
    {
        return this.#shown;
    }

    set visible (value)
    {
        if (this.#shown === value) return;

        this.#shown = value;

        this.#element.style.display = value ? "" : "none";
    }

    constructor (id, onRight, icon)
    {
        this.#id = id;

        this.#element = document.createElement("div");
        this.#element.style.display = "none";

        if (icon != null)
        {
            const img = document.createElement("img");
            img.src = `img/footer/${icon}`;

            this.#element.append(img);
        }

        this.#text = document.createElement("span");

        this.#element.append(this.#text);

        if (onRight) rightSide.append(this.#element);
        else leftSide.append(this.#element);

        items.push(this);
    }
}

function Set ()
{
    leftSide = document.createElement("div");
    leftSide.classList.add("left");

    rightSide = document.createElement("div");
    rightSide.classList.add("right");

    footer.append(leftSide, rightSide);
}

function FindItem (id)
{
    return items.find(item => item.id === id);
}


module.exports = {
    FooterItem,
    Set,
    FindItem
};