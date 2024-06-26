"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const entity_parser_1 = require("./entity-parser");
const architecture_parser_1 = require("./architecture-parser");
const parser_base_1 = require("./parser-base");
const objects_1 = require("./objects");
const package_parser_1 = require("./package-parser");
const config_parser_1 = require("./config_parser");

function removeComments(text) {
    text = "\n"+text
    // remove all start of line comments
    text = text. replace(/--linter_off/g, match => '__linter_off');
    text = text.replace(/--linter_on/g, match => '__linter_on');
    text = text.replace(/(?<=\n\s*)--.*/g, match => ' '.repeat(match.length));
    text = text.substring(1)
    // the line below removes everything between a -- and a \n IF there is no ; or " in it
    text = text.replace(/--(?<!;)[^"]*?(?=\n)/g, match => ' '.repeat(match.length));
    // in 99% of the cases, all the comments are removed. This is checked by the following line
    if (!text.includes("--") && !text.includes("__linter")) {
        if (!text.includes("/*")) {
            return text
        }
    }

    // if there is still a -- sequence detected, it can be something like if a = "0--111" or a string with -- in it
    // to get these out, we first replace all string content by S, replace --.* 
    let tmp_text = text
    tmp_text = tmp_text.replace(/"(.*?)"/g, match => "S".repeat(match.length))
    if (tmp_text.includes("--")) {
        const matches = tmp_text.matchAll(/--.*/g)
        for (const match of matches){
            text = text.substr(0, match.index)+" ".repeat(match[0].length)+ text.substring(match.index+match[0].length)
        }
    }
    if (tmp_text.includes("/*") || (tmp_text.includes("__linter"))) {
        let tmp_lines = tmp_text.split("\n")
        let i = 0;
        let l
        let comment_start = -1
        let in_comment = false
        let lines = text.split("\n")
        for ([i, l] of tmp_lines.entries()){
            if ((l.includes("*/") ||l.includes("__linter_on") ) && (in_comment)){
                in_comment = false
                lines[i] = lines[i].replace(/.*?\*\//g, match => ' '.repeat(match.length))
                lines[i] = lines[i].replace(/.*?__linter_on/g, match => ' '.repeat(match.length))
            }

            if (in_comment){
                lines[i] = lines[i].replace(/.*/g, match => ' '.repeat(match.length))
            }

            if ((l.includes("/*") || l.includes("__linter_off"))  && !(in_comment)){
                if (l.includes("*/")){ // in line block comment
                    lines[i] = lines[i].replace(/(?<=.*?)\/\*.*?\*\//g, match => ' '.repeat(match.length))
                }
                else{ // start of a real block commnet
                    in_comment = true
                    lines[i] = lines[i].replace(/(?<=.*?)\/\*.*/g, match => ' '.repeat(match.length))
                    lines[i] = lines[i].replace(/(?<=.*?)__linter_off.*/g, match => ' '.repeat(match.length))
                }
            }
        }
        text = lines.join("\n")
    }
    // remove block comments


    return text
}
exports.removeComments = removeComments

class Parser extends parser_base_1.ParserBase {
    constructor(text, file, onlyDeclarations = false) {
        super(text, {}, file);
        this.onlyDeclarations = onlyDeclarations;
        this.originalText = text;
        this.text = removeComments(this.text);
    }
    parse(end = null, parent=null) {
        let file 
        if (parent === null)  file = new objects_1.OFile(this.text, this.file, this.originalText);
        else file = parent
        file.options.CheckCodingRules = null
        file.options.CheckProcessReset = null
        file.options.CheckStdLogicArith = null
        file.options.CheckClockCrossing = true
        file.options.CheckClockCrossingStart = 0
        file.options.CheckClockCrossingEnd = 0
        
        let disabledRangeStart = undefined;
        let ignoreRegex = [];
        if ((this.originalText.search(/\n\s*--\s*vhdl_toolbox/)>-1) || (this.originalText.search(/(--\s*)(.*TODO.*)/)>-1)){
            for (const [lineNumber, line] of this.originalText.split('\n').entries()) {
                let match = /(--\s*vhdl_toolbox)(.*)/.exec(line); // vhdl_toolbox_disable_next_line //vhdl_toolbox_disable_this_line
                if (match) {
                    let innerMatch;
                    const nextLineRange = new objects_1.OIRange(file, new objects_1.OI(file, lineNumber + 1, 0), new objects_1.OI(file, lineNumber + 1, this.originalText.split('\n')[lineNumber + 1].length - 1));
                    if ((innerMatch = match[2].match('_disable_this_line')) !== null) {
                        file.magicComments.push(new objects_1.OMagicCommentDisable(file, objects_1.MagicCommentType.Disable, new objects_1.OIRange(file, new objects_1.OI(file, lineNumber, 0), new objects_1.OI(file, lineNumber, line.length - 1))));
                    }
                    else if (match[2].includes("check_coding_rules") ) {
                        file.options.CheckCodingRules = match[2].toLowerCase().includes("true")
                    }
                    else if (match[2].includes("check_process_reset") ) {
                        file.options.CheckProcessReset = match[2].toLowerCase().includes("true")
                    }
                    else if (match[2].includes("check_std_logic_arith") ) {
                        file.options.CheckStdLogicArith = match[2].toLowerCase().includes("true")
                    }
                    else if (match[2].includes("check_clock_crossing") ) {
                        file.options.CheckClockCrossing = !match[2].toLowerCase().includes("false")
                        if (!file.options.CheckClockCrossing) file.options.CheckClockCrossingStart = lineNumber
                        else file.options.CheckClockCrossingEnd = lineNumber
                    }
                    
                    else if ((innerMatch = match[2].match('_disable_next_line')) !== null) { // TODO: next nonempty line
                        file.magicComments.push(new objects_1.OMagicCommentDisable(file, objects_1.MagicCommentType.Disable, nextLineRange));
                    }
                    else if ((innerMatch = match[2].match('_disable\s*')) !== null) {
                        if (disabledRangeStart === undefined) {
                            disabledRangeStart = lineNumber;
                        }
                    }
                    else if ((innerMatch = match[2].match('_enable')) !== null) {
                        if (disabledRangeStart !== undefined) {
                            let disabledRange = new objects_1.OIRange(file, new objects_1.OI(file, disabledRangeStart, 0), new objects_1.OI(file, lineNumber, line.length - 1));
                            file.magicComments.push(new objects_1.OMagicCommentDisable(file, objects_1.MagicCommentType.Disable, disabledRange));
                            disabledRangeStart = undefined;
                        }
                    }
                }
                match = /(--\s*)(.*TODO.*)/.exec(line);
                if (match) {
                    const todoRange = new objects_1.OIRange(file, new objects_1.OI(file, lineNumber, line.length - match[2].length), new objects_1.OI(file, lineNumber, line.length));
                    file.magicComments.push(new objects_1.OMagicCommentTodo(file, objects_1.MagicCommentType.Todo, todoRange, match[2].toString()));
                }
            }

        }
        for (const regex of ignoreRegex) {
            const ignores = this.text.match(regex);
            if (ignores === null)
                continue;
            for (const ignore of ignores) {
                const replacement = ignore.replace(/\S/g, ' ');
                this.text = this.text.replace(ignore, replacement);
            }
        }
        if (end === null) this.pos = new objects_1.OI(file, 0);
        if (this.text.length > 500 * 1024) {
            throw new objects_1.ParserError('file too large', this.pos.getRangeToEndLine());
        }
        let entity;
        let architecture;
        const packages = [];
        while (this.pos.i < this.text.length) {
            this.advanceWhitespace();
            const start = this.pos.i
            if (this.text.substring(this.pos.i, this.getEndOfLineI()).search(/`protect\s+/i)>-1){
                break
            }
            let nextWord = this.getNextWord().toLowerCase();
            if (end !== null){
                if (nextWord === end){
                    return
                }
            }
            if (nextWord === 'library') {
                const name = this.getNextWord()
                file.libraries.push(name);
                //utils.debuglog("libs : "+
                //name+": "+start+", "+this.pos.i)
                //file.libs.push(new objects_1.OLib(file, name, start, this.pos.i))
                this.expect(';');
            }
            else if (nextWord === 'use') {
                file.useStatements.push(this.getUseStatement(file));
                this.expect(';');
            }
            else if (nextWord === 'entity') {
                const entityParser = new entity_parser_1.EntityParser(this.text, this.pos, this.file, file);
                Object.setPrototypeOf(file, objects_1.OFileWithEntity.prototype);
                file.entity = entityParser.entity;
                entity = entityParser.parse();
                if (this.onlyDeclarations) {
                    return file;
                }
                //         // console.log(file, typeof file.entity, 'typeof');
            }
            else if (nextWord === 'architecture') {
                if (architecture) {
                    this.message('Second Architecture not supported');
                }
                const architectureParser = new architecture_parser_1.ArchitectureParser(this.text, this.pos, this.file, file);
                architecture = architectureParser.parse();
            }
            else if (nextWord === 'package') {
                const packageParser = new package_parser_1.PackageParser(this.text, this.pos, this.file, this.onlyDeclarations);
                const pack = packageParser.parse(file)
                if (pack) packages.push(pack);
            }
            else if (nextWord === 'configuration') {
                const configParser = new config_parser_1.ConfigParser(this.text, this.pos, this.file, architecture);
                const pack = configParser.parse(file)
            }
            else if (nextWord === 'context') {
                let name = this.getNextWord();
                if (this.text[this.pos.i] === "."){
                    this.expect(".")
                    const libname = name
                    name = this.getNextWord() // previous name was lib name
                    this.expect(";")
                    if (!file.contextsUsed) file.contextsUsed=[]
                    file.contextsUsed.push( `${libname}.${name}`)
                }
                else {
                    const context = new objects_1.OContext(file, this.pos.i, this.pos.i)
                    Object.setPrototypeOf(file, objects_1.OFileWithContext.prototype)
                    const startI = this.pos.i
                    context.name = new objects_1.OName(context, startI, this.pos.i);
                    context.name.text = name
                    context.name.range.end.i = context.name.range.start.i + context.name.text.length;
                    this.expect("is")
                    this.parse("end", file)
                    this.expect("context")
                    this.maybeWord(context.name.text)
                    this.expect(";")
                    file.context = context                        
                }
            }
            else {
                throw new objects_1.ParserError(`Did not find any valid keyword at the beginning of this file (expecting : library, use, entity, architecture or package)`, this.pos.getRangeToEndLine())
                this.pos.i++;
            }
        }

        // to support files with packages and entities or only architectures the following it needed
        // - copy the libraries and uses to entity, architecture, package iso file and reset them when a package/architecure is done
        // - remove the else if below
        // - check for if file.architecture iso if file instanceof OFileWithEntityAndArchitecture
        // - for the libs: indicate when they are used in e.g. a package or so. When detecting again the 'library' word 
        //   and the used flag is set, the libs and uses are cleared and built again
        
        if (architecture || entity) { // TODO : support files with only architectures!
            Object.setPrototypeOf(file, objects_1.OFileWithEntityAndArchitecture.prototype);
            if (architecture) file.architecture = architecture;
            if (entity) file.entity = entity;
        }
        if (packages.length > 0) {
            Object.setPrototypeOf(file, objects_1.OFileWithPackages.prototype);
            file.packages = packages;
        }
        //console.log("returning file "+ file + " with options "+ file.options)
        return file;
    }

    getUseStatement(file) {
        let useStatement = new objects_1.OUseStatement(file, this.pos.i, this.getEndOfLineI());
        useStatement.begin = this.pos.i;
        useStatement.text = '';
        while (this.text[this.pos.i].match(/[\w.]/)) {
            useStatement.text += this.text[this.pos.i];
            this.pos.i++;
        }
        useStatement.end = useStatement.begin + useStatement.text.length;
        this.advanceWhitespace();
        return useStatement;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map