"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assignment_parser_1 = require("./assignment-parser");
const objects_1 = require("./objects");
const parser_base_1 = require("./parser-base");
class ProcessLikeParser extends parser_base_1.ParserBase {
    parseStatements(parent, exitConditions) {
        const statements = [];
        while (this.pos.i < this.text.length) {
            let nextWord = this.getNextWord({ consume: false });
            let label;
            if (this.text.substr(this.pos.i + nextWord.length).match(/^\s*:(?!=)/)) {
                label = nextWord;
                this.getNextWord(); // consume label
                this.expect(':');
                nextWord = this.getNextWord({ consume: false });
            }
            const statementText = this.advanceSemicolon(true, { consume: false });
            if (nextWord.toLowerCase() === 'if') {
                statements.push(this.parseIf(parent, label));
            }
            else if (exitConditions.indexOf(nextWord.toLowerCase()) > -1) {
                break;
            }
            else if (nextWord.toLowerCase() === 'case') {
                this.getNextWord();
                statements.push(this.parseCase(parent, label));
            }
            else if (nextWord.toLowerCase() === 'for') {
                let stats = this.parseFor(parent, label)
                statements.push(stats);

            }
            else if (nextWord.toLowerCase() === 'report') {
                this.advancePast(';');
            }
            else if (nextWord.toLowerCase() === 'assert') {
                this.advancePast(';');
            }
            else if (nextWord.toLowerCase() === 'wait') {
                //statements.push(this.parseWait(parent));
                this.advancePast(';');
            }
            else if (nextWord.toLowerCase() === 'exit') {
                this.advancePast(';');
            }
            else if (nextWord.toLowerCase() === 'while') {
                statements.push(this.parseWhile(parent, label));
            }
            else if (nextWord.toLowerCase() === 'loop') {
                statements.push(this.parseWhile(parent, label, true));
            }
            else if (nextWord.toLowerCase() === 'return') {
                this.advancePast(';');
            }
            else if (nextWord.toLowerCase() === 'next') {
                this.advancePast(';');
            }
            else if (statementText.replace(/\([^\)]*?\)/, "\(stuff\)").match(/:=|<=/)){
                const assignmentParser = new assignment_parser_1.AssignmentParser(this.text, this.pos, this.file, parent);
                let stats = assignmentParser.parse()
                statements.push(stats);
            }
            else {
                statements.push(this.parseProcedureCall(parent));
            }
        }
        return statements;
    }
    parseProcedureCall(parent) {
        var _a, _b, _c, _d;
        const procedureCall = new objects_1.OProcedureCall(parent, this.pos.i, this.getEndOfLineI());
        procedureCall.procedureName = new objects_1.OName(procedureCall, this.pos.i, this.pos.i);
        procedureCall.procedureName.text = this.getNextWord();
        procedureCall.procedureName.range.end.i = procedureCall.procedureName.range.start.i + procedureCall.procedureName.text.length;
        while (this.text[this.pos.i] === '.') {
            this.expect('.');
            procedureCall.procedureName.range.start.i = this.pos.i;
            procedureCall.procedureName.text = this.getNextWord();
            procedureCall.procedureName.range.end.i = procedureCall.procedureName.range.start.i + procedureCall.procedureName.text.length;
        }
        if (this.text[this.pos.i] === '(') {
            procedureCall.portMap = new objects_1.OProcedureCallPortMap(procedureCall, this.pos.i, this.getEndOfLineI());
            this.expect('(');
            let startI = this.pos.i;
            let text = this.advanceBrace();
            procedureCall.portMap.range.end.i = this.pos.i;
            text = text.replace(/[x|b]{1}"[0-9A-Fa-f_]+"/g, match=> "3".repeat(match.length)) // filter out the hex/bin numbers
            
            text = text.replace(/(?<=").*?(?=")/g, match => " ".repeat(match.length))
            if (text.includes("=>")){ // replace the portnames with spaces
                text = text.replace(/.*?=>/g, match => " ".repeat(match.length))
            }
            const matches = text.matchAll(/([^,]*)(,|$)/g);
            for (const match of matches) {
                if (match[0]){
                    //("procinst " + match.toString()+ ", "+ match.index)
                    const map = new objects_1.OMapping(procedureCall.portMap, startI + ((_a = match.index) !== null && _a !== void 0 ? _a : 0), startI + ((_b = match.index) !== null && _b !== void 0 ? _b : 0) + match[1].length);
                    map.mappingIfInput = this.extractReads(map, match[1], startI + ((_c = match.index) !== null && _c !== void 0 ? _c : 0));
                    map.mappingIfOutput = this.extractReadsOrWrite(map, match[1], startI + ((_d = match.index) !== null && _d !== void 0 ? _d : 0));
                    procedureCall.portMap.children.push(map);    
                }
            }
            //console.log("procinst DONE")
        }
        procedureCall.range.end.i = this.pos.i;
        this.expect(';');
        return procedureCall;
    }
    parseWait(parent) {
        this.expect('wait');
        let nextWord = this.getNextWord({ consume: false });
        if (['until', 'on', 'for'].indexOf(nextWord.toLowerCase()) > -1) {
            this.getNextWord(); // until/for/on
            let assignment = new objects_1.OAssignment(parent, this.pos.i, this.pos.i + this.getEndOfLineI() );
            let rightHandSideI = this.pos.i;
            const rightHandSide = this.advanceFinalSemicolon();
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
    parseWhile(parent, label, isLoop=false) {
        const whileLoop = new objects_1.OWhileLoop(parent, this.pos.i, this.getEndOfLineI());
        if (!isLoop){
            this.expect('while');
            const startI = this.pos.i;
            const position = this.pos.i;    
            const condition = this.advancePast(/\bloop\b/, {returnMatch :false});
            whileLoop.conditionReads = this.extractReads(whileLoop, condition, position);
        }else{
            whileLoop.conditionReads = []
            const startI = this.pos.i;
            const position = this.pos.i;  
            this.getNextWord()  
        }
        whileLoop.statements = this.parseStatements(whileLoop, ['end']);
        this.expect('end');
        this.maybeWord('loop');
        if (label) {
            this.maybeWord(label);
        }
        this.expect(';');
        whileLoop.range.end = new objects_1.OI(this.parent, this.pos.i)
        whileLoop.range.end.line -=1        
        return whileLoop;
    }
    parseFor(parent, label) {
        const forLoop = new objects_1.OForLoop(parent, this.pos.i, this.getEndOfLineI());
        this.expect('for');
        const startI = this.pos.i;
        const variableName = this.getNextWord();
        forLoop.variable = new objects_1.OVariable(forLoop, startI, variableName.length + startI);
        forLoop.variable.name = new objects_1.OName(forLoop.variable, startI, variableName.length + startI);
        forLoop.variable.name.text = variableName;
        this.expect('in');
        // forLoop.start = this.getNextWord();
        forLoop.start = this.advancePast(/\b(?:downto|to|range)\b/i).trim();
        // this.expect(['downto', 'to']);
        forLoop.end = this.advancePast('loop').trim();
        forLoop.statements = this.parseStatements(forLoop, ['end']);
        this.expect('end');
        this.expect('loop');
        if (label) {
            this.maybeWord(label);
        }
        this.expect(';');
        forLoop.range.end = new objects_1.OI(this.parent, this.pos.i)
        forLoop.range.end.line -=1        
        return forLoop;
    }
    parseIf(parent, label) {
        this.debug(`parseIf`);
        const if_ = new objects_1.OIf(parent, this.pos.i, this.getEndOfLineI());
        const clause = new objects_1.OIfClause(if_, this.pos.i, this.getEndOfLineI());
        this.expect('if');
        const position = this.pos.i;
        clause.condition = this.advancePast('then');
        clause.conditionReads = this.extractReads(clause, clause.condition, position);

        clause.statements = this.parseStatements(clause, ['else', 'elsif', 'end']);
        clause.range.setEndBacktraceWhitespace(this.pos.i);
        if_.clauses.push(clause);
        let nextWord = this.getNextWord({ consume: false }).toLowerCase();
        while (nextWord === 'elsif') {
            const clause = new objects_1.OIfClause(if_, this.pos.i, this.getEndOfLineI());
            this.expect('elsif');
            const position = this.pos.i;
            clause.condition = this.advancePast('then');
            clause.conditionReads = this.extractReads(clause, clause.condition, position);
            clause.statements = this.parseStatements(clause, ['else', 'elsif', 'end']);
            clause.range.setEndBacktraceWhitespace(this.pos.i);
            if_.clauses.push(clause);
            nextWord = this.getNextWord({ consume: false }).toLowerCase();
        }
        if (nextWord === 'else') {
            this.expect('else');
            if_.else = new objects_1.OElseClause(if_, this.pos.i, this.pos.i);
            //console.log("parsing else statements")
            if_.else.statements = this.parseStatements(if_, ['end']);
            if_.else.range.setEndBacktraceWhitespace(this.pos.i);
        }
        this.expect('end');
        this.maybeWord('if');
        if (label) {
            this.maybeWord(label);
        }
        this.expect(';');
        return if_;
    }
    parseCase(parent, label) {
        this.debug(`parseCase ${label}`);
        const case_ = new objects_1.OCase(parent, this.pos.i, this.getEndOfLineI());
        const posI = this.pos.i;
        case_.signal = this.text.substring(this.pos.i, this.text.substring(this.pos.i).search(/\bis\b/)+this.pos.i)
        case_.variable = this.extractReads(case_, this.advancePast(/\bis\b/i), posI);
        // this.debug(`Apfel`);
        let nextWord = this.getNextWord().toLowerCase();
        while (nextWord === 'when') {
            this.debug(`parseWhen`);
            const whenClause = new objects_1.OWhenClause(case_, this.pos.i, this.getEndOfLineI());
            const pos = this.pos.i;
            whenClause.condition = this.extractReads(whenClause, this.advancePast('=>'), pos);
            whenClause.statements = this.parseStatements(whenClause, ['when', 'end']);
            whenClause.range.setEndBacktraceWhitespace(this.pos.i);
            case_.whenClauses.push(whenClause);
            nextWord = this.getNextWord().toLowerCase();
        }
        this.maybeWord('case');
        if (label) {
            this.maybeWord(label);
        }
        this.expect(';');
        this.debug(`parseCaseDone ${label}`);
        return case_; 

    }
}
exports.ProcessLikeParser = ProcessLikeParser;
//# sourceMappingURL=process-like-parse.js.map