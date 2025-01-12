let enabled = false;
let mini = false;
let textLocked = false;

let wrap = null;
let content = null;
let textElement = null

function IsEnabled ()
{
    return enabled;
}

function Set ()
{
    wrap = document.createElement("div");
    wrap.id = "loading-screen";
    wrap.setAttribute("enabled", 0);
    wrap.setAttribute("mini", 0);

    content = document.createElement("div");
    content.classList.add("content");

    const title = document.createElement("div");
    title.classList.add("title");
    title.append("Crystal Tile Editor");

    const version = document.createElement("div");
    version.classList.add("version");
    version.append(`Version ${ProjectManager.editorDisplayVersion}`, document.createElement("br"), "© 2025 Desert Lake & Contributors");

    textElement = document.createElement("div");
    textElement.classList.add("text");

    content.append(title, version, textElement);
    wrap.append(content);
    document.body.append(wrap);
}

function Enable ()
{
    if (enabled) return;
    
    wrap.setAttribute("enabled", 1);

    enabled = true;
}

function EnableMini ()
{
    if (enabled) return;

    wrap.setAttribute("enabled", 1);
    wrap.setAttribute("mini", 1);

    enabled = true;
    mini = true;
}

function SetText (text)
{
    if (!enabled || textLocked) return;

    textElement.textContent = text;
}

function Disable ()
{
    if (!enabled) return;

    SetText("");

    wrap.setAttribute("enabled", 0);
    enabled = false;

    if (mini)
    {
        wrap.setAttribute("mini", 0);
        mini = false;
    }
}

function LockText ()
{
    if (!textLocked) textLocked = true;
}

function UnlockText ()
{
    if (textLocked) textLocked = false;
}


module.exports = {
    IsEnabled,
    Set,
    Enable,
    EnableMini,
    SetText,
    Disable,
    LockText,
    UnlockText
};