let focused = false;

function DrawUI ()
{
    focused = true;

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
    active.onUpdate = value => selection.active = value === 1;

    const name = Dock.TextField();
    (() => {
        name.element.style.width = "calc(100% - 92px)";
        name.element.style.padding = "0";

        const inputWrap = name.element.querySelector(".input-wrap");
        inputWrap.style.borderRadius = "4px";
        inputWrap.style.fontWeight = "bold";

        const input = name.element.querySelector(".input")
        name.onBlur = () => {
            const text = input.innerText.trim();

            if (text.length > 0) return;

            input.innerText = selection.name;
        };
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
    hidden.value = +selection.hidden;
    hidden.onUpdate = value => selection.hidden = value === 1;

    Dock.ContainerEnd();


    const inspectorData = ProjectManager.GetEditorData().inspector;


    const transform = Dock.SectionStart("Transform");
    transform.SetActive(inspectorData.transformShown);
    transform.onUpdate = value => {
        inspectorData.transformShown = value;

        ProjectManager.SaveEditorData();
    };

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
    

    const grid = Dock.SectionStart("Grid");
    grid.SetActive(inspectorData.gridShown);
    grid.onUpdate = value => {
        inspectorData.gridShown = value;

        ProjectManager.SaveEditorData();
    };

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


    const tilemap = Dock.SectionStart("Tilemap");
    tilemap.SetActive(inspectorData.tilemapShown);
    tilemap.onUpdate = value => {
        inspectorData.tilemapShown = value;

        ProjectManager.SaveEditorData();
    };

    const sortingLayer = Dock.NumberField("Sorting Layer (ID)");
    sortingLayer.SetValue(selection.sortingLayer);
    sortingLayer.onUpdate = value => selection.sortingLayer = value;

    const sortingOrder = Dock.NumberField("Sorting Order");
    sortingOrder.SetValue(selection.sortingOrder);
    sortingOrder.onUpdate = value => selection.sortingOrder = value;

    Dock.SectionEnd();
}

function OnClear ()
{
    focused = false;
}

function Redraw ()
{
    if (!focused || Layers.Selection() == null) return;

    Dock.Unfocus();
    Dock.FocusByIndex(1);
}


module.exports = {
    DrawUI,
    OnClear,
    Redraw
};