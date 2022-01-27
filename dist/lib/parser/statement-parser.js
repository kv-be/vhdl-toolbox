"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_base_1 = require("./parser-base");
const objects_1 = require("./objects");
const process_parser_1 = require("./process-parser");
const assignment_parser_1 = require("./assignment-parser");
const instantiation_parser_1 = require("./instantiation-parser");
const architecture_parser_1 = require("./architecture-parser");
const { throws } = require("assert");
var StatementTypes;
(function (StatementTypes) {
    StatementTypes[StatementTypes["Process"] = 0] = "Process";
    StatementTypes[StatementTypes["ProcedureInstantiation"] = 1] = "ProcedureInstantiation";
    StatementTypes[StatementTypes["Generate"] = 2] = "Generate";
    StatementTypes[StatementTypes["Assignment"] = 3] = "Assignment";
    StatementTypes[StatementTypes["Assert"] = 4] = "Assert";
    StatementTypes[StatementTypes["Block"] = 5] = "Block";
})(StatementTypes = exports.StatementTypes || (exports.StatementTypes = {}));
class StatementParser extends parser_base_1.ParserBase {
    constructor(text, pos, file, parent) {
        super(text, pos, file);
        this.parent = parent;
        this.debug('start');
    }
    parse(allowedStatements, previousArchitecture) {
        //console.log("** starting statement parser")
        let nextWord = this.getNextWord({ consume: false }).toLowerCase();
        let label;
        const savedI = this.pos.i;
        const regex = new RegExp(`^${nextWord}\\s*:`, 'i');
        if (this.text.substr(this.pos.i).match(regex)) {
            //console.log("**   component found")
            label = this.getNextWord();
            this.debug('parse label ' + label);
            this.pos.i++;
            this.advanceWhitespace();
            nextWord = this.getNextWord({ consume: false }).toLowerCase();
        }

        if (((nextWord === 'process') || (nextWord === 'postponed')) && allowedStatements.includes(StatementTypes.Process)) {
            //console.log("**   process found")
            if (nextWord === 'postponed') {
                this.expect("postponed")
                this.expect("process")
            }
            else this.getNextWord(); // consume process
            const processParser = new process_parser_1.ProcessParser(this.text, this.pos, this.file, this.parent);
            this.parent.statements.push(processParser.parse(savedI, label));
            this.advanceWhitespace();
        }
        else if (nextWord === 'block' && allowedStatements.includes(StatementTypes.Block)) {
            //console.log("**   block found")
            this.getNextWord();
            this.debug('parse block');
            const subarchitecture = new architecture_parser_1.ArchitectureParser(this.text, this.pos, this.file, this.parent, label);
            const block = subarchitecture.parse(true, 'block');
            block.label = label !== null && label !== void 0 ? label : 'no label';
            block.range.start.i = savedI;
            this.reverseWhitespace();
            block.range.end.i = this.pos.i;
            this.advanceWhitespace();
            //        console.log(generate, generate.constructor.name);
            this.parent.statements.push(block);
        }
        else if (nextWord === 'for' && allowedStatements.includes(StatementTypes.Generate)) {
            //console.log("**   for found")
            this.getNextWord();
            this.debug('parse for generate');
            const startI = this.pos.i;
            let variable = this.advancePast(/\bin\b/i);
            let start = this.advancePast(/\b(to|downto|range|reverse_range)\b/i);
            let end = this.advancePast(/\bgenerate\b/i);
            const subarchitecture = new architecture_parser_1.ArchitectureParser(this.text, this.pos, this.file, this.parent, label);
            const generate = subarchitecture.parse(true, 'generate', { variable, start, end, startPosI: startI });
            generate.range.start.i = savedI;
            this.reverseWhitespace();
            generate.range.end.i = this.pos.i;
            this.advanceWhitespace();
            //        console.log(generate, generate.constructor.name);
            this.parent.statements.push(generate);
        }
        else if (nextWord === 'if' && allowedStatements.includes(StatementTypes.Generate)) {
            //console.log("**   if found")
            const ifGenerate = new objects_1.OIfGenerate(this.parent, this.pos.i, this.pos.i);
            this.getNextWord();
            let conditionI = this.pos.i;
            let condition = this.advancePast(/\bgenerate\b/i);
            this.debug('parse if generate ' + label);
            const subarchitecture = new architecture_parser_1.ArchitectureParser(this.text, this.pos, this.file, ifGenerate, label);
            const ifGenerateClause = subarchitecture.parse(true, 'generate', null,  label);
            ifGenerateClause.range.start.i = savedI;
            if (ifGenerateClause.conditions) {
                ifGenerateClause.conditions = [condition].concat(ifGenerateClause.conditions);
                ifGenerateClause.conditionReads = this.extractReads(ifGenerateClause, condition, conditionI).concat(ifGenerateClause.conditionReads);
            }
            else {
                ifGenerateClause.conditions = [condition];
                ifGenerateClause.conditionReads = this.extractReads(ifGenerateClause, condition, conditionI);
            }
            ifGenerate.ifGenerates.push(ifGenerateClause);
            this.parent.statements.push(ifGenerate);
            this.reverseWhitespace();
            ifGenerate.range.end.i = this.pos.i;
            ifGenerateClause.range.end.i = this.pos.i;
            this.advanceWhitespace();
        }
        else if (nextWord === 'elsif' && allowedStatements.includes(StatementTypes.Generate)) {
            //console.log("**   elsif found")
            if (!(this.parent instanceof objects_1.OIfGenerateClause)) {
                throw new objects_1.ParserError('elsif generate without if generate', this.pos.getRangeToEndLine());
            }
            if (!previousArchitecture) {
                throw new objects_1.ParserError('WTF', this.pos.getRangeToEndLine());
            }
            previousArchitecture.range.end.line = this.pos.line - 1;
            previousArchitecture.range.end.character = 999;
            let conditionI = this.pos.i;
            let condition = this.advancePast(/\bgenerate\b/i);
            this.debug('parse elsif generate ' + label);
            const subarchitecture = new architecture_parser_1.ArchitectureParser(this.text, this.pos, this.file, this.parent.parent, previousArchitecture.name);
            const ifGenerateObject = subarchitecture.parse(true, 'generate', null, previousArchitecture.name);
            ifGenerateObject.range.start.i = savedI;
            if (ifGenerateObject.conditions) {
                ifGenerateObject.conditions = [condition].concat(ifGenerateObject.conditions);
                ifGenerateObject.conditionReads = this.extractReads(ifGenerateObject, condition, conditionI).concat(ifGenerateObject.conditionReads);
            }
            else {
                ifGenerateObject.conditions = [condition];
                ifGenerateObject.conditionReads = this.extractReads(ifGenerateObject, condition, conditionI);
            }
            this.parent.parent.ifGenerates.push(ifGenerateObject);
            return true;
        }
        else if (nextWord === 'else' && allowedStatements.includes(StatementTypes.Generate)) {
            //console.log("**   else found")
            if (!(this.parent instanceof objects_1.OIfGenerateClause)) {
                throw new objects_1.ParserError('elsif generate without if generate', this.pos.getRangeToEndLine());
            }
            if (!previousArchitecture) {
                throw new objects_1.ParserError('WTF', this.pos.getRangeToEndLine());
            }
            previousArchitecture.range.end.line = this.pos.line - 1;
            previousArchitecture.range.end.character = 999;
            this.advancePast(/\bgenerate\b/i);
            this.debug('parse else generate ' + label);
            const subarchitecture = new architecture_parser_1.ArchitectureParser(this.text, this.pos, this.file, this.parent.parent, previousArchitecture.name);
            const ifGenerateObject = subarchitecture.parse(true, 'generate',null,  previousArchitecture.name);
            ifGenerateObject.range.start.i = savedI;
            this.reverseWhitespace();
            ifGenerateObject.range.end.i = this.pos.i;
            this.advanceWhitespace();
            this.parent.parent.elseGenerate = ifGenerateObject;
            return true;
            // this.getNextWord();
            // if (!(this.parent instanceof OArchitecture)) {
            //   throw new ParserError('Found Else generate without preceding if generate', this.pos.i);
            // }
            // this.debug('parse else generate ' + this.name);
            // this.advancePast(/\bgenerate\b/i);
        }
        else if (nextWord === 'with' && allowedStatements.includes(StatementTypes.Assignment)) {
            this.getNextWord();
            const beforeI = this.pos.i;
            const readText = this.advancePast(/\bselect\b/);
            const afterI = this.pos.i;

            const assignmentParser = new assignment_parser_1.AssignmentParser(this.text, this.pos, this.file, this.parent);
            const assignment = assignmentParser.parse();
            //const read = new objects_1.ORead(assignment, beforeI, afterI, readText);
            assignment.reads =assignment.reads.concat(this.extractReads(assignment, readText, beforeI)) 
            this.parent.statements.push(assignment);
        }
        else if (nextWord === 'assert' && allowedStatements.includes(StatementTypes.Assert)) {
            this.parent.statements.push(this.parse_assert(this.parent));
        }
        else if (nextWord === 'wait' && allowedStatements.includes(StatementTypes.Assert)) {
            this.parent.statements.push(this.parse_wait(this.parent));
        }
//        else if (this.test(/^\w+\s*\([^<]*;/) && allowedStatements.includes(StatementTypes.ProcedureInstantiation)) {
        else if (this.test(/^\w*\.*\w*\.*\w+\s*\([\s\S\n]+?\)\s*;/) && allowedStatements.includes(StatementTypes.ProcedureInstantiation)) {
            let text = this.text.substr(this.pos.i).match(/^\w*\.*\w*\.*\w+\s*\([\s\S\n]+?\)\s*;/)[0].replace(/".*?"/, '"string"')
            text = text.replace(/\([^\)]*?\)/, "\(stuff\)")
            if (text.search(/<=|:=/)>-1){
                // assignment
                const assignmentParser = new assignment_parser_1.AssignmentParser(this.text, this.pos, this.file, this.parent);
                const assignment = assignmentParser.parse();
                this.parent.statements.push(assignment);        
                
            } else{
                const first = nextWord
                let tmp = false
                do{
                    tmp = this.test(/^\w+\./)
                    if (tmp){
                        this.getNextWord()
                        this.expect(".")
                    }
                }
                while (tmp)
                const procedureInstantiation = new objects_1.OProcedureInstantiation(this.parent, this.pos.i, this.pos.i);
                procedureInstantiation.name = this.getNextWord();
                this.expect('(');
                const startI = this.pos.i;
                const text = this.advanceBrace()
                if (text.includes("=>")){
                    this.text.replace(/^.*?=>/g, "")
                }
                procedureInstantiation.tokens = this.extractReads(procedureInstantiation, text, startI);
                procedureInstantiation.range.end.i = this.pos.i;
                this.parent.statements.push(procedureInstantiation);
                this.expect(';');    
            }
        }
        else if (allowedStatements.includes(StatementTypes.Assignment)) { // TODO  others
            let text = this.advanceSemicolon(false, false); // we don't care about braces, so we can detect a badly placed ; easier!
            //let text = this.advanceSemicolon(true, false);
            text =  text.replace(/\([^\)]*?\)/g, "\(stuff\)")
            text =  text.replace(/".+?"/g, match => "S".repeat(match.length))
            
