"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objects_1 = require("./objects");
const process_like_parse_1 = require("./process-like-parse");
const decl_parser_1 = require("./declarative-part-parser");
class ProcessParser extends process_like_parse_1.ProcessLikeParser {
    constructor(text, pos, file, parent) {
        super(text, pos, file);
        this.parent = parent;
        this.debug(`start`);
    }
    parse(startI, label) {
        const process = new objects_1.OProcess(this.parent, startI, this.getEndOfLineI());
        if (this.text[this.pos.i] === '(') {
            this.expect('(');
            process.label = label;
            process.sensitivityList = this.advanceBrace();
        }
        this.maybeWord('is'); //  alias vvc_config : t_vvc_config is shared_gmii_vvc_config(GC_CHANNEL, GC_INSTANCE_IDX);

        let nextWord = this.getNextWord({ consume: false }).toLowerCase();
        while (nextWord !== 'begin') {
            if (['variable', 'file', 'alias', 'constant'].includes(nextWord)){
                const variable = new objects_1.OVariable(process, this.pos.i, this.getEndOfLineI());
                variable.constant = nextWord === 'constant';
                const alias = this.getNextWord({ consume: false }).toLowerCase() === 'alias';
                this.expect(['variable', 'file', 'alias', 'constant']);
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
                    variable.isAlias = true;
                    variable.definition = this.parent 
                    variable.range.end.i = this.getEndOfLineI()
                }
                else {
                    this.expect(':');
                    const startType = this.pos.i;
                    const { typeReads, defaultValueReads, typename } = this.getType(variable);
                    variable.type = typeReads;
                    variable.defaultValue = defaultValueReads;
                    // for (const multiSignalName of multiSignals) {
                    //   const multiSignal = new OVariable(process, -1, -1);
                    //   Object.assign(variable, multiSignal);
                    //   multiSignal.name = multiSignalName;
                    //   process.variables.push(multiSignal);
                    // }
                }
                process.variables.push(variable);
                multiSignals = [];
            }
            else if (["procedure", "function", "impure"].includes(nextWord)){
                const procedureParser = new decl_parser_1.DeclarativePartParser(this.text, this.pos, this.file, this.parent);
                procedureParser.parse(false, 'end', true)
                for (let f of process.procedures){
                    f.definition = this.parent
                    //console.log("add procedure "+f.name.text+ " " + f.definition[0])
                }
                for (const f of process.functions){
                    f.definition = this.parent
                    //console.log("add function "+f.name.text+" " +f.definition[0])
                }
            }
            else{
                console.log("************ Don't know what to do with "+this.text.substring(this.pos.i, this.pos.i+100))
                //throw new Error("Don't know what to do with "+this.text.substring(this.pos.i, this.pos.i+100))
                this.advanceSemicolon(true);
            }
            nextWord = this.getNextWord({ consume: false }).toLowerCase();
        }
        this.expect('begin');
        process.statements = this.parseStatements(process, ['end']);
        this.expect('end');
        this.expect('process');
        if (label) {
            this.maybeWord(label);
        }
        process.range.end.i = this.pos.i;
        this.expect(';');
        return process;
    }
}
exports.ProcessParser = ProcessParser;
//# sourceMappingURL=process-parser.js.map
