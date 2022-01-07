"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const language_server_1 = require("../language-server");
const vscode_languageserver_1 = require("vscode-languageserver");
const objects_1 = require("../parser/objects");
async function foldingHandler(params) {
    var _a, _b, _c, _d;
    await language_server_1.initialization;
    const linter = language_server_1.linters.get(params.textDocument.uri);
    if (typeof linter === 'undefined' || typeof linter.tree === 'undefined') {
        return blockFolding((_b = (_a = language_server_1.documents.get(params.textDocument.uri)) === null || _a === void 0 ? void 0 : _a.getText()) !== null && _b !== void 0 ? _b : '');
    }
    const result = [];
    for (const obj of linter.tree.objectList) {
        if (obj instanceof objects_1.OProcess || obj instanceof objects_1.OIfClause || obj instanceof objects_1.OInstantiation || obj instanceof objects_1.OIfGenerateClause || obj instanceof objects_1.OForGenerate ||
            obj instanceof objects_1.OMap   ||obj instanceof objects_1.OProcedure || obj instanceof objects_1.OEntity || obj instanceof objects_1.OElseClause || obj instanceof objects_1.OCase ||
            obj instanceof objects_1.OWhenClause||obj instanceof objects_1.OForLoop  ||obj instanceof objects_1.OProtected||obj instanceof objects_1.ORecord) {
            result.push(vscode_languageserver_1.FoldingRange.create(obj.range.start.line, obj.range.end.line));
        }
        if (((obj instanceof objects_1.OFunction)) ||obj instanceof objects_1.OWhileLoop ){
            result.push(vscode_languageserver_1.FoldingRange.create(obj.range.start.line, obj.range.end.line));
        }
    }
    if ((linter.tree instanceof objects_1.OFileWithEntity)&&(linter.tree.entity)) {
        if (linter.tree.entity.portRange) {
            result.push(vscode_languageserver_1.FoldingRange.create(linter.tree.entity.portRange.start.line, linter.tree.entity.portRange.end.line));
        }
        if (linter.tree.entity.genericRange) {
            result.push(vscode_languageserver_1.FoldingRange.create(linter.tree.entity.genericRange.start.line, linter.tree.entity.genericRange.end.line));
        }
    }
    result.push(...blockFolding((_d = (_c = language_server_1.documents.get(params.textDocument.uri)) === null || _c === void 0 ? void 0 : _c.getText()) !== null && _d !== void 0 ? _d : ''));
    return result;
}
exports.foldingHandler = foldingHandler;
function blockFolding(text) {
    const result = [];
    const indent2divider = new Map();
    const indent2compactDivider = new Map();
    const foldBlock = [];
    const foldCompact = [];
    let indentBlockHeader = undefined;
    let lastIndentBlockHeader = 0;
    let indentCompactDivider = undefined;
    text.split('\n').forEach((line, index) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        const match = line.match(/^(\s*)(-*)(\s*[^-]*\s*)(-*)/);
        if (match) {
            const indent = (_b = (_a = match[1]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
            const isComment = ((_c = match[2]) === null || _c === void 0 ? void 0 : _c.length) >= 2;
            const isDivider = ((_d = match[2]) === null || _d === void 0 ? void 0 : _d.length) >= 4 && ((_e = match[3]) === null || _e === void 0 ? void 0 : _e.length) === 0 && ((_f = match[4]) === null || _f === void 0 ? void 0 : _f.length) === 0;
            const isCompact = ((_g = match[2]) === null || _g === void 0 ? void 0 : _g.length) >= 3 && ((_h = match[3]) === null || _h === void 0 ? void 0 : _h.length) !== 0 && ((_j = match[4]) === null || _j === void 0 ? void 0 : _j.length) >= 3;
            if (isDivider) {
                if (indentBlockHeader === indent) {
                    foldBlock.push([indent, index - 1]);
                    lastIndentBlockHeader = indentBlockHeader;
                    indentBlockHeader = undefined;
                }
                else {
                    const dividers = (_k = indent2divider.get(indent)) !== null && _k !== void 0 ? _k : [];
                    dividers.push(index);
                    indent2divider.set(indent, dividers);
                    for (let i = indent + 1; i <= lastIndentBlockHeader; i++) {
                        const dividers = (_l = indent2divider.get(i)) !== null && _l !== void 0 ? _l : [];
                        dividers.push(index);
                        indent2divider.set(i, dividers);
                    }
                    if (indentCompactDivider !== undefined) {
                        const compactDividers = (_m = indent2compactDivider.get(indentCompactDivider)) !== null && _m !== void 0 ? _m : [];
                        compactDividers.push(index);
                        indent2compactDivider.set(indentCompactDivider, compactDividers);
                    }
                    indentBlockHeader = indent;
                }
            }
            else if (isCompact) {
                foldCompact.push([indent, index]);
                const compactDividers = (_o = indent2compactDivider.get(indent)) !== null && _o !== void 0 ? _o : [];
                compactDividers.push(index);
                indent2compactDivider.set(indent, compactDividers);
                indentCompactDivider = indent;
            }
            else if (!isComment) {
                indentBlockHeader = undefined;
            }
        }
    });
    foldCompact.forEach((compact) => {
        var _a, _b;
        const [indent, index] = compact;
        let nextDivider = (_a = indent2compactDivider.get(indent)) === null || _a === void 0 ? void 0 : _a.shift();
        while (nextDivider !== undefined && nextDivider <= index) {
            nextDivider = (_b = indent2compactDivider.get(indent)) === null || _b === void 0 ? void 0 : _b.shift();
        }
        if (nextDivider !== undefined) {
            result.push(vscode_languageserver_1.FoldingRange.create(index, nextDivider - 1, undefined, undefined, 'comment'));
        }
    });
    foldBlock.forEach((block) => {
        const [indent, index] = block;
        const dividers = indent2divider.get(indent);
        let nextDivider = dividers === null || dividers === void 0 ? void 0 : dividers.shift();
        while (nextDivider !== undefined && nextDivider <= index) {
            nextDivider = dividers === null || dividers === void 0 ? void 0 : dividers.shift();
        }
        if (nextDivider !== undefined) {
            result.push(vscode_languageserver_1.FoldingRange.create(index, nextDivider - 1, undefined, undefined, 'comment'));
        }
    });
    return result;
}
//# sourceMappingURL=folding.js.map