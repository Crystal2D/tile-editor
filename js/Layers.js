let cancelOnCtx = false;
let mouse = 0;
let layers = [];
let onDragDrop = () => { };

let content = null;
let focused = null;
let dragging = null;
let scenename = null;

class Layer
{
    #pos = 0;

    index = 0;

    item = null;

    get position ()
    {
        return this.#pos;
    }

    set position (value)
    {
        this.#pos = value;
        this.item.style.top = `${value}px`;
    }

    constructor (name)
    {
        this.item = document.createElement("div");
        this.item.classList.add("item");

        this.item.setAttribute("draggable", true);
        this.item.setAttribute("focused", 0);

        let cancelSelect = false;
        let cancelDrag = false;

        this.item.addEventListener("mousedown", () => {
            if (cancelSelect)
            {
                cancelSelect = false;

                return;
            }

            focused?.item.setAttribute("focused", 0);
            this.item.setAttribute("focused", 1);

            focused = this;
        });
        this.item.addEventListener("dragstart", event => {
            event.preventDefault();

            if (cancelDrag)
            {
                cancelDrag = false;

                return;
            }

            mouse = Input.MouseY();
            Input.SetCursor("grabbing");

            onDragDrop = () => this.#OnDrop();

            dragging = this;
        });
        this.item.addEventListener("contextmenu", () => {
            cancelOnCtx = true;

            const paste = new MenuShortcutItem("Paste", "Ctrl+V");
            paste.enabled = false;

            const ctxMenu = new ContextMenu(
                [
                    new MenuItem("Hide"),
                    new MenuItem("Rename"),
                    new MenuLine(),
                    new MenuShortcutItem("Copy", "Ctrl+C"),
                    new MenuShortcutItem("Cut", "Ctrl+X"),
                    paste,
                    new MenuShortcutItem("Duplicate", "Ctrl+D"),
                    new MenuShortcutItem("Delete", "Del"),
                    new MenuLine(),
                    new MenuShortcutItem("New Layer", "Ctrl+Shift+N")
                ],
                {
                    posX: Input.MouseX(),
                    posY: Input.MouseY(),
                    width: 185
                }
            );

            ctxMenu.onClose = () => cancelOnCtx = false;
        });

        const label = document.createElement("div");
        label.classList.add("label");
        label.append(name);

        const visibility = document.createElement("img");
        visibility.classList.add("visibility");
        visibility.src = "img/eye-show.svg";

        visibility.addEventListener("mousedown", () => {
            cancelSelect = true;
            cancelDrag = true;
        });

        this.item.append(label, visibility);

        this.index = layers.length;
        this.position = this.index * 24;

        layers.push(this);
    }

    #OnDrop ()
    {
        if (dragging == null) return;

        if (this.position > this.index * 24 + 6)
        {
            layers[this.index + 1].index--;
            this.index++;
        }
        else if (this.position < this.index * 24 - 6)
        {
            layers[this.index - 1].index++;
            this.index--;
        }

        layers.sort((a, b) => a.index - b.index);

        if (this.index > 0) layers[this.index - 1].position = layers[this.index - 1].index * 24;
        if (this.index < layers.length - 1) layers[this.index + 1].position = layers[this.index + 1].index * 24;

        this.position = this.index * 24;
        Input.ResetCursor();
        
        dragging = null;
    }
}

function SetSceneName (name)
{
    scenename = name;
}

function Init ()
{
    Input.OnMouseUp().Add(() => onDragDrop());

    RequestUpdate();
}

function RequestUpdate ()
{
    requestAnimationFrame(Update.bind(this));
}

function Update ()
{
    if (dragging == null)
    {
        RequestUpdate();

        return;
    }

    if (dragging.position <= (dragging.index - 1) * 24 && dragging.index > 0)
    {
        const switchee = layers[dragging.index - 1];

        switchee.index++;
        switchee.position = switchee.index * 24;

        dragging.index--;

        layers.sort((a, b) => a.index - b.index);
    }

    if (dragging.position >= (dragging.index + 1) * 24 && dragging.index < layers.length - 1)
    {
        const switchee = layers[dragging.index + 1];

        switchee.index--;
        switchee.position = switchee.index * 24;

        dragging.index++;

        layers.sort((a, b) => a.index - b.index);
    }

    const mouseOld = mouse;
    mouse = Math.max(Math.min(Input.MouseY(), content.getBoundingClientRect().top + (layers.length * 24)), content.getBoundingClientRect().top);
    const delta = mouse - mouseOld;

    dragging.position = Math.max(Math.min(dragging.position + delta, (layers.length - 1) * 24), 0);

    if (dragging.position < dragging.index * 24)
    {
        if (dragging.index > 0) layers[dragging.index - 1].position -= delta;

        if (dragging.index < layers.length - 1) layers[dragging.index + 1].position = layers[dragging.index + 1].index * 24;
    }
    
    if (dragging.position > dragging.index * 24)
    {
        if (dragging.index > 0) layers[dragging.index - 1].position = layers[dragging.index - 1].index * 24;
        
        if (dragging.index < layers.length - 1) layers[dragging.index + 1].position -= delta;
    }

    RequestUpdate();
}

function DrawUI ()
{
    const sceneName = Dock.Label(scenename);
    sceneName.style.fontWeight = "bold";
    sceneName.style.fontSize = "14px";
    sceneName.style.paddingBottom = "8px";
    sceneName.style.color = "rgb(210, 210, 210)";
    sceneName.style.whiteSpace = "nowrap";
    sceneName.style.overflow = "clip";
    sceneName.style.textOverflow = "ellipsis";

    content = Dock.ContainerStart();
    content.classList.add("layers");

    for (let i = 0; i < layers.length; i++) Dock.AddContent(layers[i].item);

    Dock.ContainerEnd();
}

function OnContext ()
{
    if (cancelOnCtx) return;

    const paste = new MenuShortcutItem("Paste", "Ctrl+V");
    paste.enabled = false;

    new ContextMenu(
        [
            paste,
            new MenuLine(),
            new MenuShortcutItem("New Layer", "Ctrl+Shift+N")
        ],
        {
            posX: Input.MouseX(),
            posY: Input.MouseY(),
            width: 185
        }
    )
}


module.exports = {
    Layer,
    SetSceneName,
    Init,
    DrawUI,
    OnContext
};