const { ipcRenderer, shell } = require("electron");
const FS = require("fs/promises");
const SyncFS = require("fs");
const { spawn } = require("child_process");

const DelegateEvent = require("./../js/DelegateEvent");
const MenuManager = require("./../js/MenuManager");
const { MenuItem, MenuLine, ContextMenu } = require("./../js/MenuManager");
const ProjectManager = require("./js/ProjectManager");

const SceneView = null;
const LoadingScreen = null;

const Input = require("./../js/Input/Input");
const KeyCode = require("./../js/Input/KeyCode");