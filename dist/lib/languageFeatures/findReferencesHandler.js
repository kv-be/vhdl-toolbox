"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const language_server_1 = require("../language-server");
const objects_1 = require("../parser/objects");
async function findReferences(params) {
    var _a;
    await language_server_1.initialization;
    const linter = language_server_1.linters.get(params.textDocument.uri);
    if (typeof linter === 'undefined') {
        return [];
    }
    if (typeof linter.tree === 'undefined') {
        return [];
    }
    let startI = linter.getIFromPosition(params.position);
    const candidates = linter.tree.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i);
    candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
    let candidate = candidates[0];
    if (!candidate) {
        return [];
    }
    if (candidate instanceof objects_1.OName && candidate.parent instanceof objects_1.ObjectBase) {
        candidate = candidate.parent;
    }
    // debugger;
    if (candidate instanceof objects_1.OToken && candidate.definition) {
        candidate = candidate.definition;
    }
    if (candidate instanceof objects_1.OMentionable) {
        return [candidate].concat((_a = candidate.mentions) !== null && _a !== void 0 ? _a : []);
    }
    return [];
}
exports.findReferences = findReferences;
async function findReferencesHandler(params) {
    return (await findReferences(params)).map(object => vscode_languageserver_1.Location.create(params.textDocument.uri, object.range));
}
exports.findReferencesHandler = findReferencesHandler;
async function prepareRenameHandler(params) {
    await language_server_1.initialization;
    const linter = language_server_1.linters.get(params.textDocument.uri);
    if (language_server_1.lintersValid.get(params.textDocument.uri) !== true) {
        throw new vscode_languageserver_1.ResponseError(vscode_languageserver_1.ErrorCodes.InvalidRequest, 'Document not valid. Renaming only supported for parsable documents.', 'Document not valid. Renaming only supported for parsable documents.');
    }
    if (typeof linter === 'undefined') {
        throw new vscode_languageserver_1.ResponseError(vscode_languageserver_1.ErrorCodes.InvalidRequest, 'Parser not ready', 'Parser not ready');
    }
    if (typeof linter.tree === 'undefined') {
        throw new vscode_languageserver_1.ResponseError(vscode_languageserver_1.ErrorCodes.InvalidRequest, 'Parser not ready', 'Parser not ready');
    }
    let startI = linter.getIFromPosition(params.position);
    const candidates = linter.tree.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i);
    candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
    const candidate = candidates[0];
    if (!candidate) {
        throw new vscode_languageserver_1.ResponseError(vscode_languageserver_1.ErrorCodes.InvalidRequest, 'Can not rename this element', 'Can not rename this element');
    }
    return candidate.range;
}
exports.prepareRenameHandler = prepareRenameHandler;
async function renameHandler(params) {
    const references = (await findReferences(params)).map(reference => {
        if (reference instanceof objects_1.OMentionable) {
            return reference.name;
        }
        return reference;
    });
    //console.log(references.map(reference => `${reference.range.start.line} ${reference.range.start.character}`));
    return {
        changes: {
            [params.textDocument.uri]: references.map(reference => vscode_languageserver_1.TextEdit.replace(reference.range, params.newName))
        }
    };
}
exports.renameHandler = renameHandler;
//# sourceMappingURL=findReferencesHandler.js.map