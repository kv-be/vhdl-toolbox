"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const declarative_part_parser_1 = require("./declarative-part-parser");
const objects_1 = require("./objects");
const process_like_parse_1 = require("./process-like-parse");
class ProcedureParser extends process_like_parse_1.ProcessLikeParser {
    constructor(text, pos, file, parent, is_function=false) {
        super(text, pos, file);
        this.parent = parent;
        this.debug(`start`);
        this.is_function = is_function
    }
    parse(startI, label) {
        let beforeNameI = this.pos.i;
        let name
        let procedure
        /*let firstWord = this.getNextWord()
        if (firstWord === "impure")  firstWord = this.getNextWord()
        
        if (firstWord === "procedure"){*/
        if (!this.is_function) {
            name = this.getNextWord();
            procedure = new objects_1.OProcedure(this.parent, startI, this.getEndOfLineI());
        }
        else{
            name = this.advancePast(/^(\w+|"[^"]+")/, { returnMatch: true });
            procedure = new objects_1.OFunction(this.parent,  startI, this.getEndOfLineI());
        }
        procedure.name = new objects_1.OName(procedure, beforeNameI, beforeNameI + name.length);
        procedure.name.text = name;
        //console.log("name = "+procedure.name.text)
        if (this.text[this.pos.i] === '(') {
            // this.expect('(');
            this.parsePortsAndGenerics(false, procedure);
        }
        else {
            procedure.parameter = '';
        }
        if (this.is_function){
            this.expect("return")
            const type = this.getNextWord()
        }

        let nextWord = this.getNextWord({ consume: false });
        procedure.range.end.i = this.pos.i;
        if (nextWord === 'is') {
            this.expect('is');
            // debugger;
            nextWord = this.getNextWord({ consume: false }).toLowerCase();
            new declarative_part_parser_1.DeclarativePartParser(this.text, this.pos, this.file, procedure).parse();
            /*while (nextWord !== 'begin') {
                if (['variable', 'constant', 'file', 'alias'].includes(nextWord)){
                    this.expect(['variable', 'constant', 'file', 'alias']);
                    const variable = new objects_1.OVariable(procedure, this.pos.i, this.getEndOfLineI());
                    variable.constant = nextWord.toLowerCase() === 'constant';
                    const alias = this.getNextWord({ consume: false }).toLowerCase() === 'alias';
                    const startI = this.pos.i;
                    const name = this.getNextWord();
                    variable.name = new objects_1.OName(variable, startI, startI + name.length);
                    variable.name.text = name;
                    let multiSignals = []; // TODO: Fix this!!
                    if (this.text[this.pos.i] === ',') {
                        // multiSignals.push(name);
                        this.expect(',');
                        continue;
                    }
                    if (alias) {
                        //ALIAS std_bit IS STD.STANDARD.BIT ;
                        //alias std_bit : bit is STD.STANDARD.BIT ;
                        let next = this.text[this.pos.i]
                        if (next === ":"){ // VHDL2008 allows indicating a subtype 
                            let subtype = this.advancePast("is")
                        }
                        else this.expect("is");
                        const type = this.getNextWord()
                        this.advanceSemicolon(true);
                        variable.type = type;
                        variable.definition = this.parent 
                        variable.range.end.i = this.getEndOfLineI()
                    }
                    else {
                        this.expect(':');
                        const startType = this.pos.i;
                        const { typeReads, defaultValueReads, typename } = this.getType(variable);
                        variable.type = typeReads;
                        variable.typename = typename
                        variable.definition = this.parent 
                        variable.defaultValue = defaultValueReads;
                    }
                    procedure.variables.push(variable);
                }
                else if (nextWord === 'procedure') {
                    this.getNextWord();
                    const procedureParser = new ProcedureParser(this.text, this.pos, this.file, this.parent);
                    procedure.procedures.push(procedureParser.parse(this.pos.i));
                }
                else if (nextWord === 'impure' || nextWord === 'function') {
                    if (nextWord === 'impure') {
                        this.getNextWord();
                    }
                    this.getNextWord();
                    const procedureParser = new ProcedureParser(this.text, this.pos, this.file, this.parent, true);
                    procedure.functions.push(procedureParser.parse(this.pos.i));
                }
                nextWord = this.getNextWord({ consume: false }).toLowerCase();
            }*/
            this.expect('begin');
            procedure.statements = this.parseStatements(procedure, ['end']);
            this.expect('end');

            if (this.is_function){
                this.maybeWord('function');
            }
            else{
                this.maybeWord('procedure');
            }
            //console.log("name = "+procedure.name.text)
            this.maybeWord(procedure.name.text);
            procedure.definition = this.parent;
        }
        const end = new objects_1.OI(this.parent, this.pos.i)
        this.expect(';');
        //end.line -=1
        let start = new objects_1.OI(this.parent, procedure.range.start.i)
        procedure.range = new objects_1.OIRange(this.parent, start, end)
        return procedure;
    }
}
exports.ProcedureParser = ProcedureParser;
//# sourceMappingURL=procedure-parser.js.map
