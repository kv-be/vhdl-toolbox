"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const vhdl_linter_1 = require("./vhdl-linter");
const project_parser_1 = require("./project-parser");
const objects_1 = require("./parser/objects");
const folding_1 = require("./languageFeatures/folding");
const documentSymbol_1 = require("./languageFeatures/documentSymbol");
const documentHightlightHandler_1 = require("./languageFeatures/documentHightlightHandler");
const findReferencesHandler_1 = require("./languageFeatures/findReferencesHandler");
const workspaceSymbols_1 = require("./languageFeatures/workspaceSymbols");
const completion_1 = require("./languageFeatures/completion");
const references_1 = require("./languageFeatures/references");
const codeLens_1 = require("./languageFeatures/codeLens");
const documentFormatting_1 = require("./languageFeatures/documentFormatting");
const executeCommand_1 = require("./languageFeatures/executeCommand");
const vscode_uri_1 = require("vscode-uri");
//const vscode_1 = require("vscode");

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
exports.connection = vscode_languageserver_1.createConnection(vscode_languageserver_1.ProposedFeatures.all);
// Create a simple text document manager. The text document manager
// supports full document sync only
exports.documents = new vscode_languageserver_1.TextDocuments();
let hasWorkspaceFolderCapability = false;
let hasConfigurationCapability = false;
let rootUri;

exports.connection.onInitialize((params) => {
    let capabilities = params.capabilities;
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
      );
    hasWorkspaceFolderCapability =
        capabilities.workspace && !!capabilities.workspace.workspaceFolders || false;
    if (params.rootUri) {
        rootUri = params.rootUri;
    }
    return {
        capabilities: {
            textDocumentSync: exports.documents.syncKind,
            codeActionProvider: true,
            // Tell the client that the server supports code completion
            completionProvider: {
                resolveProvider: false
            },
            documentSymbolProvider: true,
            definitionProvider: true,
            //hoverProvider: false,
            hoverProvider: true,
            documentFormattingProvider: true,
            referencesProvider: true,
            foldingRangeProvider: true,
            documentHighlightProvider: true,
            executeCommandProvider: { commands: ['VHDL-Toolbox:lsp-command'] },
            codeLensProvider: {
                resolveProvider: true
            },
            renameProvider: {
                prepareProvider: true
            },
            workspaceSymbolProvider: true
        }
    };
});
exports.initialization = new Promise(resolve => {
    exports.connection.onInitialized(async () => {
        exports.projectParser = null  
        const configSettings = await getCondigurationSettings()
        if (hasWorkspaceFolderCapability) {
            const parseWorkspaces = async () => {
                const workspaceFolders = await exports.connection.workspace.getWorkspaceFolders();
                const folders = (workspaceFolders !== null && workspaceFolders !== void 0 ? workspaceFolders : []).map(workspaceFolder => vscode_uri_1.URI.parse(workspaceFolder.uri).fsPath);
                exports.projectParser = new project_parser_1.ProjectParser(folders, configSettings);
                await exports.projectParser.init();
            };
            await parseWorkspaces();
            exports.connection.workspace.onDidChangeWorkspaceFolders(async (event) => {
                exports.projectParser.addFolders(event.added.map(folder => vscode_uri_1.URI.parse(folder.uri).fsPath));
                exports.connection.console.log('Workspace folder change event received.');
            });
        }
        else {
            const folders = [];
            if (rootUri) {
                folders.push(vscode_uri_1.URI.parse(rootUri).fsPath);
            }
            exports.projectParser = new project_parser_1.ProjectParser(folders, configSettings);
            await exports.projectParser.init();
        }
        exports.documents.all().forEach(validateTextDocument);
        exports.projectParser.events.on('change', (...args) => {
            // console.log('projectParser.events.change', new Date().getTime(), ... args);
            exports.documents.all().forEach(validateTextDocument);
        });
        exports.documents.onDidChangeContent(change => {
            // console.log('onDidChangeContent', new Date().getTime());
            validateTextDocument(change.document);
            //exports.documents.all().forEach(validateTextDocument);
        });
        /*exports.connection.onRequest("custom/data",  async (params) => {
            //console.log("received parameter '" + params + "'");
            params = JSON.parse(params)
            return findDefinitionExt(params)
        })*/
        resolve();
    });
});