            if (text.match(/[\w\d\('\)]+\s*[<:]*=\s*[\w\d\('\)]+/)){ // made the : and < optional to detect common mistake a = 6 iso a <= 6
            // assignment foun>
                const assignmentParser = new assignment_parser_1.AssignmentParser(this.text, this.pos, this.file, this.parent);
                const assignment = assignmentParser.parse();
                this.parent.statements.push(assignment);        
            }
            else{
                // instantiation
                this.getNextWord() // consume the current nextWord
                const instantiationParser = new instantiation_parser_1.InstantiationParser(this.text, this.pos, this.file, this.parent);
                this.parent.statements.push(instantiationParser.parse(nextWord, label, savedI));    
            }

/*            if (label) {
                  const instantiationParser = new instantiation_parser_1.InstantiationParser(this.text, this.pos, this.file, this.parent);
                    this.parent.statements.push(instantiationParser.parse(nextWord, label, savedI));    
                //}
            }
            else { // statement;
                //console.log("**   statement found"+ this.text.substring(this.pos.i, this.pos.i+100))                
                const assignmentParser = new assignment_parser_1.AssignmentParser(this.text, this.pos, this.file, this.parent);
                const assignment = assignmentParser.parse();
                this.parent.statements.push(assignment);
            }*/
        }
        else {
            throw new objects_1.ParserError(`Unexpected Statement`, this.pos.getRangeToEndLine());
        }
        //console.log("** Ending statement parser")
        return false;
    }
    parseWait(parent) {
        this.expect('wait');
        let nextWord = this.getNextWord({ consume: false });
        if (['until', 'on', 'for'].indexOf(nextWord.toLowerCase()) > -1) {
            this.getNextWord();
            let assignment = new objects_1.OAssignment(parent, this.pos.i, this.getEndOfLineI());
            let rightHandSideI = this.pos.i;
            const rightHandSide = this.advanceSemicolon();
            assignment.reads.push(...this.extractReads(assignment, rightHandSide, rightHandSideI));
            assignment.range.end.i = this.pos.i;
            return assignment;
        }
        else {
            this.expect(';');
            let assignment = new objects_1.OAssignment(parent, this.pos.i, this.getEndOfLineI());
            return assignment;
        }
    }

}
exports.StatementParser = StatementParser;
//# sourceMappingURL=statement-parser.js.map