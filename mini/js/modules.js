const FS = require("fs/promises");
const { ipcRenderer } = require("electron");

const DelegateEvent = require("./../js/DelegateEvent");
const MenuManager = require("./../js/MenuManager");
const { MenuItem, MenuLine, MenuShortcutItem, ContextMenu } = require("./../js/MenuManager");
const Refractor = require("./../js/Refractor");

const SceneView = null;
const LoadingScreen = null;

const Input = require("./../js/Input/Input");
const KeyCode = require("./../js/Input/KeyCode");