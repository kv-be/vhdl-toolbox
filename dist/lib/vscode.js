"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
const vhdl_entity_converter_1 = require("./vhdl-entity-converter");
const vhdl_linter_1 = require("./vhdl-linter");
const project_parser_1 = require("./project-parser");
const vhdl_utils_1 = require("./vhdl-utils")
var config_1 = require("./config");
const { match } = require("assert");
let client;



const basicInput_1 = require("./basicInput");


function activate(context) {
    // The server is implemented in node
    let serverModule = require.resolve('./language-server');

    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
    let debugOptions = { execArgv: ['--nolazy', '--inspect=6011', '--enable-source-maps'] };
    //let debugOptions = { execArgv: ['--nolazy', '--inspect=6009', '--enable-source-maps'] };
    //let debugOptions = {};
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const t = config_1.getSettings(config_1.CONFIGURATION_TEST, false)
    let serverOptions = {
        run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: vscode_languageclient_1.TransportKind.ipc,
            options: debugOptions
        }
    };
    // Options to control the language client
    let clientOptions = {
        // Register the server for plain text documents
        documentSelector: [{ scheme: 'file', language: 'vhdl' }],
        synchronize: {
            // Notify the server about file changes to '.clientrc files contained in the workspace
            //fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.clientrc')
            configurationSection: 'VHDLToolbox',
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/*.vhd')
        }
    };
    // Create the language client and start the client.
    context.subscriptions.push(vscode_1.commands.registerCommand('VHDL-Toolbox:quick', async () => {
        const text = basicInput_1.showInputBox1()
    }));

    client = new vscode_languageclient_1.LanguageClient('VHDL-Toolbox', 'VHDL-Toolbox', serverOptions, clientOptions);
    // Start the client. This will also launch the server
    client.onReady().then(() => {
        client.onNotification("custom/test", (files) => {
            console.log("loading files " + files);
        });
    });
    client.start();

    context.subscriptions.push(vscode_1.commands.registerCommand('VHDL-Toolbox:add-attribute', async (args) => {
        const text = basicInput_1.addDebug(args)
    }));

    context.subscriptions.push(vscode_1.commands.registerCommand('VHDL-Toolbox:add-signal', async (args) => {
        const text = basicInput_1.addsignal(args)
        /*const editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        let signal = editor.document.getText(editor.selection);
        if (!signal){
            signal = args.signalName;
        } 
        let objType
        let pos = editor.selection.active
        pos = editor.document.offsetAt(pos)
        if (!signal){
            signal = args.signalName;
            pos = 0
        }        

        objType = vhdl_utils_1.getObjType(signal)
        
        let type = await vscode_1.window.showInputBox({
            prompt: 'Give type for ' + args.signalName,
        });
        if (!type) {
            return;
        }
        const edit = new vscode_1.WorkspaceEdit();
        const document = editor.document;
        let old_text = document.getText()
        let new_text = vhdl_utils_1.getDeclaration(old_text, type, signal, "", objType, pos)

        let fullRange = new vscode_1.Range(
            document.positionAt(0),
            document.positionAt(old_text.length)
        )

        edit.replace( editor.document.uri.path, fullRange, new_text);
        let success = await vscode_1.workspace.applyEdit(edit);*/
        
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('VHDL-Toolbox:declare-enum-type', async (args) => {

        const editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        let casestat = editor.document.getText(editor.selection);
        if (!casestat){
            vscode_1.window.showInformationMessage("Please first select the complete case statement to extract the type from.")
            return
        }        

        let [typedeclaration, signalName] = vhdl_utils_1.define_enum_from_case(casestat)
        const edit = new vscode_1.WorkspaceEdit();
        const document = editor.document;
        let old_text = document.getText()


        let new_text = vhdl_utils_1.findStartOfTypes(old_text, typedeclaration)
        new_text = vhdl_utils_1.getDeclaration(new_text, `t_${signalName}`, `${signalName}`,"","signal")

        let fullRange = new vscode_1.Range(
            document.positionAt(0),
            document.positionAt(old_text.length)
        )

        edit.replace( editor.document.uri.path, fullRange, new_text);
        let success = await vscode_1.workspace.applyEdit(edit);    
        
    }));

    context.subscriptions.push(vscode_1.commands.registerCommand('VHDL-Toolbox:copy-as-instance', () => vhdl_entity_converter_1.copy(vhdl_entity_converter_1.CopyTypes.Instance)));
    //context.subscriptions.push(vscode_1.commands.registerCommand('VHDL-Toolbox:copy-as-sysverilog', () => vhdl_entity_converter_1.copy(vhdl_entity_converter_1.CopyTypes.Sysverilog)));
    context.subscriptions.push(vscode_1.commands.registerCommand('VHDL-Toolbox:copy-as-signals', () => vhdl_entity_converter_1.copy(vhdl_entity_converter_1.CopyTypes.Signals)));
    context.subscriptions.push(vscode_1.commands.registerCommand('VHDL-Toolbox:copy-tree', () => {
        const editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const vhdlLinter = new vhdl_linter_1.VhdlLinter(editor.document.uri.path, editor.document.getText(), new project_parser_1.ProjectParser([]));
        if (vhdlLinter.tree) {
            vscode_1.env.clipboard.writeText(vhdlLinter.tree.getJSON());
            vscode_1.window.showInformationMessage(`VHDL file as JSON copied to clipboard`);
        }
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('VHDL-Toolbox:copy-file-listing', async () => {    
        
        
        const editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const new_name = await vscode_1.window.showInputBox({
            prompt: 'Give new name ' ,
        });
        const document = editor.document;
        
        let org_text = document.getText();
        const fullRange = new vscode_1.Range(
            document.positionAt(0),
            document.positionAt(org_text.length)
        )
        const edit = new vscode_1.WorkspaceEdit();
        const old_text = document.getText(editor.selection)
        org_text = org_text.replace(new RegExp(`\\b${old_text}\\b`,"gi"), new_name)
        edit.replace( editor.document.uri.path, fullRange, org_text);
        let success = await vscode_1.workspace.applyEdit(edit);

        /*editor.edit(editBuilder => {
            editor.selections.forEach(sel => {
                let org_text = document.getText();
                let changed_text = org_text + new_name;
                editBuilder.replace(document.getWordRangeAtPosition(0), changed_text);
            })
        }) // apply the (accumulated) replacement(s) (if multiple cursors/selections)
*/
        vscode_1.window.showInformationMessage(`copied`);


    }));
}
exports.activate = activate;
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
exports.deactivate = deactivate;
//# sourceMappingURL=vscode.js.map