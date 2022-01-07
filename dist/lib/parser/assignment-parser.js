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
        let leftHandSideI = this.pos.i;
        let leftHandSide = '';
        const match = /[<:]/.exec(this.text.substring(this.pos.i));
        if (!match) {
            throw new objects_1.ParserError(`expected <= or :=, reached end of text. Start on line`, this.pos.getRangeToEndLine());
        }
        leftHandSide += this.text.substring(this.pos.i, this.pos.i + match.index);
        this.pos.i += match.index;
        [assignment.reads, assignment.writes] = this.extractReadsOrWrite(assignment, leftHandSide, leftHandSideI);
        this.pos.i += 2;
        let rightHandSideI = this.pos.i;
        const rightHandSide = this.advanceFinalSemicolon();
        assignment.reads.push(...this.extractReads(assignment, rightHandSide, rightHandSideI));
        assignment.range.end.i = this.pos.i;
        return assignment;
    }
}
exports.AssignmentParser = AssignmentParser;
//# sourceMappingURL=assignment-parser.js.map