const FS = require("fs/promises");
const { ipcRenderer } = require("electron");

const ProjectManager = require("./js/ProjectManager");
const SceneManager = require("./js/SceneManager");
const DelegateEvent = require("./js/DelegateEvent");
const Input = require("./js/Input");
const MenuManager = require("./js/MenuManager");
const { MenuItem, MenuLine, MenuShortcutItem, ContextMenu } = require("./js/MenuManager");
const Dock = require("./js/Dock");
const Layers = require("./js/Layers");
const { Layer } = require("./js/Layers");
const Inspector = require("./js/Inspector");
const Refractor = require("./js/Refractor");
const Palette = require("./js/Palette");