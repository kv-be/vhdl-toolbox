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
                // add an attribute object and store the different types
                const start = this.pos.i
                this.getNextWord(); // consume attribute
                let startName = this.pos.i
                const type = this.getNextWord() // consume the attribute name
                if (this.text[this.pos.i] === ":"){
                    const att = new objects_1.OAttributeDef(this.parent, start, this.getEndOfLineI())
                    att.name = new objects_1.OName(this.parent, startName, this.pos.i)
                    att.name.text = type;
                    att.definition =  this.parent
                    this.advanceSemicolon()
                    if (!this.parent.attribute_defs) this.parent.attribute_defs=[]
                    this.parent.attribute_defs.push(att)
                }else{
                    this.expect("of")
                    const att = new objects_1.OAttribute(this.parent, startName, this.pos.i)
                    att.name = new objects_1.OName(this.parent, startName, this.pos.i)
                    att.name.text = type
                    att.text = this.text.substring(start, this.getEndOfLineI())
                    startName = this.pos.i
                    att.type = this.getNextWord()

                    const reads = this.extractReads(this.parent, att.type, startName)
                    if (reads){
                        att.type = reads[0]
                    }
                    this.advanceSemicolon()
                    if (!this.parent.attributes) this.parent.attributes = []
                    this.parent.attributes.push(att)   
                }
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
                alias.isAlias = true
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
                const startI = this.pos.i
                this.getNextWord();
                const procedureParser = new procedure_parser_1.ProcedureParser(this.text, this.pos, this.file, this.parent);
                this.parent.procedures.push(procedureParser.parse(startI));
            }
            else if (nextWord === 'impure' ||nextWord === 'pure' || nextWord === 'function') {
                if ((nextWord === 'impure')||(nextWord === 'pure')) {
                    this.getNextWord();
                }
                const startI = this.pos.i
                this.getNextWord();
                const procedureParser = new procedure_parser_1.ProcedureParser(this.text, this.pos, this.file, this.parent, true);
                const func = procedureParser.parse(startI)
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
            else if (nextWord === 'file') {
                if (!this.allowFile){
                    let scope = this.parent.constructor.name.substring(1)
                    throw new objects_1.ParserError(`No file declaration expected in current scope ${scope} ";"`, new objects_1.OIRange(this.parent, this.pos.i, this.pos.i+this.text.substring(start).search(/\n/)));                                            
                }
                const startI = this.pos.i
                this.getNextWord() // consume the file
                let signal = new objects_1.OSignal(this.parent, startI, this.getEndOfLineI()); // startI makes that the signal, variable, constant is part of the declaration
                signal.constant = true;
                signal.name = new objects_1.OName(signal, startI, this.pos.i);
                signal.name.text = this.getNextWord();
                signal.name.range.end.i = signal.name.range.start.i + signal.name.text.length;
                signal.definition = this.parent
                if (this.parent.variables) this.parent.variables.push(signal)
                else if (this.parent.signals) this.parent.signals.push(signal)
                else if (this.parent.constants) this.parent.constants.push(signal)
                else throw new objects_1.ParserError(`No place found for file `, new objects_1.OIRange(this.parent, this.pos.i, this.pos.i+this.text.substring(start).search(/\n/)));                                            
                //this.parent.constants.push(signal);
                this.advanceSemicolon();
            }
            else if (nextWord === 'generic') {
                if ((!this.allowGeneric) && (nextWord === 'generic')) {
                    let scope = this.parent.constructor.name.substring(1)
                    throw new objects_1.ParserError(`Word generic is not expected in current scope ${scope} ";"`, new objects_1.OIRange(this.parent, this.pos.i, this.pos.i+this.text.substring(this.pos.i).search(/\n/)));                                            
                }
                const savedI = this.pos.i
                this.getNextWord()
                if (!this.generics) this.generics=[]
                this.parsePortsAndGenerics( true, this.parent);
                this.parent.genericRange = new objects_1.OIRange(this.parent, savedI, this.pos.i);
                this.expectDirectly(';');
            }
            else if (nextWord === 'use') {
                this.getNextWord()
                const usestat = this.getUseStatement(this.parent);
                if (!this.parent.useStatements){
                    this.parent.useStatements = []
                }
                this.parent.useStatements.push(usestat)
                this.expect(';');
            }
            else if (nextWord === 'disconnect'){
                this.getNextWord()
                const signal_name = this.getNextWord()
                this.expect(":")
                const type = this.getNextWord()
                this.expect("after")
                const st = this.pos.i
                let def = this.advanceSemicolon()
                def = this.extractReads(this.parent, def, st)
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
                    this.expect(':')
                    let start = this.pos.i
                    let def = this.advanceFinalSemicolon();
                    def = this.extractReads(this.parent, def, start) // to push the definition on the object list
                    child.range.end.i = this.pos.i;
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
                    else if (protectedWord === 'impure' || protectedWord === 'pure' || protectedWord === 'function') {
                        if ((protectedWord === 'impure') || (protectedWord === 'pure')) {
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
            
            const st = this.pos.i
            let def = this.advancePast(';', {"allowKeywords": false});
            def = this.extractReads(this.parent, def, st) // just to be sure the definitions are pushed to the object stack
            
            type.range.end.i = this.pos.i-1;

            if (!isBody) return type //this.parent.types.push(type);
            else return 
            isBody = false
        }
        
    }



}
exports.DeclarativePartParser = DeclarativePartParser;
//# sourceMappingURL=declarative-part-parser.js.map