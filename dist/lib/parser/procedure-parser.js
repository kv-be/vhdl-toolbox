"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const declarative_part_parser_1 = require("./declarative-part-parser");
const objects_1 = require("./objects");
const process_like_parse_1 = require("./process-like-parse");
class ProcedureParser extends process_like_parse_1.ProcessLikeParser {
    constructor(text, pos, file, parent, is_function=false) {
        super(text, pos, file);
        this.parent = parent;
        this.debug(`start`);
        this.is_function = is_function
    }
    parse(startI, label) {
        let beforeNameI = this.pos.i;
        let name
        let procedure
        /*let firstWord = this.getNextWord()
        if (firstWord === "impure")  firstWord = this.getNextWord()
        
        if (firstWord === "procedure"){*/
        if (!this.is_function) {
            name = this.getNextWord();
            procedure = new objects_1.OProcedure(this.parent, startI, this.getEndOfLineI());
        }
        else{
            name = this.advancePast(/^(\w+|"[^"]+")/, { returnMatch: true });
            procedure = new objects_1.OFunction(this.parent,  startI, this.getEndOfLineI());
        }
        procedure.name = new objects_1.OName(procedure, beforeNameI, beforeNameI + name.length);
        procedure.name.text = name;
        //console.log("name = "+procedure.name.text)
        if (this.text[this.pos.i] === '(') {
            // this.expect('(');
            this.parsePortsAndGenerics(false, procedure);
        }
        else {
            procedure.parameter = '';
        }
        if (this.is_function){
            this.expect("return")
          //const type = this.advanceSemicolon()
          //skip all the following which is the type definition. 
          // this can be a single word or a lib.package.type case.
          // anyway it is delimited by a space.
          // after the space there is either a ; or a is
          const type = this.getNextWord()
        }
        //look for the position of CR
        let lastCharIndex = this.text.substr(this.pos.i, this.text.length).search(/\n/)
        //check if there is a ; on the current line
        let semicolPos = this.text.substr(this.pos.i, lastCharIndex).search(";")
        if (semicolPos < 0) {
            let nextWord = this.getNextWord({ consume: false });
            if (nextWord.toLowerCase() != 'is') {
                this.advancePast(/\s/)
            } 
            nextWord = this.getNextWord({ consume: false })
            procedure.range.end.i = this.pos.i;
            if (nextWord.toLowerCase() === 'is') {
                this.expect('is');
                // debugger;
                nextWord = this.getNextWord({ consume: false }).toLowerCase();
                new declarative_part_parser_1.DeclarativePartParser(this.text, this.pos, this.file, procedure).parse();
    
                this.expect('begin');
                procedure.statements = this.parseStatements(procedure, ['end']);
                this.expect('end');
    
                if (this.is_function){
                    this.maybeWord('function');
                }
                else{
                    this.maybeWord('procedure');
                }
                //console.log("name = "+procedure.name.text)
                this.maybeWord(procedure.name.text);
                procedure.definition = this.parent;
            }    
        }
        //rather than this.expect(";") to support return values like dt.package.type
        // at this point, we read the first word after return and it is not "is"
        // if a package referenced type is returned, a series of .string combinations can follow
        // but in the end we need to find a semicolon.
        this.advanceSemicolon() 
        //this.expect(';');
        //end.line -=1
        const end = new objects_1.OI(this.parent, this.pos.i)
        let start = new objects_1.OI(this.parent, procedure.range.start.i)
        procedure.range = new objects_1.OIRange(this.parent, start, end)
        return procedure;
    }
}
exports.ProcedureParser = ProcedureParser;
//# sourceMappingURL=procedure-parser.js.map
