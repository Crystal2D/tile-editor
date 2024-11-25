const { ipcRenderer } = require("electron");
const FS = require("fs/promises");
const SyncFS = require("fs");
const { spawn } = require("child_process");
const { shell } = require("electron");

const DelegateEvent = require("./../js/DelegateEvent");
const Input = require("./../js/Input");
const MenuManager = require("./../js/MenuManager");
const { MenuItem, MenuLine, ContextMenu } = require("./../js/MenuManager");
const ProjectManager = require("./js/ProjectManager");