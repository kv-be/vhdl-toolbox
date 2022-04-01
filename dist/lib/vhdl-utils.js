"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");

function findProcess(text, start){
    let proc_pos = 0
    let st_end = 0
    let st_start = 0
    let i = 0
    let fragment
    let proc_pat
    let cont = 1
    while ((cont > 0) && (i < 50)){
        i = i+1
        fragment = text.substring(proc_pos,start)
        proc_pat = [...fragment.matchAll(/\n(\s*[^-]*:*process\s*\(*[A-Za-z0-9_:, \-\t\r*\n]*\)*.*\r*\n)\s*(begin|variable|function|procedure)+.*\r*\n/gi)]

        if (proc_pat.length > 0){
            proc_pos = st_end + proc_pat[0].index + proc_pat[0][1].length + 1
            st_start = proc_pos  - proc_pat[0][1].length
            st_end = proc_pos  
        }
        cont = proc_pat.length
    }
    return [st_start, st_end]
}
exports.findProcess = findProcess;

function findFunction(text, start){
    let proc_pos = 0
    let func_offset_end = 0
    let func_offset_start = 0
    let i = 0
    let fragment
    let proc_pat
    let cont = 1
    while ((cont > 0) && (i < 50)){
        i = i+1
        fragment = text.substring(proc_pos,start)
        proc_pat = [...fragment.matchAll(/\n(\s*function\s+\w+\s*\(*[A-Za-z0-9_:, \-\t\r\n]*?\)\s+return\s+.*?\s+is\s*\r*\n)\s*(begin|variable|function|procedure)+.*\r*\n/gi)]

        if (proc_pat.length > 0){
            proc_pos = func_offset_end + proc_pat[0].index + proc_pat[0][1].length + 1
            func_offset_start = proc_pos  - proc_pat[0][1].length
            func_offset_end = proc_pos  
        }
        cont = proc_pat.length
    }
    return [func_offset_start, func_offset_end]
}
exports.findFunction = findFunction;

function findProcedure(text, start){
    let proc_pos = 0
    let prod_offset_end = 0
    let prod_offset_start = 0
    let i = 0
    let fragment
    let proc_pat
    let cont = 1
    while ((cont > 0) && (i < 50)){
        i = i+1
        fragment = text.substring(proc_pos,start)
        proc_pat = [...fragment.matchAll(/\n(\s*procedure\s+\w+\s*\(*[A-Za-z0-9_:, \-\t\r\n]*?\)\s+is\s*\r*\n)\s*(begin|variable|function|procedure)+.*\r*\n/gi)]
        if (proc_pat.length > 0){
            proc_pos = prod_offset_end + proc_pat[0].index + proc_pat[0][1].length + 1
            prod_offset_start = proc_pos  - proc_pat[0][1].length
            prod_offset_end = proc_pos  
        }
        cont = proc_pat.length
    }
    return [prod_offset_start, prod_offset_end]
}
exports.findProcedure = findProcedure;

