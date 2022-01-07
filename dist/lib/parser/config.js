"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

exports.getSettings;
var vscode = require("vscode");
exports.CONFIGURATION_KEY = "vhdl-linter";
exports.CONFIGURATION_TEST = "test"; // Boolean
function getSettings(key, defaultValue) {
    return vscode.workspace.getConfiguration(exports.CONFIGURATION_KEY, null).get(key, defaultValue);
}
exports.getSettings = getSettings;


//# sourceMappingURL=config.js.map