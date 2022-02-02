"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.addsignal = exports.addDebug = exports.showQuickPick = void 0;

const vscode_1 = require("vscode");
const vhdl_utils_1 = require("./vhdl-utils")
/**
 * Shows a pick list using window.showQuickPick().
 */
async function showQuickPick() {
    let i = 0;
    const result = await vscode_1.window.showQuickPick(['eins', 'zwei', 'drei'], {
        placeHolder: 'eins, zwei or drei',
        onDidSelectItem: item => vscode_1.window.showInformationMessage(`Focus ${++i}: ${item}`)
    });
    vscode_1.window.showInformationMessage(`Got: ${result}`);
}
exports.showQuickPick = showQuickPick;
/**
 * Shows an input box using window.showInputBox().
 */

 async function addDebug(args) {
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

    let declaration = `attribute mark_debug of ${signal} : signal is "TRUE";`
    
    const edit = new vscode_1.WorkspaceEdit();
    const document = editor.document;
    let old_text = document.getText()
    let before 
    let space_before 
    let space_after 
    let after
    let noSpace 

    if (old_text.search(new RegExp(`\\n\\s*attribute\\s+mark_debug\\s+of\\s+${signal}\\s*:\\s*signal\\s+is\\s+"true"\\s*;`, "i"))>-1){
        vscode_1.window.showInformationMessage(`A mark_debug attribute for signal ${signal} already exists. Nothing added.`)
        return
    }


    [before, noSpace, after] = vhdl_utils_1.findStartOfAttributes(old_text)
    space_before = " ".repeat(noSpace)
    space_after = " ".repeat(noSpace)    

    declaration = `${space_before}${declaration}\n${space_after}`
    let new_text = before + declaration + after;


    let fullRange = new vscode_1.Range(
        document.positionAt(0),
        document.positionAt(old_text.length)
    )
    editor.edit(editBuilder => {
        editBuilder.replace(fullRange, new_text);
    })

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

    let declaration = `attribute keep of ${signal} : signal is "TRUE";`
    
    const edit = new vscode_1.WorkspaceEdit();
    const document = editor.document;
    let old_text = document.getText()
    let before 
    let space_before 
    let space_after 
    let after
    let noSpace 

    if (old_text.search(new RegExp(`\\n\\s*attribute\\s+keep\\s+of\\s+${signal}\\s*:\\s*signal\\s+is\\s+"true"\\s*;`, "i"))>-1){
        vscode_1.window.showInformationMessage(`A keep attribute for signal ${signal} already exists. Nothing added.`)
        return
    }


    [before, noSpace, after] = vhdl_utils_1.findStartOfAttributes(old_text)
    space_before = " ".repeat(noSpace)
    space_after = " ".repeat(noSpace)    

    declaration = `${space_before}${declaration}\n${space_after}`
    let new_text = before + declaration + after;


    let fullRange = new vscode_1.Range(
        document.positionAt(0),
        document.positionAt(old_text.length)
    )
    editor.edit(editBuilder => {
        editBuilder.replace(fullRange, new_text);
    })

}
exports.addKeep = addKeep;

async function addsignal(args) {
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
    pos = editor.document.offsetAt(pos)
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

    const edit = new vscode_1.WorkspaceEdit();
    const document = editor.document;
    let old_text = document.getText()
    let new_text = vhdl_utils_1.getDeclaration(old_text, type, signal, "", objType, pos)

    let fullRange = new vscode_1.Range(
        document.positionAt(0),
        document.positionAt(old_text.length)
    )
    editor.edit(editBuilder => {
        editBuilder.replace(fullRange, new_text);
    })

}
exports.addsignal = addsignal;
//# sourceMappingURL=basicInput.js.map

