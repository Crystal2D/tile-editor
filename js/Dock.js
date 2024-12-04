let resizing = false;
let mouse = 0;
let size = 400;
let tree = [];
let onContext = () => { };

let sizer = null;
let tabs = null;
let content = null;
let focused = null;

const onResize = new DelegateEvent();
const onResizeEnd = new DelegateEvent();

function OnResize ()
{
    return onResize;
}

function OnResizeEnd ()
{
    return onResizeEnd;
}

function Init ()
{
    sizer = document.createElement("div");
    sizer.classList.add("sizer");
    sizer.addEventListener("mousedown", event => {
        if (event.button !== 0 || resizing) return;

        resizing = true;

        Input.AvoidDrags(true);
        Input.SetCursor("w-resize");
        mouse = Input.MouseX();
    });

    tabs = document.createElement("div");
    tabs.classList.add("tabs");

    content = document.createElement("div");
    content.classList.add("content");

    content.addEventListener("contextmenu", () => onContext());

    dock.append(tabs, content, sizer);

    Input.OnMouseUp().Add(() => {
        if (!resizing) return;

        resizing = false;

        Input.ResetCursor();
        Input.AvoidDrags(false);

        onResizeEnd.Invoke();
    });

    RequestUpdate();
}

function RequestUpdate ()
{
    requestAnimationFrame(Update.bind(this));
}

function Update ()
{
    if (!resizing)
    {
        const maxSize = window.innerWidth - 300;

        if (size > maxSize)
        {
            size = maxSize;
            main.style.setProperty("--dock-size", `${size}px`);
            
            onResize.Invoke();
            onResizeEnd.Invoke();
        }

        RequestUpdate();

        return;
    }

    const mouseOld = mouse;
    mouse = Math.max(Math.min(Input.MouseX(), window.innerWidth - 300), 300);
    const delta = mouse - mouseOld;

    size -= delta;
    main.style.setProperty("--dock-size", `${size}px`);

    if (delta !== 0) onResize.Invoke();

    RequestUpdate();
}

function AddTab (label)
{
    const tab = document.createElement("div");
    tab.setAttribute("draggable", false);

    let onFocus = () => { };

    const output = {
        Bind: (callback, onCtx) => {
            onFocus = () => {
                callback();
                onContext = onCtx;
            };

            if (focused !== tab) return;

            focused = null;
            output.Focus();
        },
        Focus: () => {
            if (focused === tab) return;

            Clear();

            focused?.setAttribute("focused", 0);

            focused = tab;
            focused.setAttribute("focused", 1);
            onFocus();
        }
    };

    if (focused == null) output.Focus();

    tab.addEventListener("mousedown", event => { if (event.button === 0) output.Focus(); });

    tab.append(label);
    tabs.append(tab);

    return output;
}

function Clear ()
{
    while (content.firstChild != null) content.firstChild.remove();
}

function AddContent (...data)
{
    for (i = 0; i < data.length; i++)
    {
        if (tree.length === 0) content.append(data[i]);
        else tree[tree.length - 1].append(data[i]);
    }
}

function Label (text)
{
    const label = document.createElement("div");
    label.classList.add("ui-label");
    label.append(text);

    AddContent(label);

    return label;
}

function ContainerStart ()
{
    const output = document.createElement("div");
    tree.push(output);

    return output;
}

function ContainerEnd ()
{
    const output = tree.pop();

    AddContent(output);

    return output;
}


module.exports = {
    OnResize,
    OnResizeEnd,
    Init,
    AddTab,
    Clear,
    AddContent,
    Label,
    ContainerStart,
    ContainerEnd
};