"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.addsignal = exports.addDebug = exports.showQuickPick = void 0;

const { JSON_CONFIG_FILENAME } = require("tslint/lib/configuration");
const vscode_1 = require("vscode");
const vhdl_utils_1 = require("./vhdl-utils")
/**
 * Shows a pick list using window.showQuickPick().
 */

 function enterText(text, indent) {
    const editor = vscode_1.window.activeTextEditor;
    let new_text = text.split('\n')[0]+"\n"
    for (const t of text.split('\n').slice(1)){
        new_text += (indent+t+'\n')
    }
    if (editor) {
        editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, new_text);
        });
    }
}

async function showQuickPick(list, client) {
    let i = 0;
    list = JSON.parse(list)
    const result = await vscode_1.window.showQuickPick(list, {
        //placeHolder: 'eins, zwei or drei',
        //onDidSelectItem: item => vscode_1.window.showInformationMessage(`Focus ${++i}: ${item}`)
    });
    const editor = vscode_1.window.activeTextEditor;
    let indent
    if (editor.document.lineAt(editor.selection.active.line).text.trim().length === 0){
        indent = " ".repeat(editor.selection.active.character)
    }
    else{
        indent = editor.document.lineAt(editor.selection.active.line).text.match(/^\s*/)[0]
    }
    client.sendRequest("custom/getEntity", JSON.stringify({signal:result,instance:true})).then(data => enterText(data, indent));
    /*const editor = vscode_1.window.activeTextEditor;
    if (editor) {
        editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, result);
        });
    }*/
}
exports.showQuickPick = showQuickPick;
/**
 * Shows an input box using window.showInputBox().
 */
 async function addInstance(args) {
    const editor = vscode_1.window.activeTextEditor;
    if (!editor) {
        return;
    }
    let signal = editor.document.getText(editor.selection);
    let objType
    let pos = editor.selection.active
    pos = editor.document.offsetAt(pos)
    if (!signal){
        if (args){
            signal = args.signalName;
            pos = 0    
        }
        if (!signal){
            signal = editor.document.getText(editor.document.getWordRangeAtPosition(editor.selection.active));
            pos = editor.selection.active
        }
    } 


 }



 async function addDebug(args) {
    const editor = vscode_1.window.activeTextEditor;
    if (!editor) {
        return;
    }
    //let a = await vscode_1.env.clipboard.readText()
    let signal = editor.document.getText(editor.selection);
    let objType
    let pos = editor.selection.active
    pos = editor.document.offsetAt(pos)
    if (!signal){
        if (args){
            signal = args.signalName;
            pos = 0    
        }
        if (!signal){
            signal = editor.document.getText(editor.document.getWordRangeAtPosition(editor.selection.active));
            pos = editor.selection.active
        }
    } 

    
    const edit = new vscode_1.WorkspaceEdit();
    const document = editor.document;
    let old_text = document.getText()
    let new_text = addAttribute("mark_debug", signal, old_text)

    let fullRange = new vscode_1.Range(
        document.positionAt(0),
        document.positionAt(old_text.length)
    )
    editor.edit(editBuilder => {
        editBuilder.replace(fullRange, new_text);
    })

    /*await vscode_1.commands.executeCommand("cursorMove",
                {
                    to: "down", by:'line', value:noLines
                })
    */
}
exports.addDebug = addDebug;

async function addKeep(args) {
    const editor = vscode_1.window.activeTextEditor;
    if (!editor) {
        return;
    }
    let signal = editor.document.getText(editor.selection);
    let objType
    let pos = editor.selection.active
    pos = editor.document.offsetAt(pos)
    if (!signal){
        if (args){
            signal = args.signalName;
            pos = 0    
        }
        if (!signal){
            signal = editor.document.getText(editor.document.getWordRangeAtPosition(editor.selection.active));
            pos = editor.selection.active
        }
    } 

    
    const edit = new vscode_1.WorkspaceEdit();
    const document = editor.document;
    let old_text = document.getText()
    let noLines = old_text.split("\n").length
    let new_text = addAttribute("keep", signal, old_text)
    noLines = new_text.split("\n").length - noLines

    let fullRange = new vscode_1.Range(
        document.positionAt(0),
        document.positionAt(old_text.length)
    )
    editor.edit(editBuilder => {
        editBuilder.replace(fullRange, new_text);
    })

    /*await vscode_1.commands.executeCommand("cursorMove",
                {
                    to: "down", by:'wrappedLine', value:noLines
                })
    */
}
exports.addKeep = addKeep;


