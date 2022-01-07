"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_base_1 = require("./parser-base");
const declarative_part_parser_1 = require("./declarative-part-parser");
const objects_1 = require("./objects");
const statement_parser_1 = require("./statement-parser");
class EntityParser extends parser_base_1.ParserBase {
    constructor(text, pos, file, parent) {
        super(text, pos, file);
        this.parent = parent;
        const match = this.parent.originalText.match(/!\s*@library\s+(\S+)/i);
        const library = match ? match[1] : undefined;
        this.entity = new objects_1.OEntity(this.parent, this.pos.i, this.getEndOfLineI(), library);
        this.debug(`start`);
    }
    parse() {
        this.entity.name = this.getNextWord();
        this.expect('is');
        let lastI;
        while (this.pos.i < this.text.length) {
            if (this.text[this.pos.i].match(/\s/)) {
                this.pos.i++;
                continue;
            }
            let nextWord = this.getNextWord({ consume: false }).toLowerCase();
            const savedI = this.pos.i;
            if (nextWord === 'port') {
                this.getNextWord();
                this.parsePortsAndGenerics(false, this.entity);
                this.entity.portRange = new objects_1.OIRange(this.entity, savedI, this.pos.i);
                this.expectDirectly(';');
            }
            else if (nextWord === 'generic') {
                this.getNextWord();
                this.parsePortsAndGenerics(true, this.entity);
                this.entity.genericRange = new objects_1.OIRange(this.entity, savedI, this.pos.i);
                this.expectDirectly(';');
            }
            else if (nextWord === 'end') {
                this.getNextWord();
                this.maybeWord('entity');
                this.maybeWord(this.entity.name);
                this.expectDirectly(';');
                break;
            }
            else if (nextWord === 'begin') {
                this.getNextWord();
                let nextWord = this.getNextWord({ consume: false }).toLowerCase();
                while (nextWord !== 'end') {
                    new statement_parser_1.StatementParser(this.text, this.pos, this.file, this.entity).parse([
                        statement_parser_1.StatementTypes.Assert,
                        statement_parser_1.StatementTypes.ProcedureInstantiation,
                        statement_parser_1.StatementTypes.Process
                    ]);
                    nextWord = this.getNextWord({ consume: false }).toLowerCase();
                }
                this.getNextWord();
                this.maybeWord('entity');
                this.maybeWord(this.entity.name);
                this.expectDirectly(';');
                break;
            }
            else {
                new declarative_part_parser_1.DeclarativePartParser(this.text, this.pos, this.file, this.entity).parse();
            }
            if (lastI === this.pos.i) {
                throw new objects_1.ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos.getRangeToEndLine());
            }
            lastI = this.pos.i;
        }
        this.entity.range.end.i = this.pos.i;
        return this.entity;
    }
}
exports.EntityParser = EntityParser;
//# sourceMappingURL=entity-parser.js.map