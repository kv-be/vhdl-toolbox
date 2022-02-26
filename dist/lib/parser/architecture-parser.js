"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_base_1 = require("./parser-base");
const objects_1 = require("./objects");
const declarative_part_parser_1 = require("./declarative-part-parser");
const statement_parser_1 = require("./statement-parser");
class ArchitectureParser extends parser_base_1.ParserBase {
    constructor(text, pos, file, parent, name) {
        super(text, pos, file);
        this.parent = parent;
        this.debug('start');
        this.name = name //new objects_1.OName(this.parent, pos.i, pos.i+name.length, name);
    }
    parse(skipStart = false, structureName = 'architecture', forGenerateDetails, generate_name) {
        this.debug(`parse`);
        if (structureName === 'architecture') {
            this.architecture = new objects_1.OArchitecture(this.parent, this.pos.i, this.getEndOfLineI());

        }
        else if (structureName === 'block') {
            this.architecture = new objects_1.OBlock(this.parent, this.pos.i, this.getEndOfLineI());
        }
        else if (structureName === "generate") {
            if (!forGenerateDetails) { //start of a new if generate
                this.architecture = new objects_1.OIfGenerateClause(this.parent, this.pos.i, this.getEndOfLineI());
            }
            else{
                if (this.parent instanceof objects_1.OFile) {
                    throw new objects_1.ParserError(`For Generate can not be top level architecture!`, this.pos.getRangeToEndLine());
                }
                const { variable, start, end, startPosI } = forGenerateDetails;
                this.architecture = new objects_1.OForGenerate(this.parent, this.pos.i, this.getEndOfLineI(), start, end);
                const variableObject = new objects_1.OVariable(this.architecture, startPosI, startPosI + variable.length);
                this.architecture.name = this.name
                variableObject.type = [];
                variableObject.name = new objects_1.OName(variableObject, startPosI, startPosI + variable.length);
                variableObject.name.text = variable;
                this.architecture.variable = variableObject;    
            }
        }
        else{
            throw new objects_1.ParserError(`Unexpected problem in architecture parser`, this.pos.getRangeToEndLine());
        }
        if (skipStart !== true) {
            this.type = this.getNextWord();
            this.architecture.name = this.type;
            this.expect('of');
            this.name = this.getNextWord();
            //console.log("Architecture found with name "+this.architecture.name)
            this.expect('is');
        } 
        else{
            // case of generate statements
            this.architecture.name = generate_name
        }
        new declarative_part_parser_1.DeclarativePartParser(this.text, this.pos, this.file, this.architecture).parse(structureName !== 'architecture');
        this.maybeWord('begin');
        while (this.pos.i < this.text.length) {
            this.advanceWhitespace();
            let nextWord = this.getNextWord({ consume: false }).toLowerCase();
            if (nextWord === 'end') {
                this.getNextWord();
                if (structureName === 'block') {
                    this.expect(structureName);
                }
                else {
                    this.maybeWord(structureName);
                }
                if (typeof this.type !== 'undefined') {
                    this.maybeWord(this.type);
                }
                if (this.name) {
                    this.maybeWord(this.name);
                }
                this.expectDirectly(';');
                break;
            }
            const statementParser = new statement_parser_1.StatementParser(this.text, this.pos, this.file, this.architecture);
            if (statementParser.parse([
                statement_parser_1.StatementTypes.Assert,
                statement_parser_1.StatementTypes.Assignment,
                statement_parser_1.StatementTypes.Generate,
                statement_parser_1.StatementTypes.Block,
                statement_parser_1.StatementTypes.ProcedureInstantiation,
                statement_parser_1.StatementTypes.Process
            ], this.architecture)) {
                break;
            }
        }
        this.debug('finished parse');
        return this.architecture;
    }
}
exports.ArchitectureParser = ArchitectureParser;
//# sourceMappingURL=architecture-parser.js.map