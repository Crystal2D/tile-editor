function DrawUI ()
{
    selection = Layers.Selection();

    if (selection == null)
    {
        Dock.Info("See nothing?", "Select a layer to start editing!");

        return;
    }


    header = Dock.ContainerStart();
    header.style.display = "flex";
    header.style.width = "calc(100% - 20px)";
    header.style.padding = "10px";
    header.style.paddingTop = "6px";
    header.style.borderBottom = "1px solid rgb(32, 32, 32)";

    const active = Dock.Checkbox();
    active.element.style.marginTop = "6px";
    active.element.style.marginRight = "5px";
    active.value = +selection.active;
    active.onUpdate = value => selection.active = value === 0 ? false : true;

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
    name.onUpdate = value => selection.name = value;

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

    const position = Dock.Vector2Field("Position");
    position.x = selection.position.x;
    position.y = selection.position.y;
    position.fieldX.onUpdate = () => selection.SetPosition(position.x, position.y);
    position.fieldY.onUpdate = () => selection.SetPosition(position.x, position.y);

    const scale = Dock.Vector2Field("Scale", 1, 1);
    scale.x = selection.scale.x;
    scale.y = selection.scale.y;
    scale.fieldX.onUpdate = () => selection.SetScale(scale.x, scale.y);
    scale.fieldY.onUpdate = () => selection.SetScale(scale.x, scale.y);

    Dock.SectionEnd();
    

    Dock.SectionStart("Grid");

    const cellSize = Dock.Vector2Field("Cell Size", 0.5, 0.5);
    cellSize.fieldX.min = 0.0001;
    cellSize.fieldY.min = 0.0001;
    cellSize.x = selection.cellSize.x;
    cellSize.y = selection.cellSize.y;
    cellSize.fieldX.onUpdate = () => selection.SetCellSize(cellSize.x, cellSize.y);
    cellSize.fieldY.onUpdate = () => selection.SetCellSize(cellSize.x, cellSize.y);

    const cellGap = Dock.Vector2Field("Cell Gap");
    cellGap.fieldX.min = 0;
    cellGap.fieldY.min = 0;
    cellGap.x = selection.cellGap.x;
    cellGap.y = selection.cellGap.y;
    cellGap.fieldX.onUpdate = () => selection.SetCellGap(cellGap.x, cellGap.y);
    cellGap.fieldY.onUpdate = () => selection.SetCellGap(cellGap.x, cellGap.y);

    Dock.SectionEnd();
}

function OnContext ()
{

}


module.exports = {
    DrawUI,
    OnContext
};