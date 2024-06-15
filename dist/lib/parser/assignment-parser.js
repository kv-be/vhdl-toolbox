"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_base_1 = require("./parser-base");
const objects_1 = require("./objects");
const { throws } = require("assert");
const { timeStamp } = require("console");
class AssignmentParser extends parser_base_1.ParserBase {
    constructor(text, pos, file, parent) {
        super(text, pos, file);
        this.parent = parent;
        this.debug(`start`);
    }
    parse() {
        let assignment = new objects_1.OAssignment(this.parent, this.pos.i, this.getEndOfLineI());
        /*if (assignment.match(/\s*<<\s*signal\b.+:.+>>/)){ // detect hierarchical signals
            assignment =  assignment.replace(/\s*<<\s*signal/g, match => " ".repeat(match.length))    
            assignment =  assignment.replace(/:.*>>/g, match => " ".repeat(match.length)).trim()  
        } */       
        let end_of_assignment = this.advanceSemicolon(true, false)
        end_of_assignment = end_of_assignment.replace(/\s*<<\s*signal\b/, match => " ".repeat(match.length))
        end_of_assignment = end_of_assignment.replace(/:.+>>/, match => " ".repeat(match.length))
        this.checkTextForKeywords(end_of_assignment)
        let leftHandSideI = this.pos.i;
        let leftHandSide = '';


        const match = /(<|:)=/.exec(this.text.substring(this.pos.i));
        if (!match) {
            throw new objects_1.ParserError(`expected <= or :=, reached end of text. Start on line`, this.pos.getRangeToEndLine());
        }
        leftHandSide += this.text.substring(this.pos.i, this.pos.i + match.index).trim();

        this.pos.i += match.index;
        if (!leftHandSide.match(/<<\s*signal\b/)){
            [assignment.reads, assignment.writes] = this.extractReadsOrWrite(assignment, leftHandSide, leftHandSideI);
        }
        this.pos.i += 2;
        let rightHandSideI = this.pos.i;
        let rightHandSide = this.advanceSemicolon(); // removed final semicolon to support the when - else constructs
        rightHandSide = rightHandSide.replace(/[\w\d\.]*?\s*=>\s*/g, match => " ".repeat(match.lentgh)) // to support explicitly mapped procedure/function ports
        if (!rightHandSide.match(/<<\s*signal\b/)){
            assignment.reads.push(...this.extractReads(assignment, rightHandSide, rightHandSideI));
        }
        assignment.range.end.i = this.pos.i;
        return assignment;
    }
}
exports.AssignmentParser = AssignmentParser;
//# sourceMappingURL=assignment-parser.js.map