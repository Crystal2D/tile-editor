let loaded = false;
let cursorLocked = false;
let denyDrag = false;
let mouseX = 0;
let mouseY = 0;
let onMouseUp = new DelegateEvent();

let body = null;

function MouseX ()
{
    return mouseX;
}

function MouseY ()
{
    return mouseY;
}

function OnMouseUp ()
{
    return onMouseUp;
}

function SetCursor (cursor)
{
    cursorLocked = true;

    body.setAttribute("cursor-locked", 1);

    body.style.cursor = cursor;
}

function ResetCursor ()
{
    cursorLocked = false;

    body.setAttribute("cursor-locked", 0);

    body.style.cursor = "auto";
}

function Set ()
{
    if (loaded) return;

    body = document.body;

    document.addEventListener("mousemove", event => {
        mouseX = event.clientX;
        mouseY = event.clientY;
    });
    document.addEventListener("dragstart", event => {
        if (denyDrag) event.preventDefault();
    });
    document.addEventListener("mouseup", event => {
        event.preventDefault();
        
        onMouseUp.Invoke();
    });

    body.setAttribute("cursor-locked", 0);
    
    loaded = true;
}

function AvoidDrags (state)
{
    if (denyDrag !== state) denyDrag = state;
}


module.exports = {
    MouseX,
    MouseY,
    OnMouseUp,
    Set,
    SetCursor,
    ResetCursor,
    AvoidDrags
}