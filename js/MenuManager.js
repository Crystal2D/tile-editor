let loaded = false;
let navFocused = false;
let backdropEnabled = false;
let minY = 20.5;

const onBackdropDisable = new DelegateEvent();

let nav = null;
let backdrop = null;

class MenuItem
{
    enabled = true;
    label = "";
    callback = () => { };

    constructor (label, callback)
    {
        this.label = label;
        this.callback = callback ?? (() => { });
    }

    Create ()
    {
        const output = document.createElement("div");

        output.onclick = async () => await this.callback();

        output.append(this.label);

        return output;
    }
}

class MenuLine extends MenuItem
{
    Create ()
    {
        return document.createElement("hr");
    }
}

class MenuShortcutItem extends MenuItem
{
    shortcut = null;

    constructor (label, shortcut, callback)
    {
        super(label, callback);

        this.shortcut = shortcut;
    }

    Create ()
    {
        const output = super.Create();
        const tip = document.createElement("span");

        tip.classList.add("tip");

        tip.append(this.shortcut);
        output.append(tip);

        return output;
    }
}

class ContextMenu
{
    #backdropCall = () => { };

    #box = null;

    onClose = () => { };

    constructor (items, settings)
    {
        if (settings == null) settings = { };

        this.#box = document.createElement("div");
        
        if (settings.width != null) this.#box.style.width = `${settings.width}px`;

        this.#box.classList.add("context-menu");

        for (let i = 0; i < items.length; i++) {
            const item = items[i].Create();
            item.setAttribute("enabled", +items[i].enabled);

            this.#box.append(item);
        }

        document.body.append(this.#box);

        if (settings.posX == null) settings.posX = 0;
        if (settings.posY == null) settings.posY = 20.5;
        if (settings.posX >= window.innerWidth * 0.5) settings.posX -= this.#box.offsetWidth;
        if (settings.posY >= window.innerHeight * 0.5) settings.posY -= this.#box.offsetHeight;

        this.#box.style.left = `${Math.max(settings.posX, 0)}px`;
        this.#box.style.top = `${Math.max(settings.posY, minY)}px`;

        if (settings.thinPadding) this.#box.setAttribute("thin-padding", 1);

        this.#backdropCall = () => this.Close();

        onBackdropDisable.Add(this.#backdropCall);
        EnableBackdrop();
    }

    Close ()
    {
        this.#box.remove();

        onBackdropDisable.Remove(this.#backdropCall);

        this.onClose();
    }
}

function EnableBackdrop ()
{
    if (backdropEnabled) return;

    backdrop.style.display = "block";

    backdropEnabled = true;
}

function Init ()
{
    if (loaded) return;
    
    nav = document.querySelector("nav");
    backdrop = document.querySelector("#context-menu-backdrop");

    backdrop.addEventListener("mousedown", () => {
        UnfocusBar();
        CloseContextMenus();
    });

    loaded = true;
}

function GetMinY ()
{
    return minY;
}

function SetMinY (value)
{
    minY = value;
}

function AddToBar (label, onClick, onFocus)
{
    if (onFocus == null) onFocus = (() => UnfocusBar());

    const span = document.createElement("span");

    span.onclick = async () => {
        await onClick(navFocused);

        if (navFocused) await onFocus();
    };
    span.onmouseover = async () => {
        if (navFocused) await onFocus();
    };

    span.append(label);
    nav.append(span);
}

function FocusBar ()
{
    navFocused = true;
}

function UnfocusBar ()
{
    navFocused = false;
}

function CloseContextMenus ()
{
    if (!backdropEnabled) return;

    onBackdropDisable.Invoke();

    backdrop.style.display = "none";

    backdropEnabled = false;
}

function Enabled ()
{
    return backdropEnabled;
}


module.exports = {
    MenuItem,
    MenuLine,
    MenuShortcutItem,
    ContextMenu,
    Init,
    GetMinY,
    SetMinY,
    AddToBar,
    FocusBar,
    UnfocusBar,
    CloseContextMenus,
    Enabled
};