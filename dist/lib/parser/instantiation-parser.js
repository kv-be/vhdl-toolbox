"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_base_1 = require("./parser-base");
const objects_1 = require("./objects");
const vscode_languageserver_1 = require("vscode-languageserver");
class InstantiationParser extends parser_base_1.ParserBase {
    constructor(text, pos, file, parent) {
        super(text, pos, file);
        this.parent = parent;
        this.debug(`start`);
    }
    parse(nextWord, label, startI) {
        const instantiation = new objects_1.OInstantiation(this.parent, startI, this.getEndOfLineI());
        instantiation.label = label;
        instantiation.entityInstantiation = false;
        if (nextWord === 'entity') {
            instantiation.entityInstantiation = true;
            nextWord = this.getNextWord({ re: /^[\w.]+/ });
            let libraryMatch = nextWord.match(/^(.*)\./i);
            if (!libraryMatch) {
                throw new objects_1.ParserError(`Can not parse entity instantiation`, this.pos.getRangeToEndLine());
            }
            instantiation.library = libraryMatch[1];
        }
        instantiation.componentName = nextWord.replace(/^.*\./, '');
        let hasPortMap = false;
        let lastI;
        if (this.text.substring(this.pos.i, this.getEndOfLineI()).match(/\(\s*\w+\s*/)){
            this.expect("(")
            this.getNextWord() // architecture name
            this.expect(")")
        }
        while (this.text[this.pos.i] !== ';') {
            const savedI = this.pos.i;
            nextWord = this.getNextWord().toLowerCase();
            //       console.log(nextWord, 'nextWord');
            if (nextWord === 'port') {
                hasPortMap = true;
                this.expect('map');
                this.expect('(');
                instantiation.portMappings = this.parseMapping(savedI, instantiation);
            }
            else if (nextWord === 'generic') {
                this.expect('map');
                this.expect('(');
                instantiation.genericMappings = this.parseMapping(savedI, instantiation, true);
            }
            if (lastI === this.pos.i) {
                throw new objects_1.ParserError(`Parser stuck on line ${this.getLine} in module ${this.constructor.name}`, this.pos.getRangeToEndLine());
            }
            lastI = this.pos.i;
        }
        instantiation.range.end.i = this.expect(';');
        /*if (!hasPortMap) {
            throw new objects_1.ParserError(`Instantiation has no Port Map`, this.pos.getRangeToEndLine());
        }*/
        return instantiation;
    }
    parseMapping(startI, instantiation, genericMapping = false) {
        this.debug(`parseMapping`);
        const map = genericMapping ? new objects_1.OGenericMap(instantiation, startI, this.pos.i) : new objects_1.OPortMap(instantiation, startI, this.pos.i);
        while (this.pos.i < this.text.length) {
            const mapping = new objects_1.OMapping(map, this.pos.i, this.getEndOfLineI());
            const mappingNameI = this.pos.i;
            let line = mapping.text.substring(0, mapping.text.search(/\n/))
            if (!line) line = mapping.text.substring(0)
            if (line.search(/[\w\s*\(\)']+\s*=>/)===-1){
                throw new objects_1.ParserError(`Expected '=>' in this port map`, new objects_1.OIRange(this.parent, mappingNameI, this.getEndOfLineI(mappingNameI)));
            }
            line = line.replace(",", "")
            if (line.search(/[\w\s*\(\)']+\s*=>\s*\S+/)===-1){
                throw new objects_1.ParserError(`Expected an actual in this port map`, new objects_1.OIRange(this.parent, mappingNameI, this.getEndOfLineI(mappingNameI)));
            }
            mapping.name = this.extractReads(mapping, this.getNextWord({ re: /^[^=]+/ }), mappingNameI, true);
            for (const namePart of mapping.name) {
                Object.setPrototypeOf(namePart, objects_1.OMappingName.prototype);
            }
            this.expect('=>');
            let mappingStringStartI = this.pos.i;
            let mappingString = '';
            let braceLevel = 0;
            let start = this.pos.i
            while (this.text[this.pos.i].match(/[,)]/) === null || braceLevel > 0) {
                mappingString += this.text[this.pos.i];
                if (this.text[this.pos.i] === '(') {
                    braceLevel++;
                }
                else if (this.text[this.pos.i] === ')') {
                    braceLevel--;
                }
                this.pos.i++;
            }
            // mapping.name = mapping.name.trim();
            if (mappingString.search(/\w+?W*\n+\W+\w+/gi)>-1){//if 
                     throw new objects_1.ParserError(`Expected ',' after this port map`, new objects_1.OIRange(this.parent, start, this.getEndOfLineI(start)));
            }
            if (mappingString.trim().toLowerCase() !== 'open') {
                mapping.mappingIfInput = this.extractReads(mapping, mappingString, mappingStringStartI);
                if (genericMapping === false) {
                    //returns [reads, writes]
                    mapping.mappingIfOutput = this.extractReadsOrWrite(mapping, mappingString, mappingStringStartI);
                }
            }
            else {
                mapping.mappingIfInput = [];
                mapping.mappingIfOutput = [[], []];
            }
            map.children.push(mapping);
            if (this.text[this.pos.i] === ',') {
                const beforeI = this.pos.i;
                this.pos.i++;
                this.advanceWhitespace();
                if (this.text[this.pos.i] === ')') {
                    const range = new objects_1.OIRange(mapping, beforeI, beforeI + 1);
                    range.start.character = 0;
                    throw new objects_1.ParserError(`Unexpected ',' at end of port map`, range, {
                        message: `Remove ','`,
                        edits: [vscode_languageserver_1.TextEdit.del(new objects_1.OIRange(mapping, beforeI, beforeI + 1))]
                    });
                }
            }
            else if (this.text[this.pos.i] === ')') {
                this.pos.i++;
                map.range.end.i = this.pos.i;
                this.advanceWhitespace();
                break;
            }
        }
        return map;
    }
}
exports.InstantiationParser = InstantiationParser;
//# sourceMappingURL=instantiation-parser.js.map