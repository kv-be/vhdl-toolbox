"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const vhdl_linter_1 = require("./vhdl-linter");
const project_parser_1 = require("./project-parser");
const objects_1 = require("./parser/objects");
function getEntity() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const vhdlLinter = new vhdl_linter_1.VhdlLinter(editor.document.uri.path, editor.document.getText(), new project_parser_1.ProjectParser([]), true);
    if (vhdlLinter.tree instanceof objects_1.OFileWithEntity) {
        return vhdlLinter.tree.entity;
    }
}
var CopyTypes;
(function (CopyTypes) {
    CopyTypes[CopyTypes["Instance"] = 0] = "Instance";
    CopyTypes[CopyTypes["Sysverilog"] = 1] = "Sysverilog";
    CopyTypes[CopyTypes["Signals"] = 2] = "Signals";
})(CopyTypes = exports.CopyTypes || (exports.CopyTypes = {}));
function copy(type) {
    const entity = getEntity();
    if (!entity) {
        return;
    }
    let text;
    if (type === CopyTypes.Instance) {
        text = instanceTemplate(entity);
    }
    else if (type === CopyTypes.Signals) {
        text = signalsTemplate(entity);
    }
    else if (type === CopyTypes.Sysverilog) {
        text = sysVerilogTemplate(entity);
    }
    else {
        text = '';
    }
    vscode.env.clipboard.writeText(text);
    vscode.window.showInformationMessage(`Instance for '${entity.name}' copied to the clipboard`);
}
exports.copy = copy;
function longestinArray(array) {
    let longest = 0;
    for (let object of array) {
        if (object.name.text.length > longest) {
            longest = object.name.text.length;
        }
    }
    return longest;
}
function instanceTemplate(entity) {
    let text = `inst_${entity.name} : entity work.${entity.name}`;
    const indentString = '  ';
    if (entity.generics.length > 0) {
        text += `\ngeneric map (\n`;
        const longest = longestinArray(entity.generics);
        for (let generic of entity.generics) {
            const name = generic.name.text.padEnd(longest, ' ');
            text += `${indentString}${name} => ${generic.name},\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }
    if (entity.ports.length > 0) {
        text += `\nport map (\n`;
        const longest = longestinArray(entity.ports);
        for (let port of entity.ports) {
            const name = port.name.text.padEnd(longest, ' ');
            text += `${indentString}${name} => ${port.name},\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }
    text += `;\n`;
    return text;
}
function sysVerilogTemplate(entity) {
    let text = entity.name;
    const indentString = '  ';
    if (entity.generics.length > 0) {
        text += ` #(\n`;
        const longest = longestinArray(entity.generics);
        for (let generic of entity.generics) {
            const name = generic.name.text.padEnd(longest, ' ');
            text += `${indentString}.${name}(dut_${generic.name}),\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }
    if (entity.ports.length > 0) {
        text += ` i_dut (\n`;
        const longest = longestinArray(entity.ports);
        for (let port of entity.ports) {
            const name = port.name.text.padEnd(longest, ' ');
            text += `${indentString}.${name}(dut_s_${port.name}),\n`;
        }
        // Strip the final comma
        text = text.slice(0, -2);
        text += `\n)`;
    }
    text += `;\n`;
    return text;
}
function signalsTemplate(entity) {
    let text = '';
    if (entity.ports.length > 0) {
        const longest = longestinArray(entity.ports);
        for (let port of entity.ports) {
            const name = port.name.text.padEnd(longest, ' ');
            text += `signal ${port.text.substring(0,port.text.search("(\n|;|--)")).replace(/\b(in|out|inout|buffer)\b/,"")};\n`;
        }
    }
    return text;
}
//# sourceMappingURL=vhdl-entity-converter.js.map