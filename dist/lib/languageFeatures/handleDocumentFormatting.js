"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const util_1 = require("util");
const vscode_languageserver_1 = require("vscode-languageserver");
const language_server_1 = require("../language-server");
async function handleDocumentFormatting(params) {
    const document = language_server_1.documents.get(params.textDocument.uri);
    if (typeof document === 'undefined') {
        return null;
    }
    const text = document.getText();
    const path = await fs_1.promises.mkdtemp(os_1.tmpdir() + path_1.sep);
    const tmpFile = path + path_1.sep + 'beautify';
    await fs_1.promises.writeFile(tmpFile, text);
    const emacs_script_path = __dirname + '/../../emacs-vhdl-formating-script.lisp';
    await util_1.promisify(child_process_1.exec)(`emacs --batch -l ${emacs_script_path} -f vhdl-batch-indent-region ${tmpFile}`);
    return [{
            range: vscode_languageserver_1.Range.create(document.positionAt(0), document.positionAt(text.length)),
            newText: await fs_1.promises.readFile(tmpFile, { encoding: 'utf8' })
        }];
}
exports.handleDocumentFormatting = handleDocumentFormatting;
//# sourceMappingURL=handleDocumentFormatting.js.map