exports.connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        if (exports.projectParser !== null){
            exports.projectParser.updateSettings(change.settings.VHDLToolbox)
        }
    } 
    exports.connection.sendNotification("custom/test", [change]);
    // Revalidate all open text documents
    exports.documents.all().forEach(validateTextDocument);
  });

async function getCondigurationSettings() {

    //let result = documentSettings.get(resource);
    //if (!result) {
    let result = await exports.connection.workspace.getConfiguration({
        section: 'VHDLToolbox'
      });
      if (!result){

      }
      //documentSettings.set(resource, result);
   // }
    return result;
  }

exports.documents.onDidClose(change => {
    exports.connection.sendDiagnostics({ uri: change.document.uri, diagnostics: [] });
});
// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
exports.linters = new Map();
exports.lintersValid = new Map();
async function validateTextDocument(textDocument) {
    const vhdlLinter = new vhdl_linter_1.VhdlLinter(vscode_uri_1.URI.parse(textDocument.uri).fsPath, textDocument.getText(), exports.projectParser);
    if (typeof vhdlLinter.tree !== 'undefined' || typeof exports.linters.get(textDocument.uri) === 'undefined') {
        exports.linters.set(textDocument.uri, vhdlLinter);
        exports.lintersValid.set(textDocument.uri, true);
        exports.projectParser.updateFile(vscode_uri_1.URI.parse(textDocument.uri).fsPath, textDocument.getText(), vhdlLinter)        
        exports.connection.sendNotification("custom/hierarchyUpdate", [exports.projectParser.getHierarchy()]);
        const errors = exports.projectParser.getMessages()
        for (const e of errors.filter(m => m)){
            exports.connection.sendDiagnostics({ uri:e.file.toString(), diagnostics : e.diagnostic});        
        }    
    }
    else {
        exports.lintersValid.set(textDocument.uri, false);
    }
    const diagnostics = vhdlLinter.checkAll();
    const test = JSON.stringify(diagnostics);
    exports.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}
exports.connection.onDidChangeWatchedFiles(_change => {
    // Monitored files have change in VS Code
    for (const c of _change.changes){
        if (c.type === 1){
            // add file
            exports.projectParser.addFile(vscode_uri_1.URI.parse(c.uri).fsPath)
        }else if (c.type ===2){
            // save file
        } else if (c.type === 3){
            // delete file
            exports.projectParser.deleteFile(vscode_uri_1.URI.parse(c.uri).fsPath)
        }
        exports.documents.all().forEach(validateTextDocument);
    }
});
exports.connection.onCodeAction(async (params) => {
    await exports.initialization;
    const linter = exports.linters.get(params.textDocument.uri);
    if (!linter) {
        return [];
    }
    // linter.codeActionEvent.emit()
    const actions = [];
    for (const diagnostic of params.context.diagnostics) {
        if (typeof diagnostic.code === 'number') {
            const callback = linter.diagnosticCodeActionRegistry[diagnostic.code];
            if (typeof callback === 'function') {
                actions.push(...callback(params.textDocument.uri));
            }
        }
    }
    return actions;
});
exports.connection.onDocumentSymbol(documentSymbol_1.handleOnDocumentSymbol);
const findDefinition = async (params) => {
    var _a, _b;
    await exports.initialization;
    const linter = exports.linters.get(params.textDocument.uri);
    if (!linter) {
        return null;
    }
    let startI = linter.getIFromPosition(params.position);
    const word = linter.getWordAtPosition(startI).match(/\w+/)
    const candidates = (_b = (_a = linter.tree) === null || _a === void 0 ? void 0 : _a.objectList.filter(object => object.range.start.i <= startI && startI <= object.range.end.i)) !== null && _b !== void 0 ? _b : [];
    candidates.sort((a, b) => (a.range.end.i - a.range.start.i) - (b.range.end.i - b.range.start.i));
    let candidate = candidates.find(m=> m.definition);
    if (!candidate) {
        return null;
    }

    if (candidate instanceof objects_1.OName) {
        candidate = candidate.parent;
    }
    let id = ""
    if (candidate.definition instanceof objects_1.OPort){
        if (candidate.definition.parent.generics){
            if (candidate.definition.parent.generics.filter(g=>g===candidate.definition).length > 0) id = "generic "    
        }
        if (candidate.definition.parent.ports){ 
            if (candidate.definition.parent.ports.filter(g=>g===candidate.definition).length > 0){
                if ((candidate.definition.parent instanceof objects_1.OEntity))  id = "port "    
                else id = "argument "
            }
        }
    }
    //else if (candidate.definition.parent.ports.filter(g=>g===candidate.definition)) id = "port "
    if (candidate instanceof objects_1.ODefitionable && candidate.definition) {
        return {
            // originSelectionRange: linter.getPositionFromILine(startI, startI + text.length),
            range: candidate.definition.range,
            text: id+candidate.definition.getRoot().originalText,
            // targetSelectionRange:  Range.create(Position.create(0, 0), Position.create(0, 0)),
            uri: vscode_uri_1.URI.file(candidate.definition.getRoot().file).toString(),
            id : id
        };
    }
    return null;
};


