"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const escapeStringRegexp = require("escape-string-regexp");
const objects_1 = require("./objects");
//const config_1 = require("./config");
const tokenizer_1 = require("./tokenizer");
const vscode_languageserver_1 = require("vscode-languageserver");

const { lintSyntaxError } = require("tslint/lib/verify/lintError");
const { throws } = require("assert");
class ParserBase {
    constructor(text, pos, file, onlyDeclarations = false) {
        this.text = text;
        this.pos = pos;
        this.file = file;
        this.onlyDeclarations = onlyDeclarations;
    }
    debug(_message) {
    }
    debugObject(_object) {
    }

    parse_signals(nextWord, parent, parsingInterface=false, parsingPort = false, ){
        const startI = this.pos.i
        let isVariable = false
        if (nextWord === 'shared') {
            this.getNextWord();  // consume the shared
            nextWord = this.getNextWord({ consume: false }).toLowerCase()
        }
        if (nextWord === "variable"){
            isVariable = true
        } else if ((nextWord === "signal") && (!this.allowSignals)){
            let scope = this.parent.constructor.name.substring(1)
            throw new objects_1.ParserError(`No signal declaration expected in current scope ${scope} ";"`, new objects_1.OIRange(this.parent, this.pos.i, this.pos.i+this.text.substring(this.pos.i).search(/\n/)));                                            
        }
        const signals = [];
        let constant
        let signal
        if (!parsingInterface)  constant = this.getNextWord() === 'constant'; 
        else constant = false
        do {
            this.maybeWord(',');
            if (!isVariable){
                if (parsingInterface){
                    if (parsingPort) signal = new objects_1.OPort(parent, this.pos.i, this.getEndOfLineI())
                    else signal = new objects_1.OGenericActual(parent, this.pos.i, this.getEndOfLineI())
                } 
                else
                signal = new objects_1.OSignal(parent, startI, this.getEndOfLineI()); // startI makes that the signal, variable, constant is part of the declaration
                signal.constant = constant;
            }
            else{
                signal = new objects_1.OVariable(parent, startI, this.getEndOfLineI());
            }
            signal.name = new objects_1.OName(signal, this.pos.i, this.pos.i);
            signal.name.text = this.getNextWord();
            signal.name.range.end.i = signal.name.range.start.i + signal.name.text.length;
            signals.push(signal);
        } while (this.text[this.pos.i] === ',');
        this.expect(':');

        if (parsingPort){
            let directionString = this.getNextWord({ consume: false }).toLowerCase();
            if (directionString !== 'in' && directionString !== 'out' && directionString !== 'inout' && directionString !== 'buffer') {
                signal.direction = 'in';
                signal.directionRange = new objects_1.OIRange(signal, this.pos.i, this.pos.i);
            }
            else {
                signal.direction = directionString;
                signal.directionRange = new objects_1.OIRange(signal, this.pos.i, this.pos.i + directionString.length);
                this.getNextWord(); // consume direction
            }
        }

        signal.declaration = this.text.substring(this.pos.i, this.getEndOfLineI())

        const iBeforeType = this.pos.i;
        for (const s of signals) {
            if (s){
                const { typeReads, defaultValueReads, typename} = this.getType(s, false);
                s.type = typeReads;
                s.typename = typename;
                if (defaultValueReads) s.defaultValue = defaultValueReads;
                else if (typename.includes(":=")) s.defaultValue = "constant"
                s.range.end.i = this.pos.i;
                s.declaration = signal.declaration
                if (parsingPort){
                    s.direction = signal.direction
                    s.directionRange =  signal.directionRange
                } 
            }
        }
        if (!parsingInterface) this.advanceFinalSemicolon();
        return signals
    }


