let cancelUndo = false;
let records = [];
let onBeforeUndo = new DelegateEvent();

let previousAction = null;
let nextAction = null;

function IsUndoable ()
{
    return previousAction != null;
}

function IsRedoable ()
{
    return nextAction != null;
}

function RecordExists (id)
{
    return records.find(item => item.id === id) != null;
}

function StartRecording (id)
{
    const exists = RecordExists(id);    

    if (!exists) records.push({
        id: id,
        previous: previousAction,
        next: null,
        onRedo: new DelegateEvent(),
        onUndo: new DelegateEvent(),
        onChange: () => { }
    });
}

function Record (id, onRedo, onUndo)
{
    const record = records.find(item => item.id === id);

    if (record == null) return;

    onRedo();

    record.onRedo.Add(onRedo);
    record.onUndo.Add(onUndo);
}

function StopRecording (id, onChange)
{
    const record = records.find(item => item.id === id);

    if (record == null) return;

    if (onChange != null) record.onChange = () => onChange();

    if (previousAction != null) previousAction.next = record;
    
    previousAction = record;

    nextAction = null;
    
    const index = records.indexOf(record);
    records.splice(index, 1);
}

function Undo ()
{
    onBeforeUndo.Invoke();

    if (cancelUndo)
    {
        cancelUndo = false;
    
        return;
    }
    
    if (!IsUndoable()) return;
    
    previousAction.onUndo.InvokeReversed();
    previousAction.onChange();
    nextAction = previousAction;
    previousAction = previousAction.previous;
    
}

function Redo ()
{
    if (!IsRedoable()) return;

    nextAction.onRedo.Invoke();
    nextAction.onChange();
    previousAction = nextAction;
    nextAction = nextAction.next;
}

function CancelUndo ()
{
    cancelUndo = true;
}

function OnBeforeUndo ()
{
    return onBeforeUndo;
}

module.exports = {
    IsUndoable,
    IsRedoable,
    RecordExists,
    StartRecording,
    Record,
    StopRecording,
    Undo,
    Redo,
    CancelUndo,
    OnBeforeUndo
};