const { ipcRenderer, shell } = require("electron");
const FS = require("fs/promises");
const SyncFS = require("fs");
const { spawn } = require("child_process");

const DelegateEvent = require("./../js/DelegateEvent");
const MenuManager = require("./../js/MenuManager");
const { MenuItem, MenuLine, ContextMenu } = require("./../js/MenuManager");
const ProjectManager = require("./js/ProjectManager");