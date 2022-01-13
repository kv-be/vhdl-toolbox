"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_base_1 = require("./parser-base");
const objects_1 = require("./objects");
const subtype_parser_1 = require("./subtype-parser");
const procedure_parser_1 = require("./procedure-parser");
const package_parser_1 = require("./package-parser");
class DeclarativePartParser extends parser_base_1.ParserBase {
    constructor(text, pos, file, parent) {
        super(text, pos, file);
        this.parent = parent;
        this.debug('start');
        this.allowSignals = false
        this.allowComponents = false
        this.allowFile = true
        this.allowGeneric = false
        this.allowPackage = false
        if ((this.parent instanceof objects_1.OArchitecture)||(this.parent instanceof objects_1.OPackage)){
            this.allowComponents = true
            this.allowSignals = true
        } 
        if (this.parent instanceof objects_1.OEntity) this.allowComponents = false
        if ((this.parent instanceof objects_1.OEntity) || (this.parent instanceof objects_1.OPackage)) this.allowGeneric = true
        if (this.parent instanceof objects_1.OPackage) this.allowPackage = true
        if (this.parent instanceof objects_1.OPackageBody) this.allowPackage = true
        //if (this.parent instanceof objects_1.OFunction) this.allowPackage = true
        //if (this.parent instanceof objects_1.OProcedure) this.allowPackage = true
        
    }

    getRoot() {
        if (this.root) {
            return this.root;
        }
        let parent = this;
        while ((parent instanceof objects_1.OFile) === false) {
            parent = parent.parent;
        }
        this.root = parent;
        return parent;
    }

    getUseStatement(parent) {
        let useStatement = new objects_1.OUseStatement(parent, this.pos.i, this.getEndOfLineI());
        useStatement.begin = this.pos.i;
        useStatement.text = '';
        while (this.text[this.pos.i].match(/[\w.]/)) {
            useStatement.text += this.text[this.pos.i];
            this.pos.i++;
        }
        useStatement.end = useStatement.begin + useStatement.text.length;
        this.advanceWhitespace();
        return useStatement;
    }

    checkDeclarativeKeywords(text){
        const keywords = ["\\n\\s*signal\\b","\\n\\s*process\\b", "\\n\\s*type\\b","\\n\\s*constant\\b","\\n\\s*function\\b","\\n\\s*procedure\\b","\\n\\s*record\\b",  "\\n\\s*component\\b", "\\n\\s*entity\\b", "^\\n\\s*package"]
        //console.log("checking keywords in "+text)
        for (const k of keywords){
            if (text.search(new RegExp(k, "gi"))>-1){
                //console.log("-- problem found")
                return true
                break;
            }
        }        
        return false
    }


