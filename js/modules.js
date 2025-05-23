const FS = require("fs/promises");
const HideFile = require("hidefile");
const { ipcRenderer } = require("electron");

const LoadingScreen = require("./js/LoadingScreen");
const ProjectManager = require("./js/ProjectManager");
const SceneManager = require("./js/SceneManager");
const DelegateEvent = require("./js/DelegateEvent");
const ActionManager = require("./js/ActionManager");
const MenuManager = require("./js/MenuManager");
const { MenuItem, MenuLine, MenuShortcutItem, ContextMenu } = require("./js/MenuManager");
const UIReferenceBank = require("./js/UIReferenceBank");
const Dock = require("./js/Dock");
const Refractor = require("./js/Refractor");
const Footer = require("./js/Footer");
const { FooterItem } = require("./js/Footer");

const TextureManager = require("./js/TextureManager");
const Preferences = require("./js/Preferences");

const Input = require("./js/Input/Input");
const KeyCode = require("./js/Input/KeyCode");

const Layers = require("./js/Docks/Layers");
const { Layer } = require("./js/Docks/Layers");
const Inspector = require("./js/Docks/Inspector");
const Palette = require("./js/Docks/Palette");