"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const vscode_uri_1 = require("vscode-uri");
const language_server_1 = require("../language-server");
const objects_1 = require("../parser/objects");
async function handleOnWorkspaceSymbol(params) {
    var _a, _b, _c, _d, _e, _f;
    const symbols = [];
    for (const cachedFile of language_server_1.projectParser.cachedFiles) {
        for (const object of (_b = (_a = cachedFile.linter.tree) === null || _a === void 0 ? void 0 : _a.objectList) !== null && _b !== void 0 ? _b : []) {
            if (object instanceof objects_1.OInstantiation) {
                symbols.push(vscode_languageserver_1.SymbolInformation.create(object.label + ': ' + object.componentName, vscode_languageserver_1.SymbolKind.Object, object.range, vscode_uri_1.URI.file(cachedFile.path).toString()));
            }
            if (object instanceof objects_1.OProcess) {
                symbols.push(vscode_languageserver_1.SymbolInformation.create((_c = object.label) !== null && _c !== void 0 ? _c : '', vscode_languageserver_1.SymbolKind.Object, object.range, vscode_uri_1.URI.file(cachedFile.path).toString()));
            }
            if (object instanceof objects_1.OFunction) {
                symbols.push(vscode_languageserver_1.SymbolInformation.create((_d = object.name.text) !== null && _d !== void 0 ? _d : '', vscode_languageserver_1.SymbolKind.Object, object.range, vscode_uri_1.URI.file(cachedFile.path).toString()));
            }
            if (object instanceof objects_1.OPackage) {
                symbols.push(vscode_languageserver_1.SymbolInformation.create((_e = object.name) !== null && _e !== void 0 ? _e : '', vscode_languageserver_1.SymbolKind.Object, object.range, vscode_uri_1.URI.file(cachedFile.path).toString()));
            }
            if (object instanceof objects_1.OEntity) {
                symbols.push(vscode_languageserver_1.SymbolInformation.create((_f = object.name) !== null && _f !== void 0 ? _f : '', vscode_languageserver_1.SymbolKind.Object, object.range, vscode_uri_1.URI.file(cachedFile.path).toString()));
            }
        }
    }
    const symbolsFiltered = symbols.filter(symbol => symbol.name.toLowerCase().indexOf(params.query.toLowerCase()) > -1);
    return symbolsFiltered;
}
exports.handleOnWorkspaceSymbol = handleOnWorkspaceSymbol;
//# sourceMappingURL=workspaceSymbols.js.map