function findStartOfPorts(text, pos){
    let proc_pos = 0
    let st_end = 0
    let st_start = 0
    let fragment
    let proc_pat
    fragment = text.substring(proc_pos)
    // first look for the entity to be sure we don't end somewhere else
    proc_pat = [...fragment.matchAll(/\n\s*entity\s+[A-Za-z_0-9]+.*?\s+is\r*\n/g)]
    if (proc_pat.length>0){
        proc_pos = proc_pat[0].index
    }    
    fragment = text.substring(proc_pos)
    proc_pat = [...fragment.matchAll(/\r*\n(\s*port\s*\r*\n*\(.*\r*\n)/g)]

    if (proc_pat.length>0){
        st_end = proc_pos + proc_pat[0].index + proc_pat[0][1].length+1
        st_start = proc_pos + proc_pat[0].index+1 // get rid of the \n
    }
    const before = text.substring(0, st_end)
    const spaces = text.substring(st_start, st_end).replace(/\n/, "").search(/\S/)
    const after = text.substring(st_end)
    return [before,spaces, after]
}
exports.findStartOfPorts=findStartOfPorts

function findStartOfGenerics(text){
    let proc_pos = 0
    let st_end = 0
    let st_start = 0
    let fragment
    let proc_pat
    let add_generics_section = false
    fragment = text.substring(proc_pos)
    // first look for the entity to be sure we don't end somewhere else
    proc_pat = [...fragment.matchAll(/\r*\n(\s*entity\s+[A-Za-z_0-9]+.*?\r*\n)/g)]
    if (proc_pat.length>0){
        st_end = proc_pos + proc_pat[0].index + proc_pat[0][1].length+1
        st_start = proc_pos + proc_pat[0].index+1 // get rid of the \n
        proc_pos = proc_pat[0].index
    }    
    fragment = text.substring(proc_pos)
    proc_pat = [...fragment.matchAll(/\r*\n(\s*generic\s*\r*\n*\(.*\r*\n)/g)]

    if (proc_pat.length>0){
        st_end = proc_pos + proc_pat[0].index + proc_pat[0][1].length+1
        st_start = proc_pos + proc_pat[0].index+1 // get rid of the \n
    }
    else  add_generics_section = true

    const before = text.substring(0, st_end)
    const spaces = text.substring(st_start, st_end).replace(/\n/,"").search(/\S/)
    const after = text.substring(st_end)
    return [before,spaces, after, add_generics_section]
}
exports.findStartOfGenerics=findStartOfGenerics

function findStartOfTypes(old_text,type_definition){

    let no_signal = true
    let only_arch = false
    let match = [...old_text.matchAll(/([\s\S\r*\n]+)(\r*\n\s*)(-{2,}\s*type\s+-{2,}\r*\n\s*-{2,}[ \t]*\r*\n)([\s\S\r*\n]+)/gi)]
    
    if (match.length === 0){
        // type declaration exists already
        match = [...old_text.matchAll(/([\s\S\r\n]+?\r*\n\s*architecture [\s\S\n]+?\r*\n)(\s*)(type\s+[\s\S]+?\r*\n)([\s\S\r\n]+)/gi)];
        if (match.length === 0){
            no_signal = false
            // search beginning of signals
            match = [...old_text.matchAll(/([\s\S\n\r]+?\r*\n\s*architecture [\s\S\r\n]+?\r*\n)(\s*)(signal\s+[\s\S\r\n]+)/gi)];
            if (match.length === 0){
                no_signal = true
                // check if constants exist
                match = [...old_text.matchAll(/([\s\S\n\r]+?\r*\n\s*architecture [\s\S\r\n]+?\r*\n)(\s*)(constant\s+[\s\S]+?\r*\n)([\s\S\r\n]+)/gi)];
                //check if components exist
                if (match.length === 0) match = [...old_text.matchAll(/([\s\S\r\n]+?\r*\n\s*architecture [\s\S\r\n]+?\r*\n)(\s*)(end\s+component[\s\S]+?\r*\n)([\s\S\r\n]+)/gi)];
                if (match.length === 0){
                    // locate architecture itself
                    match = [...old_text.matchAll(/([\s\S\n\r]+?\r*\n\s*architecture [\s\S\r\n]+?\r*\n)([\s\S\r\n]+)/gi)];
                    only_arch = true
                } 
            } 
        } 
    } 
    let before 
    let space 
    let after 
    if (no_signal === false){
        if (match[0].length != 4) {
            return
        }
        before = match[0][1]
        space = match[0][2].replace(/\n/, '')
        after = match[0][3]    
    }
    else if (only_arch === false) {
        if (match[0].length != 5) {
            return
        }
        before = match[0][1]+match[0][2]+match[0][3]
        space = match[0][2].replace(/\n/, '')
        after = match[0][4]    
    }
    else{
        if (match[0].length != 3) {
            return
        }
        before = match[0][1]
        space = "   "
        after = match[0][2]    
    }
    let declaration = `${space}${type_definition}\n`
    let new_text = before + declaration + after;
    return new_text;
}
exports.findStartOfTypes=findStartOfTypes

function findStartOfVariables(text, start){
    const pstart = new vscode_1.Position(start+1, 0)    
    const pend = new vscode_1.Position(start+2, 0)    
    let editor = vscode_1.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const posi = editor.document.offsetAt(pstart)
    const before = text.substring(0, editor.document.offsetAt(pstart)) //process => process
    const after = text.substring(editor.document.offsetAt(pstart)) //process => starting from begin
    const spaces = editor.document.lineAt(start).text.replace(/\n/,"").search(/\S/)
    return [before,spaces, after]
}
exports.findStartOfVariables=findStartOfVariables

function findStartOfSignals(old_text ){
    let no_signal = false
    let only_arch = false
    let match = [...old_text.matchAll(/([\s\S\r\n]+?\r*\n\s*architecture [\s\S\r\n]+?\r*\n)(\s*)(signal\s+[\s\S\r\n]+)/gi)];
    //console.log("match = "+match)
    if (match.length === 0){
        no_signal = true
        // first check for the default template header
        match = [...old_text.matchAll(/([\s\S\r\n]+)(\r*\n\s*)(-{2,}\s*signal\s+-{2,}\r*\n\s*-{2,}[ \t]*\r*\n)([\s\S\r\n]+)/gi)]
        // if not present, check if types are defined
        if (match.length === 0) match = [...old_text.matchAll(/([\s\S\r\n]+?\r*\n\s*architecture [\s\S\n\r]+?\r*\n)(\s*)(type\s+[\s\S]+?\r*\n)([\s\S\r\n]+)/gi)];
        // if no types, check if constants are defined
        if (match.length === 0) match = [...old_text.matchAll(/([\s\S\r\n]+?\r*\n\s*architecture [\s\S\n\r]+?\r*\n)(\s*)(constant\s+[\s\S]+?\r*\n)([\s\S\r\n]+)/gi)];
        // if no constants, check if components are defined        
        if (match.length === 0) match = [...old_text.matchAll(/([\s\S\r\n]+?\r*\n\s*architecture [\s\S\n\r]+?\r*\n)(\s*)(end\s+component[\s\S]+?\r*\n)([\s\S\r\n]+)/gi)];
        // if none of the above, check if the architecture is defined
        if (match.length === 0){
            match = [...old_text.matchAll(/([\s\S\n\r]+?\r*\n\s*architecture [\s\S\n\r]+?\r*\n)([\s\S\n\r]+)/gi)];
            only_arch = true
        }

    } 
    let before 
    let space 
    let after 
    if (no_signal === false){
        if (match[0].length != 4) {
            return
        }
        before = match[0][1]
        space = match[0][2].replace(/\n/, '')
        after = match[0][3]    
    }
    else if (only_arch === false) {
        if (match[0].length != 5) {
            return
        }
        before = match[0][1]+match[0][2]+match[0][3]
        space = match[0][2].replace(/\n/, '')
        after = match[0][4]    
    }
    else{
        if (match[0].length != 3) {
            return
        }
        before = match[0][1]
        space = "   "
        after = match[0][2]    
    }
    return [before, space.length,after]
}
exports.findStartOfSignals=findStartOfSignals

function findStartOfAttributes(old_text , attribute = "mark_debug"){
    let no_signal = false
    let add_attribute_declaration = false
    // check first if attribute mark_debug                   : string; is in text
    
    let match = [...old_text.matchAll(new RegExp(`([\\s\\S\\n]+)(\\r*\\n\\s*)(attribute\\s+${attribute}\\s+:\\s*string\\s*;.*\\r*\\n)([\\s\\S\\n]+)`,"gi"))];
    //console.log("match = "+match)
    if (match.length === 0){//\s*--{2,}\s*CONSTANT\s+-{2,}\n\s*--{2,}\s*$
        match = [...old_text.matchAll(/([\s\S\n\r]+)(\r*\n\s*)(-{2,}[ \t]*attributes*.*?\r*\n)([\s\S\n\r]+)/gi)];
        //match = [...old_text.matchAll(/([\s\S\r\n]+)(\r*\n\s*)(-{2,}\s*attributes*\s+-{2,}\r*\n\s*-{2,}[ \t]*\r*\n)([\s\S\r\n]+)/gi)]
        add_attribute_declaration = true
        if (match.length ===0){
            vscode_1.window.showErrorMessage(`Could not find start of the attributes section. \n\nMark it with a '-- attribute' comment or add manually one mark_debug attribute`);
            return    
        }
    } 
    let before 
    let space 
    let after 
    if (no_signal === false){
        if (match[0].length !== 5) {
            return
        }
        if (match[0][4].split('\n')[0].trim().startsWith("--")){
            after = match[0][4].split('\n').slice(1).join("\n")    
            before = match[0][1]+match[0][2]+match[0][3]+match[0][4].split('\n')[0]+"\n"
        } 
        else {
            //case where there is no "-----------" directly under the -- attribute
            before = match[0][1]+match[0][2]+match[0][3]
            after = match[0][4]   
        }
        let spaces = match[0][2].replace(/\r*\n/, '')
        if (add_attribute_declaration){
            before += (spaces+`attribute ${attribute}                   : string;\n`)
        }
        space = match[0][2].replace(/\r*\n/, '')
    }
    return [before, space.length,after]
}
exports.findStartOfAttributes=findStartOfAttributes

function findStartOfConstants(old_text ){
    let no_signal = true
    let only_arch = false
    let match = [...old_text.matchAll(/([\s\S\n\r]+?\r*\n\s*architecture [\s\S\r\n]+?\r*\n)(\s*)(constant\s+[\s\S]+?\r*\n)([\s\S\r\n]+)/gi)];
    //console.log("match = "+match)
    if (match.length === 0){
        match = [...old_text.matchAll(/([\s\S\r\n]+)(\r*\n\s*)(-{2,}\s*constant\s+-{2,}\r*\n\s*-{2,}[ \t]*\r*\n)([\s\S\r\n]+)/gi)]
        if (match.length === 0) match = [...old_text.matchAll(/([\s\S\n\r]+?\r*\n\s*architecture [\s\S\n\r]+?\r*\n)(\s*)(end\s+component[\s\S]+?\r*\n)([\s\S\n\r]+)/gi)];
        if (match.length === 0){
            match = [...old_text.matchAll(/([\s\S\n\r]+?\r*\n\s*architecture [\s\S\n\r]+?\r*\n)([\s\S\n\r]+)/gi)];
            only_arch = true
        } 
    } 
    let before 
    let space 
    let after 
    if (only_arch === false) {
        if (match[0].length != 5) {
            return
        }
        before = match[0][1]+match[0][2]+match[0][3]
        space = match[0][2].replace(/\n/, '')
        after = match[0][4]    
    }
    else{
        if (match[0].length != 3) {
            return
        }
        before = match[0][1]
        space = "   "
        after = match[0][2]    
    }
    return [before, space.length,after]
}
exports.findStartOfConstants=findStartOfConstants

function expandType(type){
    let vector = false
    if (type.startsWith("sig ") || type.startsWith("slv ")|| type.startsWith("usig ")){
        vector = true
    }
    type = type.replace(/\bslv\s+/, "std_logic_vector(")
    type = type.replace(/\bslv\b/, "std_logic_vector")
    type = type.replace(/\bsl\b/, "std_logic")
    type = type.replace(/\bint\b/, "integer")
    type = type.replace(/\bsig\s+/, "signed(")
    type = type.replace(/\bsig\b/, "signed")
    type = type.replace(/\busig\s+/, "unsigned(")
    type = type.replace(/\busig\b/, "unsigned")
    type = type.replace(/\bbool\b/, "boolean")
    type = type.replace(/\bo0\b/, "(others => '0')")
    type = type.replace(/\bo1\b/, "(others => '1')")
    if (type.trim().slice(-1)=="(") type = type.slice(0,-1)
    let matches = [...type.matchAll(/([0-9]+)/gi)]
    if (matches.length > 0){
        if (matches.length >= 2){
            const f = parseInt( matches[0][1],10)
            const l = parseInt(matches[1][1], 10)
            if (f < l){
                if (type.startsWith("integer")){
                    type = type.replace(/([0-9]+)\s+([0-9]+)/, "range $1 to $2")            
                }
                else {// assume vectors
                    type = type.replace(/([0-9]+)\s+([0-9]+)/, "$1 to $2")
                }
            }
            else{
                if (type.startsWith("integer")){
                    type = type.replace(/([0-9]+)\s+([0-9]+)/, "range $1 downto $2")            
                }
                else {// assume vectors
                    type = type.replace(/([0-9]+)\s+([0-9]+)/, "$1 downto $2")
                }
            }
            
        }
        if ((matches.length ==1)&&(type.startsWith("integer"))){
            const f = parseInt( matches[0][1],10)
            type = type.replace(/([0-9]+)/, ":= $1")
        }
    }
    matches = [...type.matchAll(/\(/gi)]
    let openbr = matches.length
    matches = [...type.matchAll(/\)/gi)]
    let closebr = matches.length
    if (openbr === closebr+1){
        if (type.search(":=")> -1) {
            // default value defined
            const s = type.split(":=")
            type = s[0].trim() + ") :="+s[1]
        }
        else{
            type = type.trim() + ")"
        }
    }

    return type
}
exports.expandType=expandType

function to_vhdl(text){
    let generics = ""
    let module_name = ""
    let ports

    let m = text.match(/module\s(.*?)[\s\r\n]*#\s*/)
    if (m){
        module_name = m[1]
        text = text.substr(text.match(/module\s(.*?)[\s\r\n]*#\s*/)[0].length)
    } 

    let tmptext = text.replace(/\/\/.*/g, "")
    if(tmptext.search(/\([\s\S\n]*\)\s*\(/)>-1){
        // module with generics
        m = text.match(/\(([\s\S\n]*?\))[\n\r\s]*\(/)
        generics = m[1]
        text= text.substr(m[0].length)

    }
    ports = text

    generics = generics.replace(/parameter\s*/g, "")
    generics = generics.replace(/\s*=([^,]*)(,*)(.*)/g, " => $2 --$1$2")
    if (generics[0]==='\n') generics = generics.substr(1)
    //generics = generics.replace(/\s*=([^>]*)/g, " =>  --$1")

    if (ports.trim()[0]==='(') ports=ports.substr(1)
    ports = ports.replace(/wire/g, "")
    ports = ports.replace(/reg/g, "")
    ports = ports.replace(/(\n\s*)(in|out)put/g, "$1$2")
    ports = ports.replace(/(\n\s*)(in|out){1}\s+([a-zA-Z0-9_, ]*)\s*,/g, "$1$3    => ,-- $2 std_logic")
    ports = ports.replace(/(\n\s*)(in|out){1}\s*\[\s*(.*)\s*:\s*(.*)\s*\]\s*([a-zA-Z0-9_]*)\s*(,*)/g, "$1$5    => $6-- $2 std_logic_vector($3 downto $4)")
    ports = ports.replace(/(\n\s*)(in|out){1}\s+([a-zA-Z0-9_, ]*)/g, "$1$3    => -- $2 std_logic")
    if (ports[0]==='\n') ports=ports.substr(1)

    let entity = ""
    let in_comment = false
    if (module_name !== "") entity = `u_${module_name} : entity work.${module_name}`
    if (generics !== ""){
        entity += "\ngeneric map(\n"
        for (const g of generics.split('\n')){
            if (g.trim().search(/^\/\*/) > -1) in_comment = true
            if (in_comment) entity += "   --"+g.trim()+"\n"
            else entity += "   "+g.trim()+"\n"
            if (g.trim().search(/^\*\//) > -1) in_comment = false
            
        }
    } 
    else entity += "\n"
    entity += "port map(\n"
    for (const g of ports.split('\n')){
        if (g.trim().search(/^\/\*/) > -1) in_comment = true
        
        if (g.split(",").length > 2){
            let indent = g.split(",")[0].match(/\s+/)[0]
            let end = g.split(",").slice(-1)
            for (const p of g.split(",").slice(0, -1)){
                let assign = p.indexOf("=>") >-1? "": "   =>"
                if (in_comment) entity += indent+"##"+ p.trim() + assign+" , " + end+"\n"
                else entity += "   "+p.trim() + assign+" , " + end+"\n"
            }
        }
        else{
            if (in_comment) entity += "   ##"+ g.trim() +"\n"
            else entity += "   "+g.trim() +"\n"
        }
        if (g.trim().search(/^\*\//) > -1) in_comment = false
    }
    if (entity.trim().slice(-1) !== ";") entity += "\n);"
    let dollar = "##"
    entity = entity.replace(/(\n\s*)\/\//g, "$1"+dollar)
    entity = allign_whatever("=>", entity)
    entity = allign_whatever("--", entity)
    entity = allign_whatever("//", entity)
    entity = entity.replace(/\/\//g, " --")
    entity = entity.replace(/##/g, "--")
    return entity

}
exports.to_vhdl=to_vhdl

function allign_whatever(pattern, text){
	let max = 0
	let pos = 0
    pattern = pattern.replace("(", "\\(")
    pattern = pattern.replace(")", "\\)")
    pattern = pattern.replace(".", "\\.")
    pattern = pattern.replace("[", "\\[")
    pattern = pattern.replace("]", "\\]")
    pattern = pattern.replace("?", "\\?")
    pattern = pattern.replace("{", "\\{")
    pattern = pattern.replace("}", "\\}")
    pattern = pattern.replace("^", "\\^")
    pattern = pattern.replace("$", "\\$")
    pattern = pattern.replace("+", "\\+")
    pattern = pattern.replace("*", "\\*")
    pattern = pattern.replace("|", "\\|")
    for (const l of text.split("\n")){
        pos = l.search(pattern)
        if (max < pos) max = pos
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


function getDeclaration(old_text, type, name, comment = "", objType , pos=0){

    let before 
    let space_before 
    let space_after 
    let after
    let noSpace 
    let sigvar
    let add_generics_section
    let editor = vscode_1.window.activeTextEditor;
    if (!editor) {
        return;
    }
    if (pos !==0){
        const start = editor.document.offsetAt(new vscode_1.Position(pos.start, 0))
        const end = editor.document.offsetAt(new vscode_1.Position(pos.end+1, 0))    
    }


    if (objType == "signal"){
        [before, noSpace, after] = findStartOfSignals(old_text)
        sigvar = "signal"
        space_before = " ".repeat(noSpace)
        space_after = " ".repeat(noSpace)    
    }

    if (objType === "var"){
        [before, noSpace, after] = findStartOfVariables(old_text, pos.start)
        sigvar = "variable" 
        if (noSpace < 0) noSpace = 0 
        space_before = " ".repeat(noSpace)
        space_before += " ".repeat(3)
        space_after = ""
    } 

    if (objType === "const"){
        [before, noSpace, after] = findStartOfConstants(old_text, pos.start)
        sigvar = "constant" 
        space_before = " ".repeat(noSpace)
        space_after = "" //" ".repeat(noSpace)  
        if (type.indexOf(":=")===-1){
            comment = "--TODO give a default value" 
            type += ":="    
        } 
    } 
    if (objType === "port"){
        [before, noSpace, after] = findStartOfPorts(old_text, pos.start)
        sigvar = "" 
        space_before = " ".repeat(noSpace+3-1)
        space_after = ""    
        if (type.search(/in|out|inout|buffer/)===-1){
            comment = "--TODO define direction"
        }
    } 
    if (objType === "generic"){
        [before, noSpace, after, add_generics_section] = findStartOfGenerics(old_text, pos.start)
        sigvar = "" 
        space_before = " ".repeat(noSpace+3-1)
        space_after = ""    
        comment = "--TODO define default value"
        if (type.include(":=")) comment = ""
    } 

    let declaration = `${space_before}${sigvar} ${name} : ${type};${comment}\n${space_after}`
    let text = old_text
    if ((objType === "var")||(objType === "const")){
        text = pos.text
    }
    
    let cond = type.replace(/ /g, "\\s+")
    cond = cond.replace(/\(/g, "\\(")
    cond = cond.replace(/\)/g, "\\)")
    if (text.search(new RegExp(`\\n\\s*${sigvar}\\s+${name}\\s*:\\s*${cond}\\s*;`, "i"))>-1){
        vscode_1.window.showInformationMessage(`A declaration for ${objType} ${name} already exists. Nothing added.`)
        return old_text
    }
   
    if (add_generics_section){
        declaration = `   ${space_before}${sigvar} ${name} : ${type} ${comment}\n`
        declaration = " ".repeat(noSpace+3)+"generic(\n"+declaration+" ".repeat(noSpace+3)+");\n" 
    }
    let new_text = before + declaration + after;
    return new_text;
}
exports.getDeclaration=getDeclaration

function getObjType(signal){
    if (signal.startsWith("v_")) return "var"
    else if (signal.startsWith("C_")) return  "const"
    else if (signal.startsWith("G_")) return "generic"
    else if (signal.search(/[A-Z]/g)<0) return "signal"  
    else if (signal.search(/[a-z]/g)<0) return "port"  
    else return null//no valid object found    
}
exports.getObjType=getObjType

function define_enum_from_case(casestat){
    let filter = casestat.match(/\s*case\s+(.*)|\n\s*when\s*(.*)/g)
    if (filter.length < 2) return null
    let signalName = filter[0].replace(/case|is.*/gi, "").trim()
    let typedeclaration = `type t_${signalName} is (`
    for (const s of filter){
        const stat =s.replace(/when|=>.*/gi, "").trim()
        if (!(stat.startsWith("case") || stat.startsWith("others")) ){
            typedeclaration += stat + ", "
        }
    }
    typedeclaration = typedeclaration.substring(0,typedeclaration.length-2)
    typedeclaration += ");"
    return [typedeclaration, signalName]
}
exports.define_enum_from_case=define_enum_from_case
