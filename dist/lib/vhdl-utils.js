"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const { RequestType0 } = require("vscode-languageclient");

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
        proc_pat = [...fragment.matchAll(/\n(\s*.*:*process\s*\(*[A-Za-z0-9_:, \-\t\n]*\)*.*\n)\s*(begin|variable|function|procedure)+.*\n/gi)]

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
    let st_end = 0
    let st_start = 0
    let i = 0
    let fragment
    let proc_pat
    let cont = 1
    while ((cont > 0) && (i < 50)){
        i = i+1
        fragment = text.substring(proc_pos,start)
        proc_pat = [...fragment.matchAll(/\n(\s*function\s+\w+\s*\(*[A-Za-z0-9_:, \-\t\r\n]*?\)\s+return\s+.*?\s+is\s*\r*\n)\s*(begin|variable|function|procedure)+.*\r*\n/gi)]

        if (proc_pat.length > 0){
            proc_pos = st_end + proc_pat[0].index + proc_pat[0][1].length + 1
            st_start = proc_pos  - proc_pat[0][1].length
            st_end = proc_pos  
        }
        cont = proc_pat.length
    }
    return [st_start, st_end]
}
exports.findFunction = findFunction;

function findProcedure(text, start){
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
        proc_pat = [...fragment.matchAll(/\n(\s*procedure\s+\w+\s*\(*[A-Za-z0-9_:, \-\t\r\n]*?\)\s+is\s*\r*\n)\s*(begin|variable|function|procedure)+.*\r*\n/gi)]
        if (proc_pat.length > 0){
            proc_pos = st_end + proc_pat[0].index + proc_pat[0][1].length + 1
            st_start = proc_pos  - proc_pat[0][1].length
            st_end = proc_pos  
        }
        cont = proc_pat.length
    }
    return [st_start, st_end]
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
    proc_pat = [...fragment.matchAll(/\n\s*entity\s+[A-Za-z_0-9]+.*?\n/g)]
    if (proc_pat.length>0){
        proc_pos = proc_pat[0].index
    }    
    fragment = text.substring(proc_pos)
    proc_pat = [...fragment.matchAll(/\n(\s*port\s*\n*\(.*\n)/g)]

    if (proc_pat.length>0){
        st_end = proc_pos + proc_pat[0].index + proc_pat[0][1].length+1
        st_start = proc_pos + proc_pat[0].index+1 // get rid of the \n
    }
    const before = text.substring(0, st_end)
    const spaces = text.substring(st_start, st_end).search(/\S/)
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
    proc_pat = [...fragment.matchAll(/\n(\s*entity\s+[A-Za-z_0-9]+.*?\n)/g)]
    if (proc_pat.length>0){
        st_end = proc_pos + proc_pat[0].index + proc_pat[0][1].length+1
        st_start = proc_pos + proc_pat[0].index+1 // get rid of the \n
        proc_pos = proc_pat[0].index
    }    
    fragment = text.substring(proc_pos)
    proc_pat = [...fragment.matchAll(/\n(\s*generic\s*\n*\(.*\n)/g)]

    if (proc_pat.length>0){
        st_end = proc_pos + proc_pat[0].index + proc_pat[0][1].length+1
        st_start = proc_pos + proc_pat[0].index+1 // get rid of the \n
    }
    else  add_generics_section = true

    const before = text.substring(0, st_end)
    const spaces = text.substring(st_start, st_end).search(/\S/)
    const after = text.substring(st_end)
    return [before,spaces, after, add_generics_section]
}
exports.findStartOfGenerics=findStartOfGenerics

function findStartOfTypes(old_text,type_definition){

    let no_signal = true
    let only_arch = false
    let match = [...old_text.matchAll(/([\s\S\r\n]+)(\r*\n\s*)(-{2,}\s*type\s+-{2,}\r*\n\s*-{2,}[ \t]*\r*\n)([\s\S\r\n]+)/gi)]
    
    if (match.length === 0){
        // type declaration exists already
        match = [...old_text.matchAll(/([\s\S\n]+?\n\s*architecture [\s\S\n]+?\n)(\s*)(type\s+[\s\S]+?\n)([\s\S\n]+)/gi)];
        if (match.length === 0){
            no_signal = false
            // search beginning of signals
            match = [...old_text.matchAll(/([\s\S\n]+?\n\s*architecture [\s\S\n]+?\n)(\s*)(signal\s+[\s\S\n]+)/gi)];
            if (match.length === 0){
                no_signal = true
                // check if constants exist
                match = [...old_text.matchAll(/([\s\S\n]+?\n\s*architecture [\s\S\n]+?\n)(\s*)(constant\s+[\s\S]+?\n)([\s\S\n]+)/gi)];
                //check if components exist
                if (match.length === 0) match = [...old_text.matchAll(/([\s\S\n]+?\n\s*architecture [\s\S\n]+?\n)(\s*)(end\s+component[\s\S]+?\n)([\s\S\n]+)/gi)];
                if (match.length === 0){
                    // locate architecture itself
                    match = [...old_text.matchAll(/([\s\S\n]+?\n\s*architecture [\s\S\n]+?\n)([\s\S\n]+)/gi)];
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
    let proc_offset_start  
    let proc_offsett_end 
    let proc_offset_start2 = 0 
    let proc_offsett_end2 = 0
    let proc_offset_start3 = 0
    let proc_offsett_end3 = 0
    let [proc_offset_start1, proc_offsett_end1] = findProcess(text, start)
    proc_offsett_end = proc_offsett_end1
    proc_offset_start = proc_offset_start1


    if ((proc_offset_start1 === 0)&&(proc_offsett_end1 ===0))
    {
        [proc_offset_start2, proc_offsett_end2] = findFunction(text, start)
    }
    
    if ((proc_offset_start1 === 0)&&(proc_offsett_end1 ===0))
    {
        [proc_offset_start3, proc_offsett_end3] = findProcedure(text, start)
    }
    if ((start-proc_offset_start3) >=0 && (proc_offset_start3 >0)) {
        // procedure detected
        if ((start-proc_offset_start2)>=0 && (proc_offset_start2>0)){
            // also a function detected => take the one closest to the start
            if ((start - proc_offset_start2) > (start - proc_offset_start3)){
                // procedure closest 
                proc_offsett_end = proc_offsett_end3
                proc_offset_start = proc_offset_start3
            }
            else{
                proc_offsett_end = proc_offsett_end2
                proc_offset_start = proc_offset_start2
            }
        }
    }
    else {
        if (proc_offset_start2 > 0){
            // no procedire detected
            proc_offsett_end = proc_offsett_end2
            proc_offset_start = proc_offset_start2            
        }
    }
    
    const before = text.substring(0, proc_offsett_end)
    const spaces = text.substring(proc_offset_start).search(/\S/)
    const after = text.substring(proc_offsett_end)
    return [before,spaces, after]
}
exports.findStartOfVariables=findStartOfVariables

function findStartOfSignals(old_text ){
    let no_signal = false
    let only_arch = false
    let match = [...old_text.matchAll(/([\s\S\n]+?\n\s*architecture [\s\S\n]+?\n)(\s*)(signal\s+[\s\S\n]+)/gi)];
    //console.log("match = "+match)
    if (match.length === 0){
        no_signal = true
        // first check for the default template header
        match = [...old_text.matchAll(/([\s\S\r\n]+)(\r*\n\s*)(-{2,}\s*signal\s+-{2,}\r*\n\s*-{2,}[ \t]*\r*\n)([\s\S\r\n]+)/gi)]
        // if not present, check if types are defined
        if (match.length === 0) match = [...old_text.matchAll(/([\s\S\n]+?\n\s*architecture [\s\S\n]+?\n)(\s*)(type\s+[\s\S]+?\n)([\s\S\n]+)/gi)];
        // if no types, check if constants are defined
        if (match.length === 0) match = [...old_text.matchAll(/([\s\S\n]+?\n\s*architecture [\s\S\n]+?\n)(\s*)(constant\s+[\s\S]+?\n)([\s\S\n]+)/gi)];
        // if no constants, check if components are defined        
        if (match.length === 0) match = [...old_text.matchAll(/([\s\S\n]+?\n\s*architecture [\s\S\n]+?\n)(\s*)(end\s+component[\s\S]+?\n)([\s\S\n]+)/gi)];
        // if none of the above, check if the architecture is defined
        if (match.length === 0){
            match = [...old_text.matchAll(/([\s\S\n]+?\n\s*architecture [\s\S\n]+?\n)([\s\S\n]+)/gi)];
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
        match = [...old_text.matchAll(/([\s\S\r\n]+)(\r*\n\s*)(-{2,}\s*attribute\s+-{2,}\r*\n\s*-{2,}[ \t]*\r*\n)([\s\S\r\n]+)/gi)]
        add_attribute_declaration = true
        if (match.length ===0){
            match = [...old_text.matchAll(/([\s\S\n]+)(\r*\n\s*)(attribute\s+.*\r*\n)([\s\S\n]+)/gi)];
            if (match.length ===0){
                vscode_1.window.showErrorMessage(`Could not find start of the attributes section. \n\nMark it with a '-- attribute' comment or add manually one mark_debug attribute`);
                return    
            }
        }
    } 
    let before 
    let space 
    let after 
    if (no_signal === false){
        if (match[0].length != 5) {
            return
        }
        before = match[0][1]+match[0][2]+match[0][3]
        if (add_attribute_declaration){
            before += (`attribute ${attribute}                   : string;\n`)
        }
        space = match[0][2].replace(/\n/, '')
        after = match[0][4]    
    }
    return [before, space,after]
}
exports.findStartOfAttributes=findStartOfAttributes

function findStartOfConstants(old_text ){
    let no_signal = true
    let only_arch = false
    let match = [...old_text.matchAll(/([\s\S\n]+?\n\s*architecture [\s\S\n]+?\n)(\s*)(constant\s+[\s\S]+?\n)([\s\S\n]+)/gi)];
    //console.log("match = "+match)
    if (match.length === 0){
        if (match.length === 0) match = [...old_text.matchAll(/([\s\S\n]+?\n\s*architecture [\s\S\n]+?\n)(\s*)(end\s+component[\s\S]+?\n)([\s\S\n]+)/gi)];
        if (match.length === 0){
            match = [...old_text.matchAll(/([\s\S\n]+?\n\s*architecture [\s\S\n]+?\n)([\s\S\n]+)/gi)];
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
    return [before, space,after]
}
exports.findStartOfConstants=findStartOfConstants

function expandType(type){
    let vector = false
    if (type.startsWith("sig ") || type.startsWith("slv ")|| type.startsWith("usig ")){
        vector = true
    }
    type = type.replace(/\bslv\s+/, "std_logic_vector(")
    type = type.replace(/\bsl\b/, "std_logic")
    type = type.replace(/\bint\b/, "integer")
    type = type.replace(/\bsig\s+/, "signed(")
    type = type.replace(/\busig\s+/, "unsigned(")
    type = type.replace(/\bbool\b/, "boolean")
    const matches = [...type.matchAll(/([0-9]+)/gi)]
    if (matches.length > 0){
        if (matches.length >= 2){
            const f = parseInt( matches[0][1],10)
            const l = parseInt(matches[1][1], 10)
            if (f < l){
                if (type.startsWith("integer")){
                    type = type.replace(/([0-9]+)\s+([0-9]+)/, "range $1 to $2")            
                }
                else {// assume vectors
                    type = type.replace(/([0-9]+)\s+([0-9]+)/, "$1 to $2$")
                }
            }
            else{
                if (type.startsWith("integer")){
                    type = type.replace(/([0-9]+)\s+([0-9]+)/, "range $1 downto $2")            
                }
                else {// assume vectors
                    type = type.replace(/([0-9]+)\s+([0-9]+)/, "$1 downto $2$")
                }
            }
            
        }
        if ((matches.length ==1)&&(type.startsWith("integer"))){
            const f = parseInt( matches[0][1],10)
            type = type.replace(/([0-9]+)/, ":= $1")
        }
    }
    if (vector){
        type = type.replace(/\$/, ")") 
    }
    /*type = type.replace(/\s*([a-zA-Z_0-9']+)\s*([a-zA-Z_0-9']+)\s+([a-zA-Z_0-9']+)/, "$1 range $2 to $3")
    type = type.replace(/\s*([a-zA-Z_0-9']+)\s+d\s+([a-zA-Z_0-9']+)/, "($1 downto $2)")
    type = type.replace(/\s*([a-zA-Z_0-9']+)\s+t\s+([a-zA-Z_0-9']+)/, "($1 to $2)")
    */
    return type
}
exports.expandType=expandType

function getDeclaration(old_text, type, name, comment = "", objType , pos=0){

    let before 
    let space_before 
    let space_after 
    let after
    let noSpace 
    let sigvar
    let add_generics_section
    
    if (objType == "signal"){
        [before, noSpace, after] = findStartOfSignals(old_text)
        sigvar = "signal"
        space_before = " ".repeat(noSpace)
        space_after = " ".repeat(noSpace)    
    }

    if (objType === "var"){
        [before, noSpace, after] = findStartOfVariables(old_text, pos)
        sigvar = "variable" 
        if (noSpace < 0) noSpace = 0 
        space_before = " ".repeat(noSpace)
        space_before += " ".repeat(3)
        space_after = ""
    } 

    if (objType === "const"){
        [before, noSpace, after] = findStartOfConstants(old_text, pos)
        sigvar = "constant" 
        space_before = " ".repeat(noSpace)
        space_after = " ".repeat(noSpace)  
        if (type.indexOf(":=")===-1){
            comment = "--TODO give a default value" 
            type += ":="    
        } 
    } 
    if (objType === "port"){
        [before, noSpace, after] = findStartOfPorts(old_text, pos)
        sigvar = "" 
        space_before = " ".repeat(noSpace+3-1)
        space_after = ""    
        if (type.search(/in|out|inout|buffer/)===-1){
            comment = "--TODO define direction"
        }
    } 
    if (objType === "generic"){
        [before, noSpace, after, add_generics_section] = findStartOfGenerics(old_text, pos)
        sigvar = "" 
        space_before = " ".repeat(noSpace+3-1)
        space_after = ""    
        comment = "--TODO define default value"
    } 

    let declaration = `${space_before}${sigvar} ${name} : ${type};${comment}\n${space_after}`
    if (old_text.search(new RegExp(`\\n\\s*${sigvar}\\s+${name}\\s*:\\s*${type.replace(/ /, "\\s+")}\\s*;`, "i"))>-1){
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
