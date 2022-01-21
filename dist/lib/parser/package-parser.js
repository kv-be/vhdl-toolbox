"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_base_1 = require("./parser-base");
const objects_1 = require("./objects");
const declarative_part_parser_1 = require("./declarative-part-parser");
const instantiation_parser_1 = require("./instantiation-parser");
const { throws } = require("assert");
class PackageParser extends parser_base_1.ParserBase {
    parse(parent) {
        this.reverseWhitespace()
        const startPackage = this.pos.i-"package".length
        this.advanceWhitespace()

        const nextWord = this.getNextWord();
        if (nextWord.toLowerCase() == 'body'){
            if (!this.onlyDeclarations){ // assume only one package in a file!!
                const pkg = new objects_1.OPackageBody(parent, startPackage, this.getEndOfLineI());
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
            const pkg = new objects_1.OPackage(parent, startPackage, this.getEndOfLineI());
            const match = parent.originalText.match(/!\s*@library\s+(\S+)/i);
            pkg.library = match ? match[1] : undefined;
            pkg.name = nextWord;
            this.expect('is');
            const startI = this.pos.i
            if (this.getNextWord({consume:false}).toLowerCase()==="new" ){
                this.expectDirectly("new")
                let pkg_instance = new objects_1.OInstantiation(parent, startI, this.getEndOfLineI())
                let instanceLib = this.getNextWord()
                this.expectDirectly('.')
                // name of the base package is the component name
                // like that we can reuse everything from entity instances
                pkg_instance.componentName = this.getNextWord() 
                const savedI = this.pos.i
                this.expect("generic")
                this.expect("map")
                this.expect("(")
                const instantiationParser = new instantiation_parser_1.InstantiationParser(this.text, this.pos, this.file, parent);
                pkg_instance.genericMappings= instantiationParser.parseMapping(savedI, pkg_instance, true)
                if (!pkg.instance)  pkg.instance = []
                pkg.instance.push(pkg_instance);  
                this.expect(';')  
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