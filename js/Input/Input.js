let loaded = false;
let denyDrag = false;
let mouseX = 0;
let mouseY = 0;
let onMouseDown = new DelegateEvent();
let onMouseUp = new DelegateEvent();

let body = null;

class Key
{
    active = false;
    lastState = false;
    isLetter = false;
    name = "";
    code = "";
    
    constructor (name, code, isLetter)
    {
        this.name = name;
        this.code = code;
        this.isLetter = isLetter ?? false;
    }
}

let keys = [
    new Key("w", "w", true),
    new Key("s", "s", true),
    new Key("a", "a", true),
    new Key("d", "d", true),
    new Key("shift", "Shift"),
    new Key("backspace", "Backspace"),
    new Key("f", "f", true),
    new Key("t", "t", true),
    new Key("ctrl", "Control"),
    new Key("b", "b", true),
    new Key("e", "e", true),
    new Key("r", "r", true),
    new Key("p", "p", true),
    new Key("c", "c", true),
    new Key("v", "v", true),
    new Key("n", "n", true),
    new Key("x", "x", true),
    new Key("del", "Delete"),
    new Key("o", "o", true),
    new Key("z", "z", true)
];

function FindKey (name)
{
    let output = -1;
    
    keys.find((element, index) => {
        if (element.name !== name) return false;
        
        output = index;
        
        return true;
    });
    
    return output;
}

function FindKeyByCode (code)
{
    let output = -1;
    
    keys.find((element, index) => {
        if (element.code !== (element.isLetter ? code.toLowerCase() : code)) return false;
        
        output = index;
        
        return true;
    });
    
    return output;
}

function MouseX ()
{
    return mouseX;
}

function MouseY ()
{
    return mouseY;
}

function OnMouseDown ()
{
    return onMouseDown;
}

function OnMouseUp ()
{
    return onMouseUp;
}

function SetCursor (cursor)
{
    body.setAttribute("cursor-locked", 1);

    body.style.cursor = cursor;
}

function ResetCursor ()
{
    body.setAttribute("cursor-locked", 0);

    body.style.cursor = "auto";
}

function Init ()
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
    document.addEventListener("mousedown", event => onMouseDown.Invoke(event));
    document.addEventListener("mouseup", event => onMouseUp.Invoke(event));
    document.addEventListener("keydown", event => {
        if ((event.ctrlKey && event.key.toLowerCase() === "r") || event.key === "F5") event.preventDefault();

        if (MenuManager.Enabled())
        {
            event.preventDefault();

            return;
        }

        const focus = document.activeElement;

        if (focus.contentEditable === "true" || focus.contentEditable === "plaintext-only") return;

        const keyIndex = FindKeyByCode(event.key);
        
        if (keyIndex === -1) return;
        
        event.preventDefault();
        
        keys[keyIndex].active = true;

        if (SceneView?.isLoaded && !LoadingScreen?.IsEnabled()) SceneView.Refract(`Input.KeyDown("${event.key}")`);
    });
    document.addEventListener("keyup", event => {
        if (MenuManager.Enabled())
        {
            event.preventDefault();

            return;
        }

        const focus = document.activeElement;

        if (focus.contentEditable === "true" || focus.contentEditable === "plaintext-only") return;

        const keyIndex = FindKeyByCode(event.key);
        
        if (keyIndex === -1) return;
        
        event.preventDefault();
        
        keys[keyIndex].active = false;

        if (SceneView?.isLoaded && !LoadingScreen?.IsEnabled()) SceneView.Refract(`Input.KeyUp("${event.key}")`);
    });

    body.setAttribute("cursor-locked", 0);
    
    loaded = true;
}

function End ()
{
    const inputFocused = document.activeElement.contentEditable === "true" || document.activeElement.contentEditable === "plaintext-only" || MenuManager.Enabled();

    for (let i = 0; i < keys.length; i++)
    {
        if (inputFocused)
        {
            keys[i].active = false;

            if (SceneView?.isLoaded) SceneView.Refract(`Input.KeyUp("${keys[i].code}")`);
        }

        if (SceneView?.isLoaded && LoadingScreen?.IsEnabled() && !(["Control", "Shift"]).includes(keys[i].code)) SceneView.Refract(`Input.KeyUp("${keys[i].code}")`);

        keys[i].lastState = keys[i].active;
    }
}

function GetKey (key)
{
    let keyIndex = key;
    
    if (typeof key === "string")
    {
        keyIndex = FindKey(key);
        
        if (keyIndex == null) return false;
    }
    else if (key < 0 || key >= keys.length) return;
    
    return keys[keyIndex].active;
}

function GetKeyDown (key)
{
    let keyIndex = key;
    
    if (typeof key === "string")
    {
        keyIndex = FindKey(key);
        
        if (keyIndex == null) return false;
    }
    else if (key < 0 || key >= keys.length) return;
    
    return keys[keyIndex].active && !keys[keyIndex].lastState;
}

function GetKeyUp (key)
{
    let keyIndex = key;
    
    if (typeof key === "string")
    {
        keyIndex = FindKey(key);
        
        if (keyIndex == null) return false;
    }
    else if (key < 0 || key >= keys.length) return;
    
    return !keys[keyIndex].active && keys[keyIndex].lastState;
}

function AvoidDrags (state)
{
    if (denyDrag !== state) denyDrag = state;
}

function RestateKeys ()
{
    for (let i = 0; i < keys.length; i++)
    {
        keys[i].active = false;
        keys[i].lastState = keys[i].active;
        
        if (SceneView?.isLoaded) SceneView.Refract(`Input.KeyUp("${keys[i].code}")`);
    }
}

function OnCtrl (key)
{
    let keyIndex = key;
    
    if (typeof key === "string")
    {
        keyIndex = FindKey(key);
        
        if (keyIndex == null) return false;
    }
    else if (key < 0 || key >= keys.length) return;

    const ctrlIndex = FindKeyByCode("Control");

    for (let i = 0; i < keys.length; i++)
    {
        if (i === keyIndex || i === ctrlIndex) continue;

        if (keys[i].active) return false;
    }

    return keys[keyIndex].active && !keys[keyIndex].lastState && keys[ctrlIndex].active;
}

function OnCtrlShift (key)
{
    let keyIndex = key;
    
    if (typeof key === "string")
    {
        keyIndex = FindKey(key);
        
        if (keyIndex == null) return false;
    }
    else if (key < 0 || key >= keys.length) return;

    const ctrlIndex = FindKeyByCode("Control");
    const shiftIndex = FindKeyByCode("Shift");

    for (let i = 0; i < keys.length; i++)
    {
        if (i === keyIndex || i === ctrlIndex || i === shiftIndex) continue;

        if (keys[i].active) return false;
    }

    return keys[keyIndex].active && !keys[keyIndex].lastState && keys[ctrlIndex].active && keys[shiftIndex].active;
}


module.exports = {
    MouseX,
    MouseY,
    OnMouseDown,
    OnMouseUp,
    Init,
    End,
    SetCursor,
    ResetCursor,
    GetKey,
    GetKeyDown,
    GetKeyUp,
    AvoidDrags,
    RestateKeys,
    OnCtrl,
    OnCtrlShift
};