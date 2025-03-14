let resizing = false;
let sizerOffset = 0;
let size = 0;
let tree = [];
let tabList = [];
let onContext = () => { };
let onClear = () => { };

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

function PlaceholdText (text)
{
    const list = UIReferenceBank.placeholdText;

    const output = `${list[Math.floor(Math.random() * list.length)]}...`;

    return text == null ? output : `${output}\n\n${text}`
}

function Init ()
{
    size = ProjectManager.GetEditorData().dockSize;
    main.style.setProperty("--dock-size", `${size}px`);

    sizer = document.createElement("div");
    sizer.classList.add("sizer");
    sizer.addEventListener("mousedown", event => {
        if (event.button !== 0 || resizing) return;

        resizing = true;

        Input.AvoidDrags(true);
        Input.SetCursor("w-resize");

        const mouse = Math.max(Math.min(Input.MouseX(), window.innerWidth - 300), 300);
        sizerOffset = dock.getBoundingClientRect().x - mouse;
    });

    tabs = document.createElement("div");
    tabs.classList.add("tabs");

    content = document.createElement("div");
    content.classList.add("content");

    let mouseOver = false;
    let contextDown = false;
    let contextUp = false;

    content.addEventListener("mouseover", () => mouseOver = true);
    content.addEventListener("mouseout", () => mouseOver = false);
    content.addEventListener("mouseup", event => {
        const clicked = contextDown;
        contextDown = false;

        if (event.button === 2 && clicked) contextUp = true;
    });

    dock.append(tabs, content, sizer);

    Input.OnMouseDown().Add(event => {
        if (resizing)
        {
            event.preventDefault();

            document.activeElement.blur();
        }

        requestAnimationFrame(() => { if (event.button === 2 && mouseOver) contextDown = true; })
    });
    Input.OnMouseUp().Add(() => {
        if (resizing)
        {
            resizing = false;

            Input.ResetCursor();
            Input.AvoidDrags(false);

            onResizeEnd.Invoke();
        }

        if (contextUp)
        {
            onContext();

            contextUp = false;
        }
    });

    Loop.Append(() => Update());
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

            ProjectManager.GetEditorData().dockSize = size;
            ProjectManager.SaveEditorData();
            
            onResize.Invoke();
            onResizeEnd.Invoke();
        }

        return;
    }

    const mouse = Math.max(Math.min(Input.MouseX() + sizerOffset, window.innerWidth - 300), 300);
    const newSize = window.innerWidth - mouse;

    size = newSize;
    main.style.setProperty("--dock-size", `${size}px`);

    ProjectManager.GetEditorData().dockSize = size;
    ProjectManager.SaveEditorData();

    onResize.Invoke();
}

function AddTab (label)
{
    const tab = document.createElement("div");
    tab.setAttribute("draggable", false);

    const index = tabList.length;

    const output = {
        element: tab,
        onFocus: () => { },
        Bind: (callback, onCtx, onClr) => {
            output.onFocus = () => {
                callback();
                onContext = onCtx ?? (() => { });
                onClear = onClr ?? (() => { });
            };

            if (focused !== tab) return;

            focused = null;
            output.Focus();
        },
        Focus: () => {
            const lastFocused = focused;

            if (lastFocused === tab) return;

            if (lastFocused == null)
            {
                Unfocus();

                focused = index;
                tab.setAttribute("focused", 1);
                output.onFocus();
                
                return;
            }

            ActionManager.StartRecording("Dock.TabChange");
            ActionManager.Record(
                "Dock.TabChange",
                () => {
                    Unfocus();

                    focused = index;
                    tab.setAttribute("focused", 1);
                    output.onFocus();
                },
                () => {
                    Unfocus();

                    focused = lastFocused;
                    tabList[focused].element.setAttribute("focused", 1);
                    tabList[focused].onFocus();
                }
            );
            ActionManager.StopRecording("Dock.TabChange");
        },
        get isFocused ()
        {
            return focused === tab;
        }
    };

    tab.addEventListener("mousedown", event => { if (event.button === 0) output.Focus(); });

    tab.append(label);
    tabs.append(tab);

    tabList.push(output);

    return output;
}

function FocusByIndex (index)
{
    tabList[index].Focus();
}

function Unfocus ()
{
    if (focused == null) return;

    Clear();

    tabList[focused].element.setAttribute("focused", 0);
    focused = null;
}

function Clear ()
{
    while (content.firstChild != null) content.firstChild.remove();

    onClear();

    onContext = () => { };
    onClear = () => { };
}

function AddContent (data)
{
    if (tree.length === 0) content.append(data);
    else tree[tree.length - 1].append(data);
}

function Label (text)
{
    const label = document.createElement("div");
    label.classList.add("ui-label");
    label.append(text);

    AddContent(label);

    return label;
}