    parse(optional = false, lastWord = 'begin', single_thing = false) {
        //console.log('** starting declarative parser')
        let nextWord = this.getNextWord({ consume: false }).toLowerCase();
        while (true){ 
            
            // stop conditions: or a word, or a single letter (e.g. ')' for generic parts)
            if (lastWord.length >1) {
                nextWord = this.getNextWord({ consume: false }).toLowerCase();
                if (nextWord === lastWord) break;
            } 
            else if ((this.text[this.pos.i]===lastWord[0])&& (lastWord.length === 1)) break;

            if (nextWord === 'signal' || nextWord === 'constant' || nextWord === 'shared' || nextWord === 'variable') {
                const signals = this.parse_signals(nextWord, this.parent)
                if (this.parent instanceof objects_1.OPackage || this.parent instanceof objects_1.OPackageBody) {
                    this.parent.constants.push(...signals);
                }
                else if (this.parent instanceof objects_1.OProcedure || this.parent instanceof objects_1.OFunction){
                    this.parent.variables.push(...signals);
                }else {
                    this.parent.signals.push(...signals);
                }
        
            }
            else if (nextWord === 'attribute') { // also in entities!!
                this.getNextWord();
                this.advanceSemicolon(true);
            }
            else if (nextWord === 'type') {
                const type = this.parse_type()
                if (type) this.parent.types.push(type);

            }
            else if (nextWord === 'subtype') {
                const subtypeParser = new subtype_parser_1.SubtypeParser(this.text, this.pos, this.file, this.parent);
                const type = subtypeParser.parse();
                this.parent.types.push(type);
            }
            else if (nextWord === 'alias') {                    //ALIAS std_bit IS STD.STANDARD.BIT ;
                const alias = new objects_1.OSignal(this.parent, this.pos.i, this.getEndOfLineI());
                this.getNextWord()
                const startI = this.pos.i;
                const name = this.getNextWord();
                alias.name = new objects_1.OName(alias, startI, startI + name.length);
                alias.name.text = name;
                alias.definition = this.parent;
                alias.range.end.i = this.getEndOfLineI()
                if (this.parent.signals){
                    this.parent.signals.push(alias)                
                } 
                if (this.parent.variables) {
                    this.parent.variables.push(alias)                
                }   
                if (this.parent.constants) {
                    this.parent.constants.push(alias)                
                }   
                this.advanceSemicolon(true);
            }
            else if (nextWord === 'component') {
                let start = this.pos.i
                this.getNextWord();
                const componentName = this.getNextWord();
                if (!this.allowComponents){
                    let scope = this.parent.constructor.name.substring(1)
                    throw new objects_1.ParserError(`No component declaration expected in current scope ${scope} ";"`, new objects_1.OIRange(this.parent, start, start+this.text.substring(start).search(/\n/)));                                            
                }

                let bodystart = this.pos.i
                this.advancePast(/\bend\b/i, { allowSemicolon: true });
                if (this.checkDeclarativeKeywords(this.text.substring(bodystart, this.pos.i))){
                    throw new objects_1.ParserError(`component declaration not fully correct.`, new objects_1.OIRange(this.parent, bodystart, bodystart + this.text.substring(bodystart).search(/\n/)));                    
                }
                this.maybeWord('component');
                this.maybeWord(componentName);
                this.expect(';');
            }
            else if (nextWord === 'procedure') {
                this.getNextWord();
                const procedureParser = new procedure_parser_1.ProcedureParser(this.text, this.pos, this.file, this.parent);
                this.parent.procedures.push(procedureParser.parse(this.pos.i));
            }
            else if (nextWord === 'impure' || nextWord === 'function') {
                if (nextWord === 'impure') {
                    this.getNextWord();
                }
                this.getNextWord();
                const procedureParser = new procedure_parser_1.ProcedureParser(this.text, this.pos, this.file, this.parent, true);
                const func = procedureParser.parse(this.pos.i)
                this.parent.functions.push(func);

            }
            else if (optional) return
            else if (nextWord === 'package' ) {
                if ((!this.allowPackage) && (nextWord === 'package')) {
                    let scope = this.parent.constructor.name.substring(1)
                    throw new objects_1.ParserError(`Word package is not expected in current scope ${scope} ";"`, new objects_1.OIRange(this.parent, this.pos.i, this.pos.i+this.text.substring(this.pos.i).search(/\n/)));
                }
                this.getNextWord()
                const packageParser = new package_parser_1.PackageParser(this.text, this.pos, this.file, this.onlyDeclarations);
                const pack = packageParser.parse(this.getRoot())
                if (pack){
                    if (!this.parent.packages){
                        this.parent.packages = []
                    }
                    this.parent.packages.push(pack)
                }
                this.advanceSemicolon();
            }
            else if (nextWord === 'file'|| nextWord === 'generic') {
                if (!this.allowFile){
                    let scope = this.parent.constructor.name.substring(1)
                    throw new objects_1.ParserError(`No file declaration expected in current scope ${scope} ";"`, new objects_1.OIRange(this.parent, start, start+this.text.substring(start).search(/\n/)));                                            
                }
                if ((!this.allowGeneric) && (nextWord === 'generic')) {
                    let scope = this.parent.constructor.name.substring(1)
                    throw new objects_1.ParserError(`Word package is not expected in current scope ${scope} ";"`, new objects_1.OIRange(this.parent, this.pos.i, this.pos.i+this.text.substring(this.pos.i).search(/\n/)));                                            
                }
                this.advanceSemicolon();
            }
            else if (nextWord === 'use') {
                this.getNextWord()
                const usestat = this.getUseStatement(this.parent);
                if (!this.parent.useStatements){
                    this.parent.useStatements = []
                }
                this.parent.useStatements = usestat
                this.expect(';');
            }
           else {
                throw new objects_1.ParserError(`Unknown Ding: '${nextWord}' on line ${this.getLine()}`, this.pos.getRangeToEndLine());
                this.getNextWord();
            }
            if (single_thing) break;
        }
        //console.log('** Ending declarative parser')
    }
    parse_type(){
        const type = new objects_1.OType(this.parent, this.pos.i, this.getEndOfLineI());
        this.getNextWord();
        const startTypeName = this.pos.i;
        const typeName = this.getNextWord();
        let isBody = false
        type.name = new objects_1.OName(type, startTypeName, startTypeName + typeName.length + 1);
        type.name.text = typeName;
        this.expect('is');
        if (this.text[this.pos.i] === '(') {
            this.expect('(');
            let position = this.pos.i;
            Object.setPrototypeOf(type, objects_1.OEnum.prototype);
            type.states = this.advancePast(')').split(',').map(stateName => {
                const state = new objects_1.OState(type, position, this.getEndOfLineI(position));
                const match = stateName.match(/^\s*/);
                if (!match) {
                    throw new objects_1.ParserError(`Error while parsing state`, this.pos.getRangeToEndLine());
                }
                state.range.start.i = position + match[0].length;
                state.name = new objects_1.OName(state, position + match[0].length, position + match[0].length + stateName.trim().length);
                state.name.text = stateName.trim();
                state.range.end.i = state.range.start.i + state.name.text.length;
                position += stateName.length;
                position++;
                return state;
            });
            type.range.end.i = this.pos.i;
            this.expect(';');
            return type;
            //this.parent.types.push(type);
        }
        else if (this.test(/^[^;]*units/i)) {
            this.advancePast('units');
            type.units = [];
            type.units.push(this.getNextWord());
            this.advanceSemicolon();
            while (!this.test(/^end\s+units/i)) {
                type.units.push(this.getNextWord());
                this.advanceSemicolon();
            }
            this.expect('end');
            this.expect('units');
            type.range.end.i = this.pos.i;
            this.expect(';');
            return type 
            //this.parent.types.push(type);
        }
        else {
            const nextWord = this.getNextWord().toLowerCase();
            if (nextWord === 'record') {
                Object.setPrototypeOf(type, objects_1.ORecord.prototype);
                type.children = [];
                    let position = this.pos.i;
                let recordWord = this.getNextWord();
                while (recordWord.toLowerCase() !== 'end') {
                    const child = new objects_1.ORecordChild(type, position, position);
                    child.name = new objects_1.OName(child, position, position + recordWord.length);
                    child.name.text = recordWord;
                    type.children.push(child);
                    let start = this.pos.i
                    this.advanceFinalSemicolon();
                    child.range.end.i = this.pos.i;
                    //the following line checks if there are 2 colons in the text, assuming that 
                    // the types don't have a colon in its definition
                    if (this.text.substring(start+1, this.pos.i-1).search(/:/)>-1){
                        throw new objects_1.ParserError(`could not find ending ";"`, new objects_1.OIRange(this.parent, start, start+this.text.substring(start).search(/\n/)));                                            
                    }
                    position = this.pos.i;
                    recordWord = this.getNextWord();
                }
                this.maybeWord('record');
                this.maybeWord(type.name.text);
                this.advanceSemicolon(true);
                return type

            }else if (nextWord === 'protected') {
                Object.setPrototypeOf(type, objects_1.OProtected.prototype);
                type.functions = []
                type.procedures = []
                let position = this.pos.i;
                let protectedWord = this.getNextWord(/*{consume:false}*/);
                while (protectedWord.toLowerCase() !== 'end') {
                    if (protectedWord === 'procedure') {
                        const procedureParser = new procedure_parser_1.ProcedureParser(this.text, this.pos, this.file, this.parent);
                        type.procedures.push(procedureParser.parse(position));
                    }
                    else if (protectedWord === 'impure' || protectedWord === 'function') {
                        if (protectedWord === 'impure') {
                            this.getNextWord();
                        }
                        const procedureParser = new procedure_parser_1.ProcedureParser(this.text, this.pos, this.file, this.parent, true);
                        type.functions.push(procedureParser.parse(position));
                    }
                    else if (protectedWord === 'body') {
                        isBody = true
                        let end = this.text.substring(this.pos.i).search(/\s*end\s+protected\s+body/gi)
                        if (end === -1){

                        }
                        else{
                            this.pos.i = this.pos.i + end+1
                            this.advanceWhitespace()
                        }
                    }
                    position = this.pos.i;
                    protectedWord = this.getNextWord();
                }
                this.maybeWord('protected');
            }
            

            type.range.end.i = this.pos.i;
            this.advancePast(';', {"allowKeywords": false});

            if (!isBody) return type //this.parent.types.push(type);
            else return 
            isBody = false
        }
        
    }



}
exports.DeclarativePartParser = DeclarativePartParser;
//# sourceMappingURL=declarative-part-parser.js.map