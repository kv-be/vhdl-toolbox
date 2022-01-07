"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_base_1 = require("./parser-base");
const objects_1 = require("./objects");
const declarative_part_parser_1 = require("./declarative-part-parser");
class PackageParser extends parser_base_1.ParserBase {
    parse(parent) {
        const nextWord = this.getNextWord();
        if (nextWord.toLowerCase() == 'body'){
            if (!this.onlyDeclarations){ // assume only one package in a file!!
                const pkg = new objects_1.OPackageBody(parent, this.pos.i, this.getEndOfLineI());
                const match = parent.originalText.match(/!\s*@library\s+(\S+)/i);
                pkg.library = match ? match[1] : undefined;
                pkg.name = this.getNextWord();
                this.expect('is');
                const declarativePartParser = new declarative_part_parser_1.DeclarativePartParser(this.text, this.pos, this.file, pkg);
                declarativePartParser.parse(false, 'end');
                this.maybeWord('package');
                this.maybeWord('body');
                this.maybeWord(pkg.name);
                this.advanceSemicolon();
                return pkg;
            }
            else{
                this.pos.i = this.text.length
                return
            }  
        }

        else {
            const pkg = new objects_1.OPackage(parent, this.pos.i, this.getEndOfLineI());
            const match = parent.originalText.match(/!\s*@library\s+(\S+)/i);
            pkg.library = match ? match[1] : undefined;
            pkg.name = nextWord;
            this.expect('is');
            if (this.getNextWord({consume:false}).toLowerCase()==="new" ){
                this.expectDirectly("new")
                pkg.instanceLib = this.getNextWord()
                this.expectDirectly('.')
                pkg.instancePkg = this.getNextWord()
                return pkg;
            }
            const declarativePartParser = new declarative_part_parser_1.DeclarativePartParser(this.text, this.pos, this.file, pkg);
            declarativePartParser.parse(false, 'end');
            this.maybeWord('package');
            this.maybeWord(pkg.name);
            this.advanceSemicolon();
            return pkg;
        }
    }
}
exports.PackageParser = PackageParser;
//# sourceMappingURL=package-parser.js.map