function Checkbox (label)
{
    const checkbox = document.createElement("div");
    checkbox.classList.add("ui-checkbox");

    let check = 0;

    let output = {
        get value ()
        {
            return check;
        },
        set value (value)
        {
            check = value;

            checkbox.setAttribute("checked", value);
            this.onUpdate(value);
        },
        element: checkbox,
        onUpdate: () => { }
    };

    output.value = 0;

    const box = document.createElement("div");
    box.classList.add("box");

    const checkedImg = document.createElement("img");
    checkedImg.classList.add("checked");
    checkedImg.src = "img/checkmark/checked.svg";

    const kindaImg = document.createElement("img");
    kindaImg.classList.add("kinda");
    kindaImg.src = "img/checkmark/kinda.svg";

    box.append(checkedImg, kindaImg);

    const text = document.createElement("div");
    text.classList.add("label");

    if (label != null)
    {
        text.append(label);
        text.style.display = "inline-block";
    }

    checkbox.addEventListener("click", () => output.value = check === 2 ? 0 : (check ? 0 : 1));

    checkbox.append(box, text);

    AddContent(checkbox);

    return output;
}

function TextArea (label, placeholdText)
{
    const textArea = document.createElement("div");
    textArea.classList.add("ui-textarea");

    let output = {
        value: "",
        element: textArea,
        onBlur: () => { },
        onUpdate: () => { },
        onValuePass: value => value
    };

    const text = document.createElement("div");
    text.classList.add("label");

    if (label != null)
    {
        text.append(label);
        text.style.display = "block";
    }

    const inputWrap = document.createElement("div");
    inputWrap.classList.add("input-wrap");

    const placehold = document.createElement("div");
    placehold.classList.add("placehold");
    placehold.append(PlaceholdText(placeholdText));

    const input = document.createElement("span");
    input.classList.add("input");
    input.contentEditable = "plaintext-only";
    input.spellcheck = false;

    output.SetText = value => {
        if (value == null) value = "";

        placehold.style.display = value.length === 0 ? "" : "none";
        input.style.display = value.length === 0 ? "" : "block";

        input.innerText = value;
        output.value = value;
    };

    input.addEventListener("focus", () => inputWrap.style.border = "1.5px solid rgb(232, 232, 232)");
    input.addEventListener("blur", () => {
        output.onBlur();

        inputWrap.style.border = "";

        input.innerText = input.innerText.trim();
        const text = input.innerText;

        output.value = output.onValuePass(text);
        output.onUpdate(output.onValuePass(text));

        if (text.length !== 0) return;

        placehold.style.display = "";
        input.style.display = "";
    });
    inputWrap.addEventListener("mousedown", event => {
        if (event.button !== 0) return;

        placehold.style.display = "none";
        input.style.display = "block";
            
        requestAnimationFrame(() => input.focus());
    });

    inputWrap.append(placehold, input);
    textArea.append(text, inputWrap);
    
    AddContent(textArea);

    return output;
}

function TextField (label, placeholdText)
{
    const output = TextArea(label, placeholdText);

    const input = output.element.querySelector(".input");
    input.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;

        event.preventDefault();

        input.blur();
    })
    input.addEventListener("input", () => {
        input.textContent = input.textContent.replace(/(?:\r\n|\r|\n)/g, "");
    });

    output.element.setAttribute("type", "field");

    return output;
}

function NumberField (label, defaultValue)
{
    const output = TextArea(label);
    output.min = null;
    output.onValuePass = value => parseFloat(value);
    output.SetValue = value => {
        const val = Number.isNaN(parseFloat(value)) ? (defaultValue ?? 0) : parseFloat(value);

        output.SetText(output.min == null ? val : Math.max(val, output.min));
    };
    output.SetText(defaultValue ?? 0);

    const placehold = output.element.querySelector(".placehold");
    placehold.textContent = "";

    const input = output.element.querySelector(".input");
    input.addEventListener("keydown", event => {
        if (event.key === " ") event.preventDefault();
        if (event.key !== "Enter") return;

        event.preventDefault();

        input.blur();
    })
    input.addEventListener("input", () => {
        input.textContent = input.textContent.replace(/(?:\r\n|\r|\n)/g, "");
    });
    input.addEventListener("focus", () => {
        const range = document.createRange();
        range.selectNodeContents(input);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    });
    output.onBlur = () => {
        output.SetText(parseFloat(input.textContent.trim()));

        output.SetValue(input.textContent);
    };

    output.element.setAttribute("type", "number");

    return output;
}

function FocusElement (element)
{
    tree.push(element);
}

function UnfocusElement ()
{
    return tree.pop();
}

function ContainerStart ()
{
    const output = document.createElement("div");
    FocusElement(output);

    return output;
}

