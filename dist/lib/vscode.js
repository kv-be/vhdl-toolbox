"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
const vhdl_entity_converter_1 = require("./vhdl-entity-converter");
const vhdl_linter_1 = require("./vhdl-linter");
const project_parser_1 = require("./project-parser");
const vhdl_utils_1 = require("./vhdl-utils")
const hierarchyTree_1 = require("./hierarchy-tree")
var config_1 = require("./config");
const { match } = require("assert");
let client;



const basicInput_1 = require("./basicInput");
const { readSync } = require("fs");


function activate(context) {
    // The server is implemented in node
    let serverModule = require.resolve('./language-server');
    let HierarchyList = [{"name" : "Initializing", "file":"", "instance":""}]
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
        markdown: { isTrusted: true  },
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
        client.onNotification("custom/hierarchyUpdate", (files) => {
            hierarchyView.update(files)
        });
        //client.sendRequest("custom/data", "foo").then(data => console.log(data));

        //https://stackoverflow.com/questions/51806347/visual-studio-language-extension-how-do-i-call-my-own-functions
        // for custom function calls in the server from the client
        // CLIENT
        //client.onReady().then(() => {
        //    client.sendRequest("custom/data", "foo").then(data => console.log(data));
        //});
        //(in the onInitialized callback of server/src/server.ts)
        //  
        //connection.onRequest("custom/data", param => "received parameter '" + param + "'");
    });
    client.start();

    context.subscriptions.push(vscode_1.commands.registerCommand('HierarchyView.open', async (args) => {
        let uri = vscode_1.Uri.parse(args.file);
        let doc = vscode_1.workspace.openTextDocument(uri); // calls back into the provider
        vscode_1.window.showTextDocument(doc);
    }));

    context.subscriptions.push(vscode_1.commands.registerCommand('HierarchyView.getPath', async (args) => {
        vscode_1.env.clipboard.writeText(args.path);
        vscode_1.window.showInformationMessage(`Path copied to clipboard`);
    }));
    //context.subscriptions.push(vscode_1.commands.registerCommand('HierarchyView.whereUsedLocal', async (args) => {
    //    const used = hierarchyView.whereUsed(args, args.root)
    //    if (used.length > 0){
    //        const res = new vscode_1.MarkdownString(`${used.join("\n- ")}`, true);
    //        vscode_1.window.showInformationMessage(`${args.label} is used in`, {detail : "- "+used.join("\n- "), modal: true});    
    //    }
    //    else vscode_1.window.showInformationMessage(`${args.label} is not used in any component`);
    //}));
    //context.subscriptions.push(vscode_1.commands.registerCommand('HierarchyView.whereUsedGlobal', async (args) => {
    //    const used = hierarchyView.whereUsed(args, -1)
    //    if (used.length > 0){
    //        const res = new vscode_1.MarkdownString(`${used.join("\n- ")}`, true);
    //        vscode_1.window.showInformationMessage(`${args.label} is used in`, {detail : "- "+used.join("\n- "), modal: true});    
    //    }
    //    else vscode_1.window.showInformationMessage(`${args.label} is not used in any component`);
    //}));

    context.subscriptions.push(vscode_1.commands.registerCommand('VHDL-Toolbox:add-attribute', async (args) => {
        const text = basicInput_1.addDebug(args)
    }));

    context.subscriptions.push(vscode_1.commands.registerCommand('VHDL-Toolbox:add-signal', async (args) => {
        const text = basicInput_1.addsignal(args)

    }));
	context.subscriptions.push(vscode_1.commands.registerCommand('VHDL-Toolbox:allign_whatever', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
        const text = get_allignment_string()
 
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
    
	let hovering = vscode_1.languages.registerHoverProvider({ pattern: '**' }, {
        provideHover(document, position, token) {

			const range = document.getWordRangeAtPosition(position);
            
			let word = ""
			let char = document.getText()[document.offsetAt(position)]
			let index = 0
			while (char.search(/[0-9a-f_x"]+/i)>-1){
				word += char
				index +=1
				char = document.getText()[document.offsetAt(position)+index]
			};
			char = document.getText()[document.offsetAt(position)-1]
			index = -1
			while (char.search(/[0-9a-f_x"]+/i)>-1){
				word = char + word
				index -=1
				char = document.getText()[document.offsetAt(position)+index]

			};
			word =word.replace(/_/g, "")
			let hex = "" 
			let bin = ""
			let dec = 0
			if (word.toLowerCase().startsWith('b"') ||word.toLowerCase().startsWith('"') || word.toLowerCase().startsWith('0b')){
				// assume binary as "011010"
				word = word.replace(/"/g, "")
				word = word.toLowerCase().replace('0b', '')
				word = word.toLowerCase().replace('b', '')
				dec = parseInt(word, 2);
			} 
			else if (word.toLowerCase().startsWith('x"')|| word.toLowerCase().startsWith('0x')){
				// assume hex
				word = word.replace(/"/g, "")
				word = word.toLowerCase().replace('0x','')
				word = word.toLowerCase().replace('x', '')
				dec = parseInt(word, 16);
			} 
			else {// assume integer
				dec = parseInt(word, 10)
				if (isNaN(dec )) return
			}
			hex = dec.toString(16);
			bin = dec.toString(2);
            if ((bin === 'NaN') || (hex === 'NaN')) return
			let hhex = insert_separators(hex, "_", 4)
			let bbin = insert_separators(bin, "_", 4)
			let ddec = insert_separators(`${dec}`, " ", 3)
			let popup = ""

			hhex = hhex.replace(/^_/g, '')
			bbin = bbin.replace(/^_/g, '')
			ddec = ddec.replace(/^ /g, '')

			if ((dec < 128)&&(dec > 39)){
				popup = `dec  : ${ddec}\nhex  : ${hhex}\nbin  : ${bbin}\nchar : `+String.fromCharCode(dec)
			}
			else{
				popup = `dec : ${ddec}\nhex : ${hhex}\nbin : ${bbin}`
			}

                return new vscode_1.Hover({
                    language: "VHDL",
                    value: popup
                });
            //}
        }
    });	

    

    const hierarchyView = new hierarchyTree_1.HierarchyDataProvider(HierarchyList)
    vscode_1.window.registerTreeDataProvider('HierarchyView', hierarchyView);
	context.subscriptions.push(hovering);

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
    function insert_separators(string, separator, size){
        let hhex
        let bbin
        if (string.length > size){
            const start = string.length %size
            let i = 0
            hhex = string.substring(0, start)
            while(i <= string.length/size){
                hhex += (separator + string.substring(i*size+start, (i+1)*size+start))
                i+=1
            }
            hhex = hhex[hhex.length-1]===separator? hhex.substring(0, hhex.length-1) : hhex
        }
        else hhex = string
        return hhex
    }
    
    
    function allign_whatever(pattern, text){
        let max = 0
        let pos = 0
        if (pattern.startsWith('/')&&pattern.endsWith('/')){
            if (pattern.substring(1, pattern.length-1).indexOf("\\n")>0){
                vscode_1.window.showErrorMessage("new line characters not supported in regular expressions to align")
                return
            }
            if (pattern.substring(1, pattern.length-1).indexOf("\\n")===-1){
                pattern = new RegExp(pattern.substring(1, pattern.length-1))
            }
            else{
                pattern =pattern.substring(1, pattern.length-1)
            }
        }
        if (pattern === '\\n'){
            for (const l of text.split("\n")){
                pos = l.length
                if (max < pos) max = pos
                pattern = '\r'
            }	
        }else{
            for (const l of text.split("\n")){
                pos = l.search(pattern)
                if (max < pos) max = pos
            }	
        }
        let nt = ""
        for (const l of text.split("\n")){
            let start = l.search(pattern)
            if (start > 0){
                nt += (l.substring(0, start)+" ".repeat(max-start)+l.substring(start)+"\n")
            }
            else if (start === 0){
                nt += (" ".repeat(max-l.length)+l.substring(start)+"\n")
            }else{
                nt+=(l+"\n")
            }
        }
        return nt
    }
    
    async function get_allignment_string() {
        let type = await vscode_1.window.showInputBox({
            value: '=>',
            prompt: 'Give alignment string (can be reg ex)',   
        });
        if (!type) {
            return;
        }
        const editor = vscode_1.window.activeTextEditor;
    
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
    
            // Get the word within the selection
            let max = 0
            const word = document.getText(selection);
            const newtext = allign_whatever(type, word)
            editor.edit(editBuilder => {
                editBuilder.replace(selection, newtext)
            });
        }
    
    }
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