function addAttribute(attribute, signal, old_text) {


    let declaration = `attribute ${attribute} of ${signal} : signal is "TRUE";`

    let before 
    let space_before 
    let space_after 
    let after
    let noSpace 

    if (old_text.search(new RegExp(`\\n\\s*attribute\\s+${attribute}\\s+of\\s+${signal}\\s*:\\s*signal\\s+is\\s+"true"\\s*;`, "i"))>-1){
        vscode_1.window.showInformationMessage(`A ${attribute} attribute for signal ${signal} already exists. Nothing added.`)
        return old_text
    }


    [before, noSpace, after] = vhdl_utils_1.findStartOfAttributes(old_text, attribute)
    space_before = " ".repeat(noSpace)
    space_after = "" //" ".repeat(noSpace)    

    declaration = `${space_before}${declaration}\n${space_after}`
    let new_text = before + declaration + after;

    return new_text

}


async function addsignal(args, client) {
    let type = await vscode_1.window.showInputBox({
        value: 'sl',
        prompt: 'Give type for signal',
        //valueSelection: [2, 4],
        placeHolder: 'For example: fedcba. But not: 123',
        //validateInput: text => {
        //    vscode_1.window.showInformationMessage(`Validating: ${text}`);
        //    return  text;//vhdl_utils_1.expandType(text);
        //}


    });
    if (!type) {
        return;
    }


    const editor = vscode_1.window.activeTextEditor;
    if (!editor) {
        return;
    }
    let signal = editor.document.getText(editor.selection);
    let objType
    let pos = editor.selection.active
    if (!signal){
        if (args){
            signal = args.signalName;
            //pos = 0    
        }
        if (!signal){
            signal = editor.document.getText(editor.document.getWordRangeAtPosition(editor.selection.active));
            pos = editor.selection.active
        }
    } 

    pos = editor.document.offsetAt(pos)

    objType = vhdl_utils_1.getObjType(signal)
    if (objType === null){
        const t = type.match(/\s+as\s+(signal|var|port|generic|const)/)
        if (t){
            objType = t[1]
            type = type.substring(0, type.search(/\s+as\s+(signal|var|port|generic|const)/))
        }else{
            vscode_1.window.showInformationMessage(`Could not determine object type of ${signal} add as [signal, var, port or generic] to the type definition to solve this`);
            return    
        }
    }
    type = vhdl_utils_1.expandType(type)

    const path = vscode_1.window.activeTextEditor.document.uri.fsPath
    const isVar = (objType ==="var")
    if (objType ==="var"){
        client.sendRequest("custom/getScopeRange", JSON.stringify({pos, signal, path, isVar}) ).then(posi => declare_signal(type, signal, objType, JSON.parse(posi)));
    }
    else{
        let posi = JSON.parse(`{"start":${pos}, "end":${pos}, "text":""}`) 
        declare_signal(type, signal, objType, posi);
    }

}
exports.addsignal = addsignal;
//# sourceMappingURL=basicInput.js.map

function declare_signal(type, signal, objType, posi){
    const editor = vscode_1.window.activeTextEditor;
    if (!editor) {
        return;
    }
    if ((posi.start ===0) && (posi.end === 0) && (posi.text === "")){
        vscode_1.window.showWarningMessage(`Automatic declaration failed. Probably you used a ${objType} at an illegal place in the code (e.g. a variable assignment in an architecture). \n\nPleae note that the ${objType} is derived from the object name ${signal}`)
    }
    const document = editor.document;
    let old_text = document.getText()
    let new_text = vhdl_utils_1.getDeclaration(old_text, type, signal, "", objType, posi)

    let fullRange = new vscode_1.Range(
        document.positionAt(0),
        document.positionAt(old_text.length)
    )
    editor.edit(editBuilder => {
        editBuilder.replace(fullRange, new_text);
    })    
}    