    parsePortsAndGenerics(generics, entity) {
        this.debug('start ports');
        this.expectDirectly('(');
        let ports = [];
        if (generics) {
            if ((entity instanceof objects_1.OProcedure) || (entity instanceof objects_1.OFunction)) {
                throw new Error('Blub');
            }
            entity.generics = ports;
        }
        else {
            entity.ports = ports;
        }
        // let multiPorts: string[] = [];
        const startI = this.pos.i
        while (this.pos.i < this.text.length) {
            this.advanceWhitespace();
            let port = generics ?
                new objects_1.OGenericActual(entity, this.pos.i, this.getEndOfLineI()) :
                new objects_1.OPort(entity, this.pos.i, this.getEndOfLineI());

            if (this.text[this.pos.i] === ')') {
                this.pos.i++;
                this.advanceWhitespace();
                break;
            }

            if (this.getNextWord({ consume: false }).toLowerCase() === 'type') {
                // generic type in case of generic packages
                this.getNextWord();
                port = Object.setPrototypeOf(port, objects_1.OGenericType.prototype);
                port.name = new objects_1.OName(port, this.pos.i, this.pos.i);
                port.name.text = this.getNextWord();
                port.name.range.end.i = port.name.range.start.i + port.name.text.length;
                ports.push(port);
                this.expectDirectly(";")
            }
            else {
                const next = this.getNextWord({ consume: false }).toLowerCase();

                if (next === 'signal' || next === 'variable' || next === 'constant' || next === 'file') {
                    this.getNextWord();
                }
                let nextWord = this.getNextWord({consume:false});
                let multiports = []
                if ((nextWord !== "package") && (nextWord !== "type") && (nextWord !== "procedure") && (nextWord !== "function")){
                    do {
                        this.maybeWord(',');
                        port = new objects_1.OPort(entity, this.pos.i, this.getEndOfLineI());
                        port.name = new objects_1.OName(port, this.pos.i, this.pos.i);
                        port.name.text = this.getNextWord();
                        port.name.range.end.i = port.name.range.start.i + port.name.text.length;
                        multiports.push(port);
                    } while (this.text[this.pos.i] === ',');
                    this.expect(':');
            
                    if (port instanceof objects_1.OPort) {
                        let directionString = this.getNextWord({ consume: false }).toLowerCase();
                        if (directionString !== 'in' && directionString !== 'out' && directionString !== 'inout' && directionString !== 'buffer') {
                            port.direction = 'in';
                            port.directionRange = new objects_1.OIRange(port, this.pos.i, this.pos.i);
                        }
                        else {
                            port.direction = directionString;
                            port.directionRange = new objects_1.OIRange(port, this.pos.i, this.pos.i + directionString.length);
                            this.getNextWord(); // consume direction
                        }
                    }

                    port.declaration = this.text.substring(this.pos.i, this.getEndOfLineI())
            
                    const iBeforeType = this.pos.i;
                    for (const s of multiports) {
                        if (s){
                            const { typeReads, defaultValueReads, typename} = this.getTypeDefintion(port, iBeforeType);
                            s.type = typeReads;
                            s.typename = typename;
                            s.defaultValue = defaultValueReads;
                            //s.range.end.i = this.pos.i;
                            s.declaration = port.declaration
                            if (port instanceof objects_1.OPort) {
                                s.direction = port.direction
                                s.directionRange =  port.directionRange
                            }
                        }
                    }
            
                    ports = ports.concat(multiports)
                    this.maybeWord(";")
/*

                    if (port instanceof objects_1.OPort) {
                        directionString = this.getNextWord({ consume: false }).toLowerCase();
                        if (directionString !== 'in' && directionString !== 'out' && directionString !== 'inout' && directionString !== 'buffer') {
                            port.direction = 'in';
                            port.directionRange = new objects_1.OIRange(port, this.pos.i, this.pos.i);
                        }
                        else {
                            port.direction = directionString;
                            port.directionRange = new objects_1.OIRange(port, this.pos.i, this.pos.i + directionString.length);
                            this.getNextWord(); // consume direction
                        }
                    }
                    const iBeforeType = this.pos.i;
                    port.declaration = this.text.substring(this.pos.i, this.getEndOfLineI())
                    port.typename    = this.text.substring(this.pos.i, this.getEndOfLineI())
                    const { type, defaultValue, endI } = this.getTypeDefintion(port);
                    port.range.end.i = endI;
                    // port.type = type;
                    port.type = this.extractReads(port, type, iBeforeType);
                    //port.declaration = type;
                    port.defaultValue = defaultValue;
    
                    ports.push(port)*/
    
                }
                else if (nextWord === "package") {
                    this.getNextWord(); // consume the package
                    // generic package in the generics of a package
                    port.name = new objects_1.OName(port, this.pos.i, this.pos.i);
                    port.name.text = this.getNextWord()
                    port.name.range.end.i = port.name.range.start.i + port.name.text.length;
                    this.expect("is")
                    this.expect("new")
                    port.declaration = this.text.substring(this.pos.i, this.getEndOfLineI()+1)
                    nextWord = this.getNextWord() // library
                    this.expect('.')
                    port.typename    = this.getNextWord()
                    
                    // port.type = type;
                    port.type = this.extractReads(port, port.typename, this.pos.i);
                    //port.declaration = type;
                    this.expect("generic")
                    this.expect("map")
                    this.expect("(")
                    this.advanceBrace()
                    port.range.end.i = this.pos.i
                    ports.push(port)
                }
                else if (nextWord === "function" || nextWord === "procedure"){
                    const isFunc = (nextWord === "function")
                    this.getNextWord(); // consume function
                    const start = this.pos.i
                    const name = this.getNextWord()
                    const f = new objects_1.OFunction(this.parent, this.pos.i,this.getEndOfLineI());
                    f.name = new objects_1.OName(f, start, this.pos.i)
                    f.name.text = name
                    this.parsePortsAndGenerics(false, f)
                    if (isFunc){
                        this.expect("return")
                        const type = this.getNextWord()
                        this.expect(";")
                        if (!entity.functions) entity.functions = []
                        entity.functions.push(f) 
                    }   
                    else{
                        this.expect(";")
                        if (!entity.procedures) entity.procedures = []
                        entity.procedures.push(f) 
                    }
                }
            }
        }
        if (generics) {
            entity.generics = ports;
        }
        else {
            entity.ports = ports;
        }
    }
    getTypeDefintion(parent, start = 0) {
        let type = '';
        let braceLevel = 0;
        if (start > 0) this.pos.i = start
        else start = this.pos.i
        while (this.text[this.pos.i].match(/[^);:]/) || braceLevel > 0) {
            type += this.text[this.pos.i];
            if (this.text[this.pos.i] === '(') {
                braceLevel++;
            }
            else if (this.text[this.pos.i] === ')') {
                braceLevel--;
            }
            this.pos.i++;
        }
        if (type.search(/\s*\w+\s*\n\s*\w+/)>-1){
            throw new objects_1.ParserError(`Expected ';' at end of this line`, new objects_1.OIRange(this.parent, start, this.getEndOfLineI(start)))
        }
        if (type.trim().length ===0){
            throw new objects_1.ParserError(`Expected type definition for this port`, new objects_1.OIRange(this.parent, start, this.getEndOfLineI(start)))
        }
        let defaultValue = '';
        const startI = this.pos.i + 2;
        if (this.text[this.pos.i] === ':') {
            this.pos.i += 2;
            while (this.text[this.pos.i].match(/[^);]/) || braceLevel > 0) {
                defaultValue += this.text[this.pos.i];
                if (this.text[this.pos.i] === '(') {
                    braceLevel++;
                }
                else if (this.text[this.pos.i] === ')') {
                    braceLevel--;
                }
                this.pos.i++;
            }
        }
        this.reverseWhitespace();
        const endI = this.pos.i;
        this.advanceWhitespace();
        if (this.text[this.pos.i] === ';') {
            const startI = this.pos.i;
            this.pos.i++;
            this.advanceWhitespace();
            if (this.text[this.pos.i] === ')') {
                const range = new objects_1.OIRange(parent, startI, startI + 1);
                range.start.character = 0;
                throw new objects_1.ParserError(`Unexpected ';' at end of port list`, range, {
                    message: `Remove ';'`,
                    edits: [vscode_languageserver_1.TextEdit.del(new objects_1.OIRange(parent, startI, startI + 1))]
                });
            }
        }
        defaultValue = defaultValue.trim();
        type = this.extractReads(parent, type, start)
        if (defaultValue === '') {
            return {
                type: type,
                endI
            };
        }
        return {
            type: type,
            defaultValue: this.extractReads(parent, defaultValue, startI),
            endI
        };
    }
    message(message, severity = 'error') {
        if (severity === 'error') {
            throw new objects_1.ParserError(message + ` in line: ${this.getLine()}`, this.pos.getRangeToEndLine());
        }
        else {
        }
    }
    advanceWhitespace() {
        const match = this.text.substring(this.pos.i).match(/^\s+/);
        if (match) {
            this.pos.i += match[0].length;
        }
        // while (this.text[this.pos.i] && this.text[this.pos.i].match(/\s/)) {
        //   this.pos.i++;
        // }
    }
    reverseWhitespace() {
        while (this.text[this.pos.i - 1] && this.text[this.pos.i - 1].match(/\s/)) {
            this.pos.i--;
        }
    }

    searchpatToString(search)
    {
        if (typeof search === 'string') {
            return search
        } else{
            search = `${search}`
            search = search.replace(/\/[gi]*$/g, "")
            search = search.replace(/^\//g, "")
            search = search.replace(/\\[a-z]{1}/g, "")
            return search    
        }
    }
    advancePast(search, options = {}) {
        if (typeof options.allowSemicolon === 'undefined') {
            options.allowSemicolon = false;
        }
        if (typeof options.returnMatch === 'undefined') {
            options.returnMatch = false;
        }
        if (typeof options.allowKeywords === 'undefined') {
            options.allowKeywords = true;
        }
        let text = '';
        let searchStart = this.pos;
        let start = this.pos.i
        if (typeof search === 'string') {
            while (this.text.substr(this.pos.i, search.length).toLowerCase() !== search.toLowerCase()) {
                if (!options.allowSemicolon && this.text[this.pos.i] === ';') {
                    search = this.searchpatToString(search)
                    throw new objects_1.ParserError(`Expect to find "${search}" on this line`, new objects_1.OIRange(this.parent, start, this.pos.i));// + this.text.substring(this.pos.i).search(/\n/g)));
                }
                text += this.text[this.pos.i];
                this.pos.i++;
                if (this.pos.i > this.text.length) {
                    search = this.searchpatToString(search)
                    throw new objects_1.ParserError(`Expect to find "${search}" on this line`, new objects_1.OIRange(this.parent, start, this.pos.i));// + this.text.substring(this.pos.i).search(/\n/g)));
                }
            }
            if (options.returnMatch) {
                text += search;
            }
            this.pos.i += search.length;
        }
        else {
            //console.log("looking for "+ this.text.substr(this.pos.i,this.pos.i+100 ))
            let match = this.text.substr(this.pos.i).match(search);
            if (match !== null && typeof match.index !== 'undefined') {
                if (!options.allowSemicolon && this.text.substr(this.pos.i, match.index).indexOf(';') > -1) {
                    search = this.searchpatToString(search)
                    throw new objects_1.ParserError(`Expecting "${search}" on this line`,new objects_1.OIRange(this.parent, this.pos.i, this.pos.i+this.text.substr(this.pos.i).search(/;/g)));
                }
                // text = match[0];
                if (options.returnMatch) {
                    text = this.text.substr(this.pos.i, match.index + match[0].length);
                }
                else {
                    text = this.text.substr(this.pos.i, match.index);
                }
                this.pos.i += match.index + match[0].length;
            }
            else {
                search = this.searchpatToString(search)
                throw new objects_1.ParserError(`Expecting "${search}" on this line`, new objects_1.OIRange(this.parent, this.pos.i, this.pos.i+this.text.substr(this.pos.i).search(/;/g)));
            }
        }
        this.advanceWhitespace();
        if (!options.allowKeywords){
            let pos = this.pos.i
            this.pos.i = start
            this.checkTextForKeywords(text)
            this.pos.i = pos
        }
        return text.trim();
    }
    advanceBrace() {
        let text = '';
        let braceLevel = 0;
        let quote = false;
        while (this.text[this.pos.i]) {
            if (this.text[this.pos.i] === '"' && this.text[this.pos.i - 1] !== '\\') {
                quote = !quote;
            }
            else if (this.text[this.pos.i] === '(' && !quote) {
                if ((this.text[this.pos.i-1]==="'")&&(this.text[this.pos.i+1]==="'")){
                    let debig = 1
                }
                else braceLevel++;
            }
            else if (this.text[this.pos.i] === ')' && !quote) {
                if ((this.text[this.pos.i-1]==="'")&&(this.text[this.pos.i+1]==="'")){
                    let debig = 1
                }
                else{
                    if (braceLevel > 0) {
                        braceLevel--;
                    }
                    else {
                        this.pos.i++;
                        this.advanceWhitespace();
                        return text.trim();
                    }
                }
            }
            text += this.text[this.pos.i];
            this.pos.i++;
        }
        throw new objects_1.ParserError(`could not find closing brace`, new objects_1.OI(this.pos.parent, this.pos.i - text.length).getRangeToEndLine());
    }

    checkTextForKeywords(text){
        const keywords = ["\\bsignal\\b", "\\n\\s*begin","\\btype\\b","^constant\\b","\\bfunction\\b","\\bprocedure\\b","\\brecord\\b", "\\n\\s*for", "\\n\\s*if", "\\n\\s*else", "\\bthen\\b", "\\n\\s*when", "\\n\\s*case", "\\n\\s*function", "\\n\\s*procedure", "\\bnull\\b", "\\n\\s*loop", "\\bcomponent\\b", "\\n\\s*entity\\b", "^\\n\\s*package", "\\n\\s*end", "\\n\\s*begin"]//, "<=|:="]
        //console.log(text)
        for (const k of keywords){
            if (text.search(new RegExp(k, "gi"))>-1){
                //console.log("Found :"+k)
                throw new objects_1.ParserError(`could not find ending ";"`, new objects_1.OIRange(this.parent, this.pos.i, this.pos.i+text.search(/\n/g)));                                            
                break;    
            }
        }        
    }

    advanceFinalSemicolon() {        
        const match = /;/.exec(this.text.substring(this.pos.i));
        if (!match) {
            throw new objects_1.ParserError(`could not find semicolon`, this.pos.getRangeToEndLine());
        }
        const text = this.text.substring(this.pos.i, this.pos.i + match.index);
        this.checkTextForKeywords(text)

        this.pos.i += match.index + 1;
        this.advanceWhitespace();
        return text;
    }


    advanceSemicolon(braceAware = false, { consume } = { consume: true }) {
        if (braceAware) {
            let offset = 0;
            let text = '';
            let braceLevel = 0;
            let quote = false;
            let start = this.pos.i
            let lastClosingBrace = start
            let lastOpeningBrace = start
            let lastQuote = start
            let lastsingleQuote =  start
            while (this.text[this.pos.i + offset]) {
                const match = /[\\();]|(?<!")(?:"")*"(?!")/.exec(this.text.substring(this.pos.i + offset));
                //const match = /[\\();]|(?<!")(?:"")*"(?!")/.exec(this.text.substring(this.pos.i + offset));
                if (!match) {
                    throw new objects_1.ParserError(`could not find closing brace`, new objects_1.OI(this.pos.parent, this.pos.i + offset - text.length).getRangeToEndLine());
                }
                if (match[0][0] === '"' && this.text[this.pos.i + offset + match.index - 1] !== '\\') {
                    quote = !quote;
                    lastQuote =this.pos.i+offset+match.index
                }
                else if (match[0] === '(' && !quote) {
                    if ((this.text[this.pos.i+offset+match.index-1] == "'")&&( this.text[this.pos.i+offset+match.index+1] === "'")){
                        // this is s '(' case which doesn't count
                        let debug = 1
                    }
                    else{
                        braceLevel++;
                        lastOpeningBrace = this.pos.i+offset+match.index                            
                    }
                }
                else if (match[0] === ')' && !quote) {
                    if ((this.text[this.pos.i+offset+match.index-1] == "'")&&( this.text[this.pos.i+offset+match.index+1] === "'")){
                        // this is s '(' case which doesn't count
                        let debug = 3
                    }
                    else{
                        if (braceLevel > 0) {
                            braceLevel--;
                            lastClosingBrace = this.pos.i+offset+match.index
                        }
                        else {
                            //throw new objects_1.ParserError(`unexpected ')'`, new objects_1.OI(this.pos.parent, this.pos.i - text.length).getRangeToEndLine());
                            throw new objects_1.ParserError(`unexpected ')'`, new objects_1.OI(this.pos.parent, lastClosingBrace).getRangeToEndLine());
                        }
                    }
                }
                else {
                    if ((match[0] === ';') && (!quote)){
                        if (!quote  && braceLevel === 0) {
                            text += this.text.substring(this.pos.i + offset, this.pos.i + offset + match.index);
        
                            offset += match.index + 1;
                            if (consume) {
                                this.pos.i += offset;
                                this.advanceWhitespace();
                            }
                            return text.trim();    
                        }
                        else{
                            if (quote){
                                throw new objects_1.ParserError(`non matching '"'`, new objects_1.OIRange(this.pos.parent, lastQuote, this.pos.i + this.text.substring(this.pos.i).search(/\n/)));                        
                            }
                            if (braceLevel !== 0){
                                throw new objects_1.ParserError(`non matching braces`, new objects_1.OIRange(this.pos.parent, lastOpeningBrace, this.pos.i + this.text.substring(this.pos.i).search(/\n/)));                        
                            }
                        }
                    }
                }
                text += this.text.substring(this.pos.i + offset, this.pos.i + offset + match.index + match[0].length );
                offset += match.index + match[0].length;
            }
            throw new objects_1.ParserError(`could not find ';'`, new objects_1.OI(this.pos.parent, start).getRangeToEndLine());
        }
        const match = /;/.exec(this.text.substring(this.pos.i));
        if (!match) {
            throw new objects_1.ParserError(`could not find semicolon`, this.pos.getRangeToEndLine());
        }
        const text = this.text.substring(this.pos.i, this.pos.i + match.index);
        //console.log("found "+text)
        if (consume) {
            this.pos.i += match.index + 1;
            this.advanceWhitespace();
        }
        return text;
    }
    test(re) {
        return re.test(this.text.substring(this.pos.i));
    }
    getNextWord(options = {}) {
        let { re, consume } = options;
        if (!re) {
            re = /^\w+/;
        }
        if (typeof consume === 'undefined') {
            consume = true;
        }
        if (consume) {
            let word = '';
            const match = this.text.substring(this.pos.i).match(re);
            if (match) {
                word = match[0];
                this.pos.i += word.length;
                this.advanceWhitespace();
                return word;
            }
            re = this.searchpatToString(re)
            throw new objects_1.ParserError(`did not find "${re}" at the end of the line: ${this.getLine()}`, this.pos.getRangeToEndLine());
            
        }
        let word = '';
        let j = 0;
        while (this.text[this.pos.i + j].match(re)) {
            word += this.text[this.pos.i + j];
            j++;
        }
        return word;
    }
    getLine(position) {
        if (!position) {
            position = this.pos.i;
        }
        let line = 1;
        for (let counter = 0; counter < position; counter++) {
            if (this.text[counter] === '\n') {
                line++;
            }
        }
        return line;
    }
    getEndOfLineI(position) {
        if (!position) {
            position = this.pos.i;
        }
        while (this.text[position] !== '\n') {
            if (position < this.text.length){
                position++;
            }
            else break
        }
        return position - 1;
    }
    getPosition(position) {
        if (!position) {
            position = this.pos.i;
        }
        let line = 1;
        let col = 1;
        for (let counter = 0; counter < position; counter++) {
            col++;
            if (this.text[counter] === '\n') {
                line++;
                col = 1;
            }
        }
        return { line, col };
    }
    expect(expected) {
        if (!Array.isArray(expected)) {
            expected = [expected];
        }
        let savedI;
        let startI = this.pos.i
        const re = new RegExp('^' + expected.map(e => escapeStringRegexp(e)).join('|'), 'i');
        // console.log(re);
        const match = re.exec(this.text.substr(this.pos.i));
        //const match = re.exec(this.text.substring(this.pos.i, this.getEndOfLineI(this.pos.i)+1));
        if (match !== null) {
            this.pos.i += match[0].length;
            savedI = this.pos.i;
            this.advanceWhitespace();
        }
        else {
            /*const lines = [...this.text.substring(startI, savedI).matchAll(/\n/g)]
            let startline =this.getLine()
            if (lines.length>0){
                startline -= lines.length
            }*/
            const line = this.getLine()
            const range = this.pos.getRangeToEndLine()
            throw new objects_1.ParserError(`expected '${expected.join(' or ')}' found '${this.getNextWord({ re: /^\S+/ })}' line: ${line}`, range);
        }
        return savedI;
    }

    expectDirectly(expected) {
        if (!Array.isArray(expected)) {
            expected = [expected];
        }
        let savedI;
        let startI = this.pos.i
        let endI = this.getEndOfLineI(this.pos.i-1)
        const re = new RegExp('^' + expected.map(e => escapeStringRegexp(e)).join('|'), 'i');
        // console.log(re);
        //const match = re.exec(this.text.substr(this.pos.i));
        const match = re.exec(this.text.substring(startI, endI+1));
        if (match !== null) {
            this.pos.i += match[0].length;
            savedI = this.pos.i;
            this.advanceWhitespace();
        }
        else {
            //const lines = [...this.text.substring(startI, savedI).matchAll(/\n/g)]
            let startline =this.getLine()
            throw new objects_1.ParserError(`expected '${expected.join(' or ')}' found '${this.getNextWord({ re: /^\S+/ })}' line: ${this.getLine()}`, new objects_1.OIRange(this.parent, startI, endI));
        }
        return savedI;
    }
    maybeWord(expected) {
        const word = this.text.substr(this.pos.i, expected.length);
        if (word.toLowerCase() === expected.toLowerCase()) {
            this.pos.i += word.length;
            this.advanceWhitespace();
        }
    }
    getType(parent, advanceSemicolon = true) {
        // getType returns arrays of OReads
        let type = '';
        const startI = this.pos.i;
        const tmp_text = this.text.substr(this.pos.i).replace(/(?<=\").*(?=\")/, match => ' '.repeat(match.length))
        const match = /;/.exec(tmp_text);
        if (!match) {
            throw new objects_1.ParserError(`could not find semicolon`, this.pos.getRangeToEndLine());
        }
        type = this.text.substr(this.pos.i, match.index);
        //this.checkTextForKeywords(type)
        let typename = type;
        this.pos.i += match.index;
        // while (this.text[this.pos.i].match(/[^;]/)) {
        //   type += this.text[this.pos.i];
        //   this.pos.i++;
        // }
        let defaultValueReads;
        let typeReads;
        if (type.includes("=>")){
            type = type.replace(/^.*?=>/g, "")
        }
        if (type.indexOf(':=') > -1) {
            const split = type.split(':=');
            if (split[1].includes("=>")){
                // instantiation using =>, so delete the arguments with the assignment
                const ssplit = split[1].split("(")
                ssplit[1]=ssplit[1].replace(/\w+\s*=>/g, "")
                defaultValueReads = this.extractReads(parent, ssplit[1], startI + type.indexOf(':=') + 2);
                for (const r of defaultValueReads){
                    const index = type.indexOf(r.text)
                    r.range.start.i = startI+index
                    r.range.end.i = r.range.start.i+ r.text.length
                }
                defaultValueReads.push(this.extractReads(parent, ssplit[0], startI + type.indexOf(':=') + 2))
            }
            else{
                defaultValueReads = this.extractReads(parent, split[1].trim(), startI + type.indexOf(':=') + 2);
                
            }
            typeReads = this.extractReads(parent, split[0].trim(), startI);
        }
        else {
            typeReads = this.extractReads(parent, type, startI);
        }
        if (advanceSemicolon) {
            this.expect(';');
            this.advanceWhitespace();
        }
        return {
            typeReads,
            defaultValueReads,
            typename
        };
    }
    extractReads(parent, text, i, asMappingName = false) {
        // returns an array of tokens
        return tokenizer_1.tokenizer.tokenize(text, parent.getRoot().libraries).filter(token => token.type === 'VARIABLE' || token.type === 'FUNCTION' || token.type === 'RECORD_ELEMENT' || token.type === 'FUNCTION_RECORD_ELEMENT').map(token => {
            let read;
            if (token.type === 'RECORD_ELEMENT' || token.type === 'FUNCTION_RECORD_ELEMENT') {
                read = new objects_1.OElementRead(parent, i + token.offset, i + token.offset + token.value.length, token.value);
            }
            else {
                if (asMappingName && !(parent instanceof objects_1.OMapping)) {
                    throw new Error();
                }
                    read = asMappingName ? new objects_1.OMappingName(parent, i + token.offset, i + token.offset + token.value.length, token.value) : new objects_1.ORead(parent, i + token.offset, i + token.offset + token.value.length, token.value);
            }
            return read;
        });
    }
    extractReadsOrWrite(parent, text, i) {
        const reads = [];
        const writes = [];
        let braceLevel = 0;
        const tokens = tokenizer_1.tokenizer.tokenize(text, parent.getRoot().libraries);
        let index = 0;
        for (const token of tokens) {
            // console.log(index, token);
            if (token.type === 'BRACE' && index > 0) {
                token.value === '(' ? braceLevel++ : braceLevel--;
            }
            else if (token.type === 'VARIABLE' || token.type === 'FUNCTION' || token.type === 'RECORD_ELEMENT' || token.type === 'FUNCTION_RECORD_ELEMENT') {
                if (braceLevel === 0 && !(token.type === 'RECORD_ELEMENT' || token.type === 'FUNCTION_RECORD_ELEMENT')) {
                    const write = new objects_1.OWrite(parent, i + token.offset, i + token.offset + token.value.length, token.value);
                    writes.push(write);
                }
                else {
                    let read;
                    if (token.type === 'RECORD_ELEMENT' || token.type === 'FUNCTION_RECORD_ELEMENT') {
                        read = new objects_1.OElementRead(parent, i + token.offset, i + token.offset + token.value.length, token.value);
                    }
                    else {
                        read = new objects_1.ORead(parent, i + token.offset, i + token.offset + token.value.length, token.value);
                    }
                    reads.push(read);
                }
            }
            if (token.type !== 'WHITESPACE') {
                index++;
            }
        }
        return [reads, writes];
    }
}
exports.ParserBase = ParserBase;
//# sourceMappingURL=parser-base.js.map
