"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_base_1 = require("./parser-base");
const objects_1 = require("./objects");
class SubtypeParser extends parser_base_1.ParserBase {
    constructor(text, pos, file, parent) {
        super(text, pos, file);
        this.parent = parent;
        this.debug(`start`);
        this.subtype = new objects_1.OSubType(parent, this.pos.i, this.pos.i);
    }
    parse() {
        this.expect('subtype');
        const beforeNameText = this.pos.i;
        const nameText = this.getNextWord();
        this.subtype.name = new objects_1.OName(this.subtype, beforeNameText, beforeNameText + nameText.length);
        this.subtype.name.text = nameText;
        this.expect('is');
        if (this.text[this.pos.i] === '(') { // funky vhdl stuff
            this.advancePast(')');
        }
        const startISuperType = this.pos.i;
        const superType = this.getNextWord();
        const startIReads = this.pos.i;
        this.advanceSemicolon(true);
        // const reads = this.extractReads(this.subtype, this.advanceSemicolon(true), startIReads);
        this.subtype.superType = new objects_1.ORead(this.subtype, startISuperType, startISuperType + superType.length, superType);
        this.reverseWhitespace()
        const stop = this.pos.i
        this.advanceWhitespace()
        this.subtype.range.end.i = stop        
        return this.subtype;
    }
}
exports.SubtypeParser = SubtypeParser;
//# sourceMappingURL=subtype-parser.js.map