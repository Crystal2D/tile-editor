let enabled = false;

let wrap = null;
let content = null;
let textElement = null

function Set ()
{
    wrap = document.createElement("div");
    wrap.id = "loading-screen";
    wrap.setAttribute("enabled", 0);

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

function SetText (text)
{
    if (!enabled) return;

    textElement.textContent = text;
}

function Disable ()
{
    if (!enabled) return;

    SetText("");

    wrap.setAttribute("enabled", 0);

    enabled = false;
}


module.exports = {
    Set,
    Enable,
    SetText,
    Disable
};