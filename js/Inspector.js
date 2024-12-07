function DrawUI ()
{
    selection = Layers.Selection();

    if (selection == null) return;


    header = Dock.ContainerStart();
    header.style.display = "flex";
    header.style.width = "calc(100% - 20px)";
    header.style.padding = "10px";
    header.style.paddingTop = "6px";
    header.style.borderBottom = "1px solid rgb(32, 32, 32)";

    const active = Dock.Checkbox();
    active.element.style.marginTop = "6px";
    active.element.style.marginRight = "5px";

    const name = Dock.TextField();
    (() => {
        name.element.style.width = "calc(100% - 92px)";
        name.element.style.padding = "0";

        const inputWrap = name.element.querySelector(".input-wrap");
        inputWrap.style.borderRadius = "4px";
        inputWrap.style.minHeight = "22px";
        inputWrap.style.fontWeight = "bold";
        
        name.element.querySelector(".placehold").style.padding = "5px 7px";
        name.element.querySelector(".input").style.padding = "5px 7px";
    })();

    name.SetText(selection.name);

    (() => {
        const line = document.createElement("div");
        line.style.width = "2px";
        line.style.height = "26px";
        line.style.background = "rgb(32, 32, 32)";
        line.style.margin = "0 6px";

        Dock.AddContent(line);
    })();

    const hidden = Dock.Checkbox("Hidden");
    hidden.element.style.marginTop = "6px";

    Dock.ContainerEnd();


    Dock.SectionStart("Transform");

    Dock.Vector2Field("Position");
    Dock.Vector2Field("Scale", 1, 1);

    Dock.SectionEnd();
    

    Dock.SectionStart("Grid");

    Dock.Vector2Field("Cell Size", 0.25, 0.25);
    Dock.Vector2Field("Cell Gap");

    Dock.SectionEnd();
}

function OnContext ()
{

}


module.exports = {
    DrawUI,
    OnContext
};