function ContainerEnd ()
{
    const output = UnfocusElement();

    AddContent(output);

    return output;
}

function Vector2Field (label, defaultX, defaultY)
{
    const field = ContainerStart();
    field.classList.add("ui-vec2field");

    Label(label);

    ContainerStart().classList.add("wrap");

    const x = NumberField("X", defaultX);
    const y = NumberField("Y", defaultY);

    let output = {
        element: field,
        fieldX: x,
        fieldY: y,
        get x ()
        {
            return x.value;
        },
        set x (value)
        {
            x.SetValue(value);
        },
        get y ()
        {
            return y.value;
        },
        set y (value)
        {
            y.SetValue(value);
        },
    };

    ContainerEnd();
    ContainerEnd();

    return output;
}

function SectionStart (label)
{
    const sectionLabel = ContainerStart();
    sectionLabel.classList.add("ui-section-label");

    const chevron = document.createElement("img");
    chevron.classList.add("chevron");
    chevron.src = "img/chevron-small/down.svg";

    AddContent(chevron);
    AddContent(label);

    ContainerEnd();

    const sectionContent = ContainerStart();
    sectionContent.classList.add("ui-section-content");

    let enabled = false;

    const output = {
        get enabled ()
        {
            return enabled;
        },
        element: sectionContent,
        onUpdate: () => { },
        SetActive: (state) => {
            if (enabled === state) return;

            chevron.src = `img/chevron-small/${state ? "down" : "right"}.svg`;

            sectionLabel.setAttribute("enabled", +state);
            sectionContent.setAttribute("enabled", +state);

            enabled = state;

            output.onUpdate(state);
        }
    };

    sectionLabel.addEventListener("click", () => output.SetActive(!enabled));

    output.SetActive(true);

    return output;
}

function SectionEnd ()
{
    return ContainerEnd();
}

function Info (title, description)
{
    ContainerStart().classList.add("ui-info");

    const img = document.createElement("img");
    img.addEventListener("dragstart", event => event.preventDefault());

    const imgs = UIReferenceBank.infoImg;

    img.src = `img/idk/${imgs[Math.floor(Math.random() * imgs.length)]}`;

    AddContent(img);

    Label(title).classList.add("title");
    Label(description).classList.add("description");

    return ContainerEnd();
}

function Button (label)
{
    const element = document.createElement("div");
    element.classList.add("ui-button");
    element.append(label);

    let enabled = false;

    const output = {
        element: element,
        get enabled ()
        {
            return enabled;
        },
        onClick: () => { },
        SetActive: (state) => {
            if (enabled === state) return;

            element.setAttribute("enabled", +state);

            enabled = state;
        }
    };

    element.addEventListener("click", () => output.onClick());

    output.SetActive(true);

    AddContent(element);

    return output;
}

function SearchBar ()
{
    const search = ContainerStart();
    search.classList.add("ui-search");

    let searchFocused = false;
    let searchFocusedLocked = false;

    const setSearchHover = state => {
        if (searchFocused === state || searchFocusedLocked) return;
            
        search.setAttribute("focused", +state);

        searchFocused = state;
    };

    const searchImg = document.createElement("img");
    searchImg.src = "img/search.svg";
    searchImg.addEventListener("dragstart", event => event.preventDefault());
    searchImg.addEventListener("mouseover", () => setSearchHover(true));
    searchImg.addEventListener("mouseout", () => setSearchHover(false));
    AddContent(searchImg);

    const searchbar = TextField();
    searchbar.element.addEventListener("mouseover", () => setSearchHover(true));
    searchbar.element.addEventListener("mouseout", () => setSearchHover(false));

    const placehold = searchbar.element.querySelector(".placehold");
    const input = searchbar.element.querySelector(".input");

    placehold.textContent = "Search...";
    
    input.addEventListener("focus", () => {
        setSearchHover(true);

        searchFocusedLocked = true;
    });
    input.addEventListener("blur", () => {
        searchFocusedLocked = false;

        setSearchHover(false);
    });

    searchImg.addEventListener("mousedown", event => {
        if (event.button !== 0) return;

        event.preventDefault();

        placehold.style.display = "none";
        input.style.display = "block";

        requestAnimationFrame(() => {
            input.focus();

            const range = document.createRange();
            range.selectNodeContents(input);
            
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });
    });

    ContainerEnd();

    searchbar.container = search;

    return searchbar;
}


module.exports = {
    OnResize,
    OnResizeEnd,
    Init,
    AddTab,
    FocusByIndex,
    Unfocus,
    Clear,
    AddContent,
    Label,
    Checkbox,
    TextArea,
    TextField,
    NumberField,
    FocusElement,
    UnfocusElement,
    ContainerStart,
    ContainerEnd,
    Vector2Field,
    SectionStart,
    SectionEnd,
    Info,
    Button,
    SearchBar
};