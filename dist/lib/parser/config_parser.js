"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_base_1 = require("./parser-base");
const objects_1 = require("./objects");
class ConfigParser extends parser_base_1.ParserBase {
    constructor(text, pos, file, parent) {
        super(text, pos, file);
        this.parent = parent
        this.config = new objects_1.OConfig(this.parent);
        this.pos = pos
        this.debug(`start`);
    }
    parse() {
        this.config.name = this.getNextWord();
        this.expect('of');
        this.config.entity = this.getNextWord();
        this.expect('is');
        let lastI;
        while (this.pos.i < this.text.length) {
            let nextWord = this.getNextWord().toLowerCase();
            const savedI = this.pos.i;
            if (nextWord === 'for') {
                this.parseFor(this.config);
            }
            else if (nextWord === 'use') {
                this.parseUse(this.entity);
            }
            else if (nextWord === 'end') {
                this.advanceSemicolon(false)
                break;
            }
            if (lastI === this.pos.i) {
                throw new objects_1.ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos.getRangeToEndLine());
            }
            lastI = this.pos.i;
        }
        return this.config;
    }

    parseFor(cfg){
        let nw 
        do{
            if (this.text[this.pos.i] === ":") {
                this.pos.i += 1
                this.advanceWhitespace()
            }
            nw = this.getNextWord().toLowerCase()
            if (nw === 'for') this.parseFor(cfg)
            else if (nw === 'use') this.parseUse(cfg)
            else if (nw === 'end') break
        } while(true)
        this.advanceSemicolon(false)
    }

    parseUse(cfg){
        let nw 
        this.advanceSemicolon(false)
    }
    
}
exports.ConfigParser = ConfigParser;

//# sourceMappingURL=entity-parser.js.map