exports.connection.onHover(async (params, token) => {
    // TODO : check if not possible to treat in client => Markdown!
    await exports.initialization;

    if (token.isCancellationRequested) {
        console.log('hover canceld');
        throw vscode_languageserver_1.ErrorCodes.RequestCancelled;
    }
    const definition = await findDefinition(params);
    if (definition === null) {
        return null;
    }
    let lines = definition.text.split('\n').slice(definition.range.start.line, definition.range.end.line + 1);
    if (definition.range.start.line === definition.range.end.line) {
        if (!(definition.range.parent instanceof objects_1.OState)){
            lines[0] = lines[0].substring(definition.range.start.character, definition.range.end.character);
        } else {
            const s = definition.range.parent.parent.range.start.i
            const e = definition.range.parent.parent.range.end.i
            lines = definition.text.substring(s, e).split('\n')
        }
    }
    else {
        lines[0] = lines[0].substring(definition.range.start.character);
        lines[lines.length - 1] = lines[lines.length - 1].substring(0, definition.range.end.character);
    }


    
    return {
        contents: {
            language: 'vhdl',
            value: `${definition.id}${lines.join('\n')}`
        }
    };
});
exports.connection.onDefinition(findDefinition);
// This handler provides the initial list of the completion items.
exports.connection.onCompletion(completion_1.handleCompletion);
exports.connection.onReferences(references_1.handleReferences);
exports.connection.onPrepareRename(findReferencesHandler_1.prepareRenameHandler);
exports.connection.onRenameRequest(findReferencesHandler_1.renameHandler);
exports.connection.onDocumentFormatting(documentFormatting_1.handleDocumentFormatting);
exports.connection.onFoldingRanges(folding_1.foldingHandler);
exports.connection.onDocumentHighlight(documentHightlightHandler_1.documentHighlightHandler);
exports.connection.onCodeLens(codeLens_1.handleCodeLens);
exports.connection.onReferences(findReferencesHandler_1.findReferencesHandler);
exports.connection.onExecuteCommand(executeCommand_1.handleExecuteCommand);
exports.connection.onWorkspaceSymbol(workspaceSymbols_1.handleOnWorkspaceSymbol);
exports.connection.onRequest('vhdl-linter/listing', async (params, b) => {
    await exports.initialization;
    const textDocumentUri = params.textDocument.uri;
    const linter = exports.linters.get(textDocumentUri);
    if (typeof linter === 'undefined') {
        return;
    }
    const files = [];
    function parseTree(file) {
        var _a;
        if (files.findIndex(fileSearch => (fileSearch === null || fileSearch === void 0 ? void 0 : fileSearch.file) === (file === null || file === void 0 ? void 0 : file.file)) === -1) {
            // debugger;
            files.push(file);
        }
        for (const object of (_a = file === null || file === void 0 ? void 0 : file.objectList) !== null && _a !== void 0 ? _a : []) {
            if (object instanceof objects_1.OInstantiation) {
                if (object.definition) {
                    const vhdlLinter = new vhdl_linter_1.VhdlLinter(object.definition.parent.file, object.definition.parent.originalText, exports.projectParser);
                    vhdlLinter.checkAll();
                    parseTree(vhdlLinter.tree);
                }
                else {
                    // throw new Error(`Can not find ${object.componentName}`);q
                }
            }
        }
    }
    parseTree(linter.tree);
    return files.map(file => {
        if (file instanceof objects_1.OFileWithEntity) {
            return [file.file.replace((rootUri !== null && rootUri !== void 0 ? rootUri : '').replace('file://', ''), ''), file.entity.library];
        }
    }).filter(file => file).map(a => `${a[0]}\t${a[1]}`).join(`\n`);
});
exports.documents.listen(exports.connection);
// Listen on the connection
exports.connection.listen();
//# sourceMappingURL=language-server.js.map