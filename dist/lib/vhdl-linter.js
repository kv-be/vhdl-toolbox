"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objects_1 = require("./parser/objects");
const parser_1 = require("./parser/parser");
const string_similarity_1 = require("string-similarity");
const vscode_languageserver_1 = require("vscode-languageserver");
const utils = require("./utils");
const { threadId } = require("worker_threads");
const { thenable } = require("vscode-languageserver/lib/utils/is");
const { isThisTypeNode, textChangeRangeIsUnchanged } = require("typescript");
const { throws } = require("assert");
const path_1 = require("path");
const vhdlLinterId = "(vhdl_t) "
var LinterRules;
(function (LinterRules) {
    LinterRules[LinterRules["Reset"] = 0] = "Reset";
})(LinterRules = exports.LinterRules || (exports.LinterRules = {}));
class VhdlLinter {
    constructor(editorPath, text, projectParser, onlyDeclarations = false) {
        this.editorPath = editorPath;
        this.text = text;
        this.projectParser = projectParser;
        this.onlyDeclarations = onlyDeclarations;
        this.messages = [];
        this.packages = [];
        this.messages = [];
        this.diagnosticCodeActionRegistry = [];
        this.commandCallbackRegistry = [];
        this.global_options = projectParser.get_options();
        //("finally parsing "+this.editorPath)
        this.onlyDeclarations = false
        if (this.projectParser.options.PathsToPartiallyCheck.length > 0) {
            const expr = new RegExp(this.projectParser.options.PathsToPartiallyCheck)
            this.onlyDeclarations = (this.editorPath.search(expr) > -1)
        }
        this.parser = new parser_1.Parser(this.text, this.editorPath, this.onlyDeclarations);
        this.file_options = { "CheckCodingRules": null, "CheckProcessReset": null, "CheckStdLogicArith": null };

        if (this.global_options) {
            const a = this.global_options
            this.options = Object.assign({}, this.global_options);
        } else {
            this.options = { "CheckCodingRules": true, "CheckProcessReset": true, "CheckStdLogicArith": true };
        }



        try {
            this.tree = this.parser.parse();
            this.file_options = this.tree.options
            if (this.file_options.CheckProcessReset !== null) {
                this.options.CheckProcessReset = this.file_options.CheckProcessReset
            }
            if (this.file_options.CheckCodingRules !== null) {
                this.options.CheckCodingRules = this.file_options.CheckCodingRules
            }
            if (this.file_options.CheckStdLogicArith !== null) {
                this.options.CheckStdLogicArith = this.file_options.CheckStdLogicArith
            }

        }
        catch (e) {
            if (e instanceof objects_1.ParserError) {
                let code;
                if (e.solution) {
                    code = this.addCodeActionCallback((textDocumentUri) => {
                        const actions = [];
                        actions.push(vscode_languageserver_1.CodeAction.create(e.solution.message, {
                            changes: {
                                [textDocumentUri]: e.solution.edits
                            }
                        }, vscode_languageserver_1.CodeActionKind.QuickFix));
                        return actions;
                    });
                }
                this.messages.push({
                    range: e.range,
                    severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                    message: e.message,
                    code
                });
            }
            else {
                throw e;
            }
        }
        //     console.log(`done parsing: ${editorPath}`);
    }

    get_messages() {
        return this.messages
    }

    getWordAtPosition(pos) {
        let left = pos
        let right = pos
        while (this.text[left].search(/\w/) > -1) {
            if (left > 0) left -= 1
            else break
        }
        while (this.text[right].search(/\w/) > -1) {
            if (right < this.text.length - 1) right += 1
            else break
        }
        return this.text.substring(left, right)
    }

    addCodeActionCallback(handler) {
        return this.diagnosticCodeActionRegistry.push(handler) - 1;
    }
    addCommandCallback(title, textDocumentUri, handler) {
        const counter = this.commandCallbackRegistry.push(handler) - 1;
        return {
            title,
            command: 'vhdl-toolbox:lsp-command',
            arguments: [textDocumentUri, counter]
        };
    }
    checkMagicComments(diagnostic, rule, parameter) {
        const range = diagnostic.range
        if (range) {
            const matchingMagiComments = this.tree.magicComments.filter(magicComment => (magicComment.range.start.character <= range.start.character && magicComment.range.start.line <= range.start.line &&
                magicComment.range.end.character >= range.start.character && magicComment.range.end.line >= range.start.line) || (magicComment.range.start.character <= range.end.character && magicComment.range.start.line <= range.end.line &&
                    magicComment.range.end.character >= range.end.character && magicComment.range.end.line >= range.end.line)).filter(magicComment => {
                        if (magicComment.commentType === objects_1.MagicCommentType.Disable) {
                            return true;
                        }
                        if (magicComment.commentType === objects_1.MagicCommentType.Parameter && rule === LinterRules.Reset && typeof parameter !== 'undefined' && magicComment.parameter.find(parameterFind => parameterFind.toLowerCase() === parameter.toLowerCase())) {
                            return true;
                        }
                        return false;
                    });
            return matchingMagiComments.length === 0;
        }
        else return false
    }
    checkTodos() {
        this.tree.magicComments.forEach(magicComment => {
            if (magicComment.commentType === objects_1.MagicCommentType.Todo) {
                this.messages.push({
                    range: magicComment.range,
                    severity: vscode_languageserver_1.DiagnosticSeverity.Information,
                    message: vhdlLinterId + magicComment.message
                });
            }
        });
    }
    addMessage(diagnostic, rule, parameter) {
        diagnostic.message = vhdlLinterId + diagnostic.message
        if (this.checkMagicComments(diagnostic, rule, parameter)) {
            this.messages.push(diagnostic);
        }
    }

    findDefInPackage(toBeFound, pkg, what = "") {
        const criteria = toBeFound.text.toLowerCase()
        if (pkg.constants && (what === "" || what === "constant")) {
            for (const constant of pkg.constants) {
                if (constant.name.text.toLowerCase() === criteria) {
                    return constant;
                }
            }
        }
        if (pkg.generics && (what === "" || what === "generic")) {
            for (const gen of pkg.generics) {
                if (gen.name.text.toLowerCase() === criteria) {
                    return gen;
                }
            }

        }
        if (pkg.functions && (what === "" || what === "function")) {
            for (const func of pkg.functions) {
                if (func.name.text.toLowerCase() === criteria) {
                    return func;
                }
                for (const ft of func.types) {
                    if (ft.name.text.toLowerCase() === criteria) {
                        return ft;
                    }
                }
            }

        }
        if (pkg.procedures && (what === "" || what === "procedure")) {
            for (const func of pkg.procedures) {
                if (func.name.text.toLowerCase() === criteria) {
                    return func;
                }
                for (const ft of func.types) {
                    if (ft.name.text.toLowerCase() === criteria) {
                        return ft;
                    }
                }
            }
        }
        if (pkg.types && (what === "" || what === "type")) {
            for (const type of pkg.types) {
                const typeRead = type.finddef(toBeFound);
                if (typeRead !== false) {
                    return typeRead;
                }
                if (type instanceof objects_1.OEnum) {
                    for (const state of type.states) {
                        if (state.name.text.toLowerCase() === criteria) {
                            return state;
                        }
                    }
                }
                else if (type instanceof objects_1.ORecord) {
                    for (const child of type.children) {
                        if (child.name.text.toLowerCase() === criteria) {
                            return child;
                        }
                    }
                    if (type.name.text === criteria) {
                        return child;
                    }
                }
                else if (type instanceof objects_1.OProtected) {
                    for (const proc of type.procedures) {
                        if (proc.name.text.toLowerCase() === criteria) {
                            return proc;
                        }
                    }
                    for (const proc of type.functions) {
                        if (proc.name.text.toLowerCase() === criteria) {
                            return proc;
                        }
                        for (const ft of proc.types) {
                            if (ft.name.text.toLowerCase() === criteria) {
                                return ft;
                            }
                        }

                    }
                }
            }

        }
        if (pkg.name && (what === "")) {
            if (pkg.name.toLowerCase() === criteria) {
                return pkg;
            }
        }
        return null
    }

    solve_uses(useStatements, pcks = []) {
        let found_packages = []
        let packages = pcks
        packages = packages.concat(this.projectParser.getPackages());
        let found = false;
        let library
        let pkg
        let specifics
        for (const useStatement of useStatements) {
            const parts = useStatement.text.split(".")
            if (parts.length === 3) { // lib.package.all
                library = parts[0].trim()
                pkg = parts[1].trim()
                specifics = parts[2].trim()
            } else if (parts.length === 2) { // package.all
                // use of a package in a generic package
                if (parts[1].trim() === "all") {
                    library = "work"
                    pkg = parts[0].trim()
                    specifics = parts[1].trim()
                }
                else {  // assume lib.package
                    library = parts[0].trim();
                    pkg = parts[1].trim()
                    specifics = "all"
                }
            }
            //let match = useStatement.text.match(/([^.])\.([^.]+)\..*/i);
            //if (match) {
            //const library = match[1];
            //const pkg = match[2];
            if (library.toLowerCase() === 'altera_mf') {
                found = true;
            }
            else {
                const pkgs = packages.filter(m => m.name.toLowerCase() === pkg.toLowerCase())
                found = (pkgs.length > 0)
                if (pkgs) useStatement.definition = pkgs[0]
                /*for (const p of pkgs){
                    if (p.useStatements) found_packages = found_packages.concat(this.solve_uses(p.useStatements))
                }*/
                found_packages = found_packages.concat(pkgs)
                const ps = found_packages.filter(m => m.instance)
                /*for (const foundPkg of packages) {
                    if (foundPkg.name.toLowerCase() === pkg.toLowerCase()) {
                        found_packages.push(foundPkg);
                        found = true;
                        if (foundPkg.useStatements) {
                            found_packages = found_packages.concat(this.solve_uses(foundPkg.useStatements))
                        }
                    }
                }*/
            }
            //}
            if (!found) {
                this.addMessage({
                    range: useStatement.range,
                    severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                    message: "(vhdl_t)" + ` could not find package for ${useStatement.text}`
                });
            }
        }
        return found_packages
    }

    solve_context(contexts) {
        let pkgs = []
        if (!contexts) return []
        for (const c of contexts) {
            const f = this.projectParser.getContexts().find(ctx => ctx.name.text.toLowerCase() === c.split(".")[1].toLowerCase())
            if (f) pkgs = pkgs.concat(this.solve_uses(f.parent.useStatements))
        }
        return pkgs
    }

    async parsePackages() {
        //     make a list of packages used (and include the standard ones)
        this.packages = this.solve_uses(this.tree.useStatements)
        this.packages = this.packages.concat(this.solve_context(this.tree.contextsUsed))
        if ('architecture' in this.tree) {
            if (('useStatements' in this.tree.architecture) && ('packages' in this.tree.architecture)) {
                this.packages = this.packages.concat(this.solve_uses(this.tree.architecture.useStatements, this.tree.architecture.packages));
            }
        }
        /*if ('packages' in this.tree){
            for (let p of this.tree.packages) {
                if (('useStatements' in p) && ('packages' in p) ){
                    this.packages = this.packages.concat(this.solve_uses(p.useStatements, p.packages));
                }
            }
        }*/

        const standard = this.projectParser.getPackages().find(pkg => pkg.name.toLowerCase() === 'standard');
        if (standard) {
            this.packages.push(standard);
        }

        // if the file contains packages, add them too!
        if (this.tree.packages) {
            this.packages = this.packages.concat(this.tree.packages)
            for (const p of this.tree.packages) {
                if (p.useStatements) {
                    if (p.packages) this.packages = this.packages.concat(this.solve_uses(p.useStatements, p.packages))
                    else this.packages = this.packages.concat(this.solve_uses(p.useStatements))
                }
            }
        }

        let generic_pkgs = []
        for (let p of this.packages.filter(m => m.instance)) {
            // all packages which are instances of generic packages
            // get all the definitions of the generic package
            for (const q of p.instance) {
                const hits = this.projectParser.getPackages().find(pkg => pkg.name.toLowerCase() === q.componentName.toLowerCase())
                if (hits) {
                    p.types = hits.types
                    p.constants = hits.constants
                    p.functions = hits.functions
                    p.procedures = hits.procedures
                    p.generics = hits.generics
                    //generic_pkgs = generic_pkgs.concat(hits)    
                }
            }

        }
        //this.packages = Array.from([...new Set(this.packages)])
        // Start checking the undefined signals
        for (const read of this.tree.objectList.filter(object => object instanceof objects_1.ORead && typeof object.definition === 'undefined')) {
            // the following is to support generic package instances
            if ((read.parent instanceof objects_1.OProcedure) || (read.parent instanceof objects_1.OFunction)) {
                read.definition = read.parent.variables.find(v => v.name.text === read.text)
                if (read.definition) continue
                else {
                    if (read.parent.types) read.definition = read.parent.types.find(v => v.name.text === read.text)
                    if (read.definition) continue
                    else {
                        if (read.parent.functions) read.definition = read.parent.functions.find(v => v.name.text === read.text)
                    }
                }
            }
            for (const pkg of this.packages) {
                read.definition = this.findDefInPackage(read, pkg)
                if (read.definition) break;
            }
        }
        for (const instantiation of this.tree.objectList.filter(object => object instanceof objects_1.OInstantiation && typeof object.definition === 'undefined')) {
            // check if the componentName can be linked to a known entity/package
            instantiation.definition = this.getProjectEntity(instantiation);
        }


        for (const obj of this.tree.objectList.filter(o => o instanceof objects_1.OMapping)) {
            //if (obj instanceof objects_1.OMapping) {
            if (obj.parent instanceof objects_1.OGenericMap || obj.parent instanceof objects_1.OPortMap) {
                const entity = this.getProjectEntity(obj.parent.parent);
                if (!entity) {
                    continue;
                }
                const portOrGeneric = obj.parent instanceof objects_1.OPortMap ? entity.ports.find(port => obj.name.find(name => name.text.toLowerCase() === port.name.text.toLowerCase())) :
                    entity.generics.find(port => obj.name.find(name => name.text.toLowerCase() === port.name.text.toLowerCase()));
                if (!portOrGeneric) {
                    continue;
                }
                obj.definition = portOrGeneric;
                for (const namePart of obj.name) {
                    namePart.definition = portOrGeneric;
                }
                if (portOrGeneric instanceof objects_1.OPort) {
                    if (portOrGeneric.direction === 'in') {
                        if (obj.mappingIfOutput) {
                            for (const mapping of obj.mappingIfOutput.flat()) {
                                const index = this.tree.objectList.indexOf(mapping);
                                this.tree.objectList.splice(index, 1);
                                for (const mentionable of this.tree.objectList.filter(object => object instanceof objects_1.OMentionable)) {
                                    for (const [index, mention] of mentionable.mentions.entries()) {
                                        if (mention === mapping) {
                                            mentionable.mentions.splice(index, 1);
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            console.log("gotch you")
                        }
                        obj.mappingIfOutput = [[], []];
                    }
                    else if (portOrGeneric.direction === 'out') {
                        if (obj.mappingIfInput) {
                            for (const mapping of obj.mappingIfInput) {
                                const index = this.tree.objectList.indexOf(mapping);
                                this.tree.objectList.splice(index, 1);
                                for (const mentionable of this.tree.objectList.filter(object => object instanceof objects_1.OMentionable)) {
                                    for (const [index, mention] of mentionable.mentions.entries()) {
                                        if (mention === mapping) {
                                            mentionable.mentions.splice(index, 1);
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            console.log("gotch you")
                        }
                        obj.mappingIfInput = [];
                    }
                }
            }
            //}
        }

        for (const obj of this.tree.objectList.filter(object => object instanceof objects_1.OProcedureCall && typeof object.definition === 'undefined')) {
            for (const pkg of this.packages) {
                obj.definition = this.findDefInPackage(obj.procedureName, pkg, "procedure")
                if (obj.definition) {
                    break
                }
            }
        }
    }

    async parseFunctions() {
        for (const read of this.tree.objectList.filter(object => (object instanceof objects_1.ORead || object instanceof objects_1.OWrite) && typeof object.definition === 'undefined')) {
            let iterator
            if (this.tree.architecture) {
                iterator = this.tree.architecture.functions
            } else if (this.tree.packages) {
                iterator = this.tree.packages.filter(pack => pack instanceof objects_1.OPackage)[0]
            } else continue

            if (iterator.types) {
                for (const type of iterator.types) {
                    let typeRead = type.finddef(read);
                    if (typeRead !== false) {
                        read.definition = typeRead;
                        continue
                    }
                    let typeWrite = type.finddef(read, false);
                    if (typeWrite !== false) {
                        read.definition = typeWrite;
                        continue
                    }

                    if (type instanceof objects_1.OEnum) {
                        for (const state of type.states) {
                            if (state.name.text.toLowerCase() === read.text.toLowerCase()) {
                                read.definition = state;
                            }
                        }
                    }
                    else if (type instanceof objects_1.ORecord) {
                        for (const child of type.children) {
                            if (child.name.text.toLowerCase() === read.text.toLowerCase()) {
                                read.definition = child;
                            }
                        }
                    }
                    else if (type instanceof objects_1.OProtected) {
                        for (const proc of type.procedures) {
                            if (proc.name.text.toLowerCase() === read.text.toLowerCase()) {
                                read.definition = proc;
                            }
                        }
                        for (const proc of type.functions) {
                            if (proc.name.text.toLowerCase() === read.text.toLowerCase()) {
                                read.definition = proc;
                            }
                        }
                    }
                }

            }
        }
    }

    async parseProtected() {
        for (const read of this.tree.objectList.filter(object => (object instanceof objects_1.ORead || object instanceof objects_1.OWrite) && typeof object.definition === 'undefined')) {
            let iterator
            if (this.tree.architecture) {
                iterator = this.tree.architecture
            } else if (this.tree.packages) {
                iterator = this.tree.packages.filter(pack => pack instanceof objects_1.OPackage)[0]
            } else continue

            //if (iterator.functions){
            for (const type of iterator.types) {
                let typeRead = type.finddef(read);
                if (typeRead !== false) {
                    read.definition = typeRead;
                    continue
                }
                let typeWrite = type.finddef(read, false);
                if (typeWrite !== false) {
                    read.definition = typeWrite;
                    continue
                }

                if (type instanceof objects_1.OEnum) {
                    for (const state of type.states) {
                        if (state.name.text.toLowerCase() === read.text.toLowerCase()) {
                            read.definition = state;
                        }
                    }
                }
                else if (type instanceof objects_1.ORecord) {
                    for (const child of type.children) {
                        if (child.name.text.toLowerCase() === read.text.toLowerCase()) {
                            read.definition = child;
                        }
                    }
                }
                else if (type instanceof objects_1.OProtected) {
                    for (const proc of type.procedures) {
                        if (proc.name.text.toLowerCase() === read.text.toLowerCase()) {
                            read.definition = proc;
                        }
                    }
                    for (const proc of type.functions) {
                        if (proc.name.text.toLowerCase() === read.text.toLowerCase()) {
                            read.definition = proc;
                        }
                    }
                }
            }

            //}
        }
    }

    checkEntity() {
        // check if the file name and the entity name are the same
        //utils.debuglog("Checking entity")
        if ((this.tree instanceof objects_1.OFileWithEntity) && (this.tree.entity)) {
            if (this.options.CheckCodingRules) {
                let name = this.tree.file.split(path_1.sep)
                name = name[name.length - 1].split('.')[0]
                //utils.debuglog("file name "+ name+ ", "+this.tree.entity.name)
                let r = this.tree.entity.range

                r.end.i = r.start.i + this.tree.entity.name.length
                if (name !== this.tree.entity.name) {
                    //utils.debuglog("pushing error q")
                    this.addMessage({
                        range: r,//this.tree.entity.range,
                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                        message: `The entity has not the same name as the file.`
                    });
                }


            }
        }
        if (this.tree instanceof objects_1.OFileWithPackages) {
            if (this.options.CheckCodingRules) {
                let name = this.tree.file.split(path_1.sep)
                name = name[name.length - 1].split('.')[0]
                //utils.debuglog("file name "+ name+ ", "+this.tree.packages[0].name)
                if (name !== this.tree.packages[0].name) {
                    let r = this.tree.packages[0].range
                    r.start.i = r.end.i - this.tree.packages[0].name.length - 2
                    r.end.i = r.end.i - 2
                    this.addMessage({
                        range: r,//this.tree.packages[0].range,
                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                        message: `Coding rule: The package has not the same name as the file.`
                    });
                }
            }
        }
    }

    checkLibrary() {
        for (const lib of this.tree.libraries.filter(l => l.search(/^work$/gi) > -1)) {
            //if (){
            const start = this.text.search(/library\s*work\s*;/gi)
            const length = this.text.substring(this.text.search(/library\s*work\s*;/gi)).search('\n')
            this.addMessage({
                range: new objects_1.OIRange(this.tree, start, start + length),
                severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                message: `The library work doens't need to be included explicitly.`
            });
            //}
        }

        for (const useStatement of this.tree.useStatements) {
            //utils.debuglog("check libs " + typeof this.options.CheckStdLogicArith)
            if (this.options.CheckStdLogicArith) {
                //utils.debuglog("Checking libs")
                if (useStatement.text.match(/^ieee.std_logic_arith.all/gi) !== null) {
                    this.addMessage({
                        range: useStatement.range,
                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                        message: `This library shall not be used`
                    });
                }
                if (useStatement.text.match(/^ieee.std_logic_unsigned.all/gi) !== null) {
                    this.addMessage({
                        range: useStatement.range,
                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                        message: `This library shall not be used`
                    });
                }
                if (useStatement.text.match(/^ieee.std_logic_signed.all/gi) !== null) {
                    this.addMessage({
                        range: useStatement.range,
                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                        message: `This library shall not be used`
                    });
                }
            }
        }
    }


    checkAll() {
        if (this.tree) {
            utils.message("checking file " + this.tree.file)
            utils.debuglog("with CheckStdLogicArith " + this.options.CheckStdLogicArith)
            utils.debuglog("with CheckProcessReset   " + this.options.CheckProcessReset)
            utils.debuglog("with CheckCodingRules              " + this.options.CheckCodingRules)
            this.parseProtected();
            this.parsePackages();
            if (this.options.CheckCodingRules) this.checkHeader()
            this.checkEntity()
            this.checkCases()
            this.checkNotDeclared();
            this.checkLibrary();
            this.checkTodos();
            if (this.tree.options.CheckClockCrossing) this.checkClkCrossing();
            if (this.tree instanceof objects_1.OFileWithEntityAndArchitecture) {
                this.checkResets();
                this.checkUnused(this.tree.architecture, this.tree.entity);
                this.checkDoubles();
                this.checkPortDeclaration();
                this.checkGenericsDeclaration();
                this.checkTypesDeclaration(this.tree.architecture);
                this.checkProcess()
                this.checkInstantiations(this.tree.architecture);
                this.checkProcedures(this.tree.architecture);
                //this.checkMultipleDrivers()
            }
            // this.parser.debugObject(this.tree);
        }
        return this.messages;
    }

    checkHeader() {
        //TODOs
        let b = [... this.text.matchAll(/-{40}.*\r*\n-{2}!\s*\\file.*[\s\S]+[--]!\s*\\section[\s\S]+[--]!\s*\\copyright[\s\S]+[--]!\s*\\author\s*([a-zA-Z]*)[\s\S]+[--]!\s*\\creation\s*([0-9a-z/]*)[\s\S]+[--]! \\brief([\s\S]+)-{40}.*/gi)]
        let a = b[0]
        if (!a) a = []
        if (a.length !== 4) {
            this.addMessage({
                range: new objects_1.OIRange(this.tree, 0, 9),
                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                message: `Please add the Deltatec header to the file`
            });
            return
        }
        if ((a[1].length === 0) || (a[1].startsWith("author"))) {
            this.addMessage({
                range: new objects_1.OIRange(this.tree, this.text.toLowerCase().indexOf('--! \\author'), this.text.toLowerCase().indexOf('--! \\author') + 12),
                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                message: `Please add the author of the file in the header`
            });

        }
        if (a[2].replace(/[-\s\n]/g, "").length === 0) {
            this.addMessage({
                range: new objects_1.OIRange(this.tree, this.text.toLowerCase().indexOf('--! \\creation'), this.text.toLowerCase().indexOf('--! \\creation') + 14),
                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                message: `Please add the creation date in the header`
            });

        }
        if ((a[3].replace(/[-!\s\n]/g, "").length < 10) || (a[1].startsWith("This section must describe the entity's functionality"))) {
            this.addMessage({
                range: new objects_1.OIRange(this.tree, this.text.toLowerCase().indexOf('--! \\brief'), this.text.toLowerCase().indexOf('--! \\brief') + 10),
                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                message: `Description in the brief section should be completed`
            });
        }

    }

    checkDoubles() {
        if (!(this.tree instanceof objects_1.OFileWithEntityAndArchitecture)) {
            return;
        }
        for (const signal of this.tree.architecture.signals) {
            if (this.tree.architecture.signals.find(signalSearch => signal !== signalSearch && signal.name.text.toLowerCase() === signalSearch.name.text.toLowerCase())) {
                this.addMessage({
                    range: signal.range,
                    severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                    message: `signal ${signal.name} defined multiple times`
                });
            }
        }
        for (const type of this.tree.architecture.types) {
            if (this.tree.architecture.types.find(typeSearch => type !== typeSearch && type.name.text.toLowerCase() === typeSearch.name.text.toLowerCase())) {
                this.addMessage({
                    range: type.range,
                    severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                    message: `type ${type.name} defined multiple times`
                });
            }
            if (type instanceof objects_1.OEnum) {
                for (const state of type.states) {
                    if (type.states.find(stateSearch => state !== stateSearch && state.name.text.toLowerCase() === stateSearch.name.text.toLowerCase())) {
                        this.addMessage({
                            range: state.range,
                            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                            message: `state ${state.name} defined multiple times`
                        });
                    }
                }
            }
        }
        if (this.tree.entity) {
            for (const port of this.tree.entity.ports) {
                if (this.tree.entity.ports.find(portSearch => port !== portSearch && port.name.text.toLowerCase() === portSearch.name.text.toLowerCase())) {
                    this.addMessage({
                        range: port.range,
                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                        message: `port ${port.name} defined multiple times`
                    });
                }
            }
        }
    }

    get_process(signal) {
        let p = signal
        while (!((p instanceof objects_1.OProcess) || (p instanceof objects_1.OArchitecture))) {
            if (p.parent) {
                p = p.parent
            }
            else return null
        }
        return p
    }

    checkMultipleDrivers() {
        if (!(this.tree instanceof objects_1.OFileWithEntityAndArchitecture)) {
            return;
        }
        for (const signal of this.tree.architecture.signals) {
            let driving_process = null
            let pre_w
            for (const w of signal.mentions.filter(s => s instanceof objects_1.OWrite)) {
                const pre_driving = driving_process
                driving_process = this.get_process(w);

                if (((driving_process != pre_driving) && (pre_driving != null)) ||
                    ((driving_process === pre_driving) && (driving_process instanceof objects_1.OArchitecture))) {
                    let line1 = 0
                    let line2 = 0
                    if (driving_process instanceof objects_1.OArchitecture) line1 = w.range.start.line
                    else line1 = driving_process.range.start.line
                    if (pre_driving instanceof objects_1.OArchitecture) line2 = pre_w.range.start.line
                    else line2 = pre_driving.range.start.line
                    this.addMessage({
                        range: w.range,
                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                        message: `signal '${w.text}' has multiple drivers: processes on line ${line1 + 1} and on line ${line2 + 1}`
                    });

                }
                pre_w = w
            }
        }
    }


    pushWriteError(write) {
        const actions = [];
        const code = this.addCodeActionCallback((textDocumentUri) => {
            if (this.tree instanceof objects_1.OFileWithEntityAndArchitecture) {
                const args = { textDocumentUri, vscode_languageserver_1, signalName: write.text, range: this.tree.architecture.range };
                actions.push(vscode_languageserver_1.CodeAction.create('add signal to architecture',
                    vscode_languageserver_1.Command.create('add signal to architecture', 'vhdl-toolbox:add-signal', args), vscode_languageserver_1.CodeActionKind.QuickFix));
            }
            return actions;
        });
        this.addMessage({
            code: code,
            range: write.range,
            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
            message: `signal '${write.text}' is not declared`
        });
    }
    pushReadError(read) {
        const code = this.addCodeActionCallback((textDocumentUri) => {
            const actions = [];
            for (const pkg of this.projectParser.getPackages()) {
                const thing = pkg.constants.find(constant => constant.name.text.toLowerCase() === read.text.toLowerCase()) || pkg.types.find(type => type.name.text.toLowerCase() === read.text.toLowerCase())
                    || pkg.functions.find(func => func.name.text.toLowerCase() === read.text.toLowerCase());
                if (thing) {
                    const file = read.getRoot();
                    const pos = vscode_languageserver_1.Position.create(0, 0);
                    if (file.useStatements.length > 0) {
                        pos.line = file.useStatements[file.useStatements.length - 1].range.end.line + 1;
                    }
                    actions.push(vscode_languageserver_1.CodeAction.create('add use statement for ' + pkg.name, {
                        changes: {
                            [textDocumentUri]: [vscode_languageserver_1.TextEdit.insert(pos, `use ${pkg.library ? pkg.library : 'work'}.${pkg.name}.all;\n`)]
                        }
                    }, vscode_languageserver_1.CodeActionKind.QuickFix));
                }
            }
            if (this.tree instanceof objects_1.OFileWithEntityAndArchitecture) {
                const args = { textDocumentUri, vscode_languageserver_1, signalName: read.text, range: this.tree.architecture.range };
                actions.push(vscode_languageserver_1.CodeAction.create('add signal to architecture',
                    vscode_languageserver_1.Command.create('add signal to architecture', 'vhdl-toolbox:add-signal', args), vscode_languageserver_1.CodeActionKind.QuickFix));
            }
            return actions;
        });
        this.addMessage({
            range: read.range,
            code: code,
            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
            message: `signal '${read.text}' is not declared`
        });
    }



    checkProcess() {
        let msg = ""
        if (!(this.tree instanceof objects_1.OFileWithEntityAndArchitecture) || (!this.tree.entity)) {
            return [];
        }
        const assignments = this.tree.objectList.filter(object => object instanceof objects_1.OAssignment);
        //const conditions = this.tree.objectList.filter(object => object instanceof objects_1.OIfClause);
        const processes = this.tree.objectList.filter(object => object instanceof objects_1.OProcess);
        for (const ass of assignments.filter(a => a.writes.length > 0)) {
            if (ass.writes[0].definition) {
                if (ass.writes[0].definition instanceof objects_1.OVariable) {
                    if (this.text.substring(ass.range.start.i, ass.range.end.i).indexOf(":=") === -1) {
                        this.addMessage({
                            range: new objects_1.OIRange(ass, ass.range.start.i, ass.range.start.i + this.text.substring(ass.range.start.i).indexOf("\n")),
                            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                            message: `variable should be assigned with := `
                        });
                    }
                }
            }
        }


        for (const process of processes) {
            process.getResets()
            //console.log("checking process which is  " + typeof (process.reset_signal))
            const endCharacter = this.text.split('\n')[process.range.start.line].length;
            const range = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(process.range.start.line, 0), vscode_languageserver_1.Position.create(process.range.start.line, endCharacter));
            const arr = process.text.split('\n')

            if (this.options.CheckCodingRules) {
                for (const variable of process.variables) {
                    let first = 0;
                    let used = 0;

                    if ((variable.name.text.match(/^v_[a-z0-9_]+/) === null) && (!variable.constant)) {
                        this.addMessage({
                            range: variable.range,
                            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                            message: `Coding rule: Variable '${variable.name}' should be v_<lowercase>`
                        });
                    }
                    if (((variable.name.text.match(/^C_[A-Z0-9_]+/) === null) || (variable.name.text.match(/[a-z]+/) !== null)) && (variable.constant)) {
                        this.addMessage({
                            range: variable.range,
                            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                            message: `Coding rule: Constant '${variable.name}' should be C_<upppercase>`
                        });
                    }
                }

            }

            if (process.isRegisterProcess()) {
                if (this.options.CheckCodingRules) {
                    if (process.clock.match(/[A-Za-z_0-9]*clk/i) === null) {
                        this.addMessage({
                            range: range,
                            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                            message: `Coding rule: Clock signal '${process.clock}' should  end in clk`
                        });
                    }
                    if (process.reset_signal) {
                        let ok = false
                        for (const r of process.reset_signal) {
                            if (r.match(/[A-Za-z_0-9]*rst/i) !== null) ok = true
                        }
                        if ((!ok) && (this.options.CheckProcessReset)) {
                            let rst = ""
                            if (process.reset_signal) {
                                rst = `'${process.reset_signal.join(', ')}'`
                            }
                            this.addMessage({
                                range: range,
                                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                                message: 'Coding rule: at least one reset signal of ' + rst + ' should  end in rst'
                            });
                        }
                    }
                }
                if (process.reset_signal) {
                    if (process.reset_type === "async") {
                        if (process.hasSensitivityList()) {
                            let exp_sensi = [process.clock.trim().toLowerCase().replace(/\(.*?\)/, "")]
                            exp_sensi = exp_sensi.concat(process.reset_signal)
                            const missing = []
                            for (const e of exp_sensi) {
                                let ee = e.replace("(", "")
                                if (process.getSensitivityList().search(new RegExp(`\\b${ee}\\b`, "i")) === -1) {
                                    missing.push(e)
                                }
                            }
                            if ((missing.length > 0) || (process.getSensitivityList().split(",").length !== exp_sensi.length)) {
                                this.addMessage({
                                    range: range,
                                    severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                                    message: `Sensitivity list of an asynchronously reset process should only include clk '${process.clock}' and reset(s) '${process.reset_signal}'`
                                });
                            }
                        }
                        else {
                            this.addMessage({
                                range: range,
                                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                                message: 'synchronous process should have a sensitivity list!'
                            });
                        }
                    }
                    if (process.reset_type == "sync") {
                        if (process.hasSensitivityList()) {
                            let exp_sensi = [process.clock.trim().toLowerCase().replace(/\(.*?\)/, "")]
                            const missing = []
                            for (const e of exp_sensi) {
                                let ee = e.replace("(", "")
                                if (!process.getSensitivityList().toLowerCase().includes(ee)) {
                                    missing.push(e)
                                }
                            }

                            if ((missing.length > 0) || (process.getSensitivityList().split(",").length !== exp_sensi.length)) {
                                this.addMessage({
                                    range: range,
                                    severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                                    message: `Sensitivity list of a synchronous process should only include clk '${process.clock}'`
                                });
                            }
                        }
                        else {
                            this.addMessage({
                                range: range,
                                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                                message: 'synchronous process should have a sensitivity list!'
                            });
                        }
                    }
                }
                if ((!process.reset_signal) && (this.options.CheckProcessReset)) {
                    //onsole.log("resets = "+process.reset_signal)
                    this.addMessage({
                        range: range,
                        severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                        message: `Missing reset for this synchronous process'`
                    });
                }
            }
            else {
                if (process.hasSensitivityList()) {
                    const missing = process.getMissingSensitivityList()
                    const notneeded = process.getNotNeededSensitivityList()
                    for (const s of notneeded) {
                        this.addMessage({
                            range: range,
                            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                            message: `Signal '${s}' not needed in sensitivity list`
                        });

                    }
                    for (const s of missing) {
                        this.addMessage({
                            range: range,
                            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                            message: `Signal '${s}' missing in sensitivity list`
                        });

                    }

                }
            }
        }
    }


    checkNotDeclared() {
        let attDefs = this.tree.objectList.filter(object => object instanceof objects_1.OAttributeDef)
        if (this.packages.filter(p => p.attribute_defs)) {
            for (const p of this.packages.filter(p => p.attribute_defs)) {
                attDefs = attDefs.concat(p.attribute_defs)
            }
        }

        for (const a of this.tree.objectList.filter(object => object instanceof objects_1.OAttribute)) {
            a.definition = attDefs.find(d => d.name.text.toLowerCase() === a.name.text.toLowerCase())
            if (!a.definition) {

                this.addMessage({
                    range: a.range,
                    severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                    message: `attribute '${a.name.text}' is not declared`
                });
            }
        }
        const a = this.tree.objectList.filter(object => (!(object.parent instanceof objects_1.OFunction) && !(object.parent instanceof objects_1.OProcedure)))
        const b = a.filter(obj => (((obj.definition === null) || ((typeof obj.definition === "undefined"))) && ((obj instanceof objects_1.ORead) || (obj instanceof objects_1.OWrite) || (obj instanceof objects_1.OMappingName))))
        for (let obj of b) {
            //console.log("pdeb check "+(obj instanceof objects_1.OMappingName)
            let a = this.
                GetDefFromPackages(obj);
            if (a != null) {
                //console.log("pdeb solved "+obj.text+", "+obj.type)
                obj.definition = a;
                continue
            }

            if (obj instanceof objects_1.ORead) {
                //console.log("launching rerror for " + obj.text)
                if (!(obj.text.trim().toLowerCase() === "force") && !(obj.text.trim().toLowerCase() === "release")) {
                    this.pushReadError(obj);
                }
            }
            else if (obj instanceof objects_1.OWrite) {
                //console.log("launching werror for " + obj.text)
                this.pushWriteError(obj);
            }
            /*else if (obj instanceof objects_1.OMappingName && typeof obj.definition === 'undefined') {
                
                console.log('problem with map '+obj.text+ ", ")
                this.pushReadError(obj);
            }*/
        }
    }

    checkCases() {
        // checks:
        // - if all enum types are used in a case
        // - if the size of each when is equal to the signal size (when no enum)
        const cases = this.tree.objectList.filter(object => object instanceof objects_1.OCase);
        if (cases.length > 0) {
            for (const c of cases) {
                let type = ''
                let casesignal
                if ((this.tree.architecture) && (this.tree.entity)) {
                    let signalLike = this.tree.architecture.signals;
                    signalLike = signalLike.concat(this.tree.entity.ports);
                    for (const s of signalLike) {
                        if (s.name.text === c.signal.trim()) {
                            if (s.type.length > 0) {
                                //type = s.typename;
                                type = s.type[0].text;
                                casesignal = s
                                break;
                            }
                        }
                    }
                }
                //console.log("case on signal "+casesignal.name.text + " of type "+casesignal.type[0].text + ", " + casesignal.typename)
                let fsm = false
                if (casesignal) fsm = ((casesignal.name.text.indexOf("state") > -1) || (casesignal.name.text.indexOf("fsm") > -1))

                //console.log("checking case "+c.signal.trim()+" of type "+ type)
                if ((type !== '') && (casesignal)) {
                    for (const t of this.tree.objectList.filter(object => object instanceof objects_1.OType)) {
                        if (t.name.text.toLowerCase() === type.toLowerCase().trim()) {
                            //console.log("found type "+t.name.text+" "+type)
                            type = t;
                            break
                        }
                    }
                    if (type.states) {
                        for (const state of type.states) {
                            let found = false
                            if (this.options.CheckCodingRules) {
                                if ((fsm) && (!state.name.text.startsWith("S_"))) {
                                    this.addMessage({
                                        range: state.range,
                                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                                        message: `Coding rule: States of a FSM should start with S_`
                                    });
                                }
                            }
                            for (const w of c.whenClauses) {
                                if (w.conditionName.toLowerCase() === state.name.text.toLowerCase()) {
                                    found = true
                                    //console.log("found when "+ w.conditionName)
                                    break;
                                }
                            }
                            if (!found) {
                                this.addMessage({
                                    range: state.range,
                                    severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                                    message: `This state is not used`
                                });
                            }
                        }
                    }
                    else {
                        let low = -1
                        let high = -1
                        //console.log("casesig "+ casesignal.name.text)
                        //console.log("casesig "+ casesignal.constructor.name)
                        const a = casesignal.getSignalRange()
                        low = a[0]
                        high = a[1]
                        if (low > -1) {
                            const length = (high - low + 1)
                            for (const w of c.whenClauses) {
                                if (w.conditionName.startsWith('"') && ((w.conditionName.length - 2) !== length)) {
                                    this.addMessage({
                                        range: w.range,
                                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                                        message: `When ${w.conditionName} has different size than case signal ${casesignal.name.text}`
                                    });
                                }
                                if (w.conditionName.toLowerCase().startsWith('x"') && ((w.conditionName.length - 3) * 4 !== length)) {
                                    this.addMessage({
                                        range: w.range,
                                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                                        message: `When ${w.conditionName} has different size than case signal ${casesignal.name.text}`
                                    });
                                }
                            }

                        }
                    }

                }
            }
        }

    }


    getCodeLens(textDocumentUri) {
        if (!(this.tree instanceof objects_1.OFileWithEntityAndArchitecture)) {
            return [];
        }
        let codeLenses = [];
        let signalLike = this.tree.architecture.signals;
        if (this.tree.entity) {
            signalLike = signalLike.concat(this.tree.entity.ports);
        }
        const processes = this.tree.objectList.filter(object => object instanceof objects_1.OProcess);
        const signalsMissingReset = signalLike.filter(signal => {
            if ("isRegister" in signal) {
                if (signal.isRegister() === false) {
                    return false;
                }
            }
            for (const process of processes) {
                if ("isRegisterProcess" in process) {
                    if (process.isRegisterProcess()) {
                        for (const reset of process.getResets()) {
                            if (reset.toLowerCase() === signal.name.text.toLowerCase()) {
                                return false;
                            }
                        }
                    }
                }
            }
            if ("getRegisterProcess" in signal) {
                const registerProcess = signal.getRegisterProcess();
                if (!registerProcess) {
                    return false;
                }
                return this.checkMagicComments(registerProcess.range, LinterRules.Reset, signal.name.text);
            }
        });
        if (signalsMissingReset.length > 0) {
            const registerProcessMap = new Map();
            for (const signal of signalsMissingReset) {
                const registerProcess = signal.getRegisterProcess();
                if (!registerProcess) {
                    continue;
                }
                let registerProcessList = registerProcessMap.get(registerProcess);
                if (!registerProcessList) {
                    registerProcessList = [];
                    registerProcessMap.set(registerProcess, registerProcessList);
                }
                registerProcessList.push(signal);
            }

            const source_code = this.tree.text;
            let changes = []
            let ch = []
            for (const [registerProcess, signalLikes] of registerProcessMap.entries()) {
                const registerNameList = signalLikes.map(signalLike => signalLike.name.text).join(' ');
                if (registerProcess.reset_signal) {
                    //console.log("blala " + registerNameList)
                    //console.log("blala " + registerProcess.reset_range.start.line)

                    const indent = this.tree.originalText.split('\n')[registerProcess.reset_range.start.line + 1].search(/\S/)
                    let resetValue = "; -- TODO : add the reset value for this signal\n"
                    for (const r of registerNameList.split(' ')) {
                        let type = ""
                        for (const signal of signalLike) {
                            if (signal.name.text.toLowerCase() == r.toLowerCase()) {
                                type = signal.type.map(read => read.text)[0]
                            }
                        }
                        if (!type) type = "" // prevent error in the checks below
                        resetValue = "; -- TODO : add the reset value for this signal\n"
                        if (["std_logic", "std_ulogic"].includes(type)) resetValue = "'0';\n"
                        if (["std_ulogic_vector", "std_logic_vector", "unsigned", "signed"].includes(type)) resetValue = "(others => '0');\n"
                        else if (["positive", "natural", "integer"].includes(type)) resetValue = "0;\n"
                        else if (type.search(/boolean/) >= 0) resetValue = "false;\n"
                        else if (type.search(/real/) >= 0) resetValue = "0.0;\n"
                        //utils.debuglog("Adding "+r + ` <= ${resetValue}` +" ".repeat(indent+3) )
                        ch += (r + ` <= ${resetValue}` + " ".repeat(indent + 3))
                        //console.log("indent "+ indent)
                    }
                    let pos = registerProcess.reset_range.start

                    //utils.debuglog("pushing codelens")
                    //utils.debuglog("   "+ch)
                    changes.push(vscode_languageserver_1.TextEdit.insert(pos, ch));
                    codeLenses.push({
                        range: registerProcess.range,
                        command: this.addCommandCallback('Complete all missing resets ', textDocumentUri, () => changes)
                    });
                }
            }
        }// missing signals
        for (const proc of processes) {
            if (!proc.hasSensitivityList()) continue
            let changes = []
            let first_line = proc.text.substring(0, proc.text.search("\n"))
            let missing
            //console.log("code len "+ first_line)
            missing = proc.getMissingSensitivityList()
            //console.log("    missing "+ missing)
            let additional_signals = missing.join(", ");
            if (proc.getSensitivityList().length > 0) additional_signals += ", "

            //console.log("    additional signals"+ additional_signals)
            if (missing.length > 0) {
                const offset = first_line.match(/\s*[a-zA-Z0-9_]*\s*:*\s*process\s*\(/gi)[0].length
                //console.log("    offset"+offset)
                //console.log("    start of change " + this.tree.text.substring(proc.range.start.i, proc.range.start.i+offset))
                let pos = proc.range.start
                pos.i += offset
                //console.log("type "+ pos.constructor.name)
                codeLenses.push({
                    range: proc.range,
                    command: this.addCommandCallback('Complete sensitivity list ' + proc.label, textDocumentUri, () => {
                        changes.push(vscode_languageserver_1.TextEdit.insert(pos, additional_signals));
                        return changes;
                    })
                });
            }
        }
        return codeLenses;
    }
    checkResets() {
        if (((this.tree instanceof objects_1.OFileWithEntityAndArchitecture) == false) || (!this.options.CheckProcessReset)) {
            return;
        }
        if (!this.tree.architecture) return
        let signalLike = this.tree.architecture.signals;
        if (this.tree.entity) {
            signalLike = signalLike.concat(this.tree.entity.ports);
        }
        const processes = this.tree.objectList.filter(object => object instanceof objects_1.OProcess);

        for (const signal of signalLike.filter(s => !(s instanceof objects_1.OVariable)).filter(s => (s.isRegister() === true))) {
            /*if (signal.isRegister() === false) {
                continue;
            }*/
            //console.log('checking signal '+ signal.name)
            let resetFound = false;
            for (const process of processes.filter(p => (p.isRegisterProcess()))) {
                //if (process.isRegisterProcess()) {
                process.getResets() // to init process.reset_signal
                if (process.reset_signal) {
                    for (const reset of process.getResets()) {
                        if (reset.toLowerCase() === signal.name.text.toLowerCase()) {
                            resetFound = true;
                            //console.log("reset found for "+reset)
                        }
                    }
                }
                //}
            }
            const registerProcess = signal.getRegisterProcess();
            if (!resetFound && registerProcess && registerProcess.reset_signal) {
                //console.log("reset missing for "+ signal.type.map(read => read.text).join(' '))
                const code = this.addCodeActionCallback((textDocumentUri) => {
                    const actions = [];
                    let resetValue = null;
                    let type = signal.type.map(read => read.text)[0] // changed from read.text.join(' ') to this because it did not work for std_logic_vector(test'high downto test'low)
                    if (typeof type !== 'undefined') {
                        resetValue = '; -- TODO : correct this reset value\n'
                        if (["std_logic", "std_ulogic"].includes(type)) resetValue = "'0';\n"
                        if (["std_ulogic_vector", "std_logic_vector", "unsigned", "signed"].includes(type)) resetValue = "(others => '0');\n"
                        else if (["positive", "natural", "integer"].includes(type)) resetValue = "0;\n"
                        else if (type.search(/boolean/) >= 0) resetValue = "false;\n"
                        else if (type.search(/real/) >= 0) resetValue = "0.0;\n"
                        if (resetValue !== null) {
                            let positionStart = vscode_languageserver_1.Position.create(registerProcess.reset_range.start.line, registerProcess.reset_range.start.character);
                            positionStart.line++;
                            const indent = positionStart.character;
                            positionStart.character = 0;
                            actions.push(vscode_languageserver_1.CodeAction.create('Add reset for ' + signal.name, {
                                changes: {
                                    [textDocumentUri]: [vscode_languageserver_1.TextEdit.insert(positionStart, ' '.repeat(indent) + `${signal.name} <= ${resetValue}`)]
                                }
                            }, vscode_languageserver_1.CodeActionKind.QuickFix));
                        }
                    }
                    return actions;
                });
                const endCharacter = this.text.split('\n')[registerProcess.range.start.line].length;
                const range = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(registerProcess.range.start.line, 0), vscode_languageserver_1.Position.create(registerProcess.range.start.line, endCharacter));
                const message = `Reset '${signal.name.text}' missing`;

                this.addMessage({
                    range,
                    code,
                    severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                    message
                }, LinterRules.Reset, signal.name.text);
            }
        }
    }
    checkUnused(architecture, entity) {
        if (!architecture) {
            return;
        }

        if (entity) {
            for (const port of entity.ports) {
                if (port.direction === 'in' && port.mentions.filter(token => token instanceof objects_1.ORead).length === 0) {
                    this.addMessage({
                        range: port.range,
                        severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                        message: `Input port '${port.name}' not used`
                    });
                }
                const writes = port.mentions.filter(token => token instanceof objects_1.OWrite);
                if (port.direction === 'out' && writes.length === 0) {
                    this.addMessage({
                        range: port.range,
                        severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                        message: `Output port '${port.name}' never assigned'`
                    });
                }
            }
            for (const port of entity.generics) {
                if (port.mentions.filter(token => token instanceof objects_1.ORead).length === 0) {
                    this.addMessage({
                        range: port.range,
                        severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                        message: `Generic '${port.name}' not used`
                    });
                }
            }
        }
        for (const signal of architecture.getRoot().objectList.filter(object => object instanceof objects_1.OSignal)) {
            let msg = ""
            let kind = "Signal"
            const attributes = architecture.getRoot().objectList.filter(object => object instanceof objects_1.OAttribute)
            if (signal.constant) {
                kind = "Constant"
            }

            if ((signal.mentions.filter(token => token instanceof objects_1.ORead).length !== 0)) {
                msg += "r"
            }
            const writes = signal.mentions.filter(token => token instanceof objects_1.OWrite);
            if ((!signal.constant && writes.length !== 0)) {
                msg += "w"
            }
            if (signal.constant || signal.defaultValue) {
                msg += "w"
            }

            for (const mp of signal.mentions.filter(token => token instanceof objects_1.OMappingName)) {
                if (mp.parent.mappingIfOutput) {
                    if (mp.parent.mappingIfOutput.flat().filter(p => p instanceof objects_1.OWrite && p.text === mp.text)) {
                        msg += "w"
                    }
                    if (mp.parent.mappingIfOutput.flat().filter(p => p instanceof objects_1.ORead && p.text === mp.text)) {
                        msg += "r"
                    }
                }
                if (mp.parent.mappingIfInput) {
                    if (mp.parent.mappingIfInput.flat().filter(p => p instanceof objects_1.OWrite && p.text === mp.text)) {
                        msg += "w"
                    }
                    if (mp.parent.mappingIfInput.flat().filter(p => p instanceof objects_1.ORead && p.text === mp.text)) {
                        msg += "r"
                    }
                }
                //if (mp.parent.) ==> check here if the interface is input or output!!
            }
            if (signal.isAlias) {
                msg += 'w' // aliases are a copy of something else, and so by definition are written during initialization
            }

            if (msg.includes('w')) {
                if (msg.includes('r')) {
                    msg = ""
                }
                else {
                    msg = "is assigned but never used"
                }
            }
            else {
                if (msg.includes('r')) {
                    msg = "is used but never assigned"
                }
                else {
                    msg = "is not used nor assigned"
                }
            }
            if (msg != "") {
                this.addMessage({
                    range: signal.range,
                    severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                    message: `${kind} '${signal.name}' ${msg}`
                });
            }

            if (signal.constant) {
                if (this.options.CheckCodingRules) {
                    if (((signal.name.text.match(/^C_[0-9A-Z_]+/) === null) && (signal.name.text.match(/^S_[0-9A-Z_]+/) === null)) || (signal.name.text.match(/[a-z]+/) !== null)) {
                        this.addMessage({
                            range: signal.range,
                            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                            message: `Coding rule: Constant name ${signal.name} should be C_<uppercase>.`
                        });
                    }
                }
                /*for (const write of writes) {
                    this.addMessage({
                        range: write.range,
                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                        message: `Constant ${signal.name} cannot be changed.`
                    });
                }*/
            }
            else {
                if (this.options.CheckCodingRules) {
                    if (signal.name.text.search(/[A-Z]+/) >= 0) {
                        this.addMessage({
                            range: signal.range,
                            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                            message: `Coding rule: Signal name ${signal.name} should be <lowercase>.`
                        });
                    }
                }
            }
        }
    }
    checkPortDeclaration() {
        if ((this.tree instanceof objects_1.OFileWithEntity === false) || (!this.tree.entity)) {
            return;
        }

        if (this.options.CheckCodingRules) {
            const tree = this.tree;
            for (const port of tree.entity.ports.filter(p => (p.name.text.match(/^[0-9A-Z_]+/) === null) || (p.name.text.match(/[a-z]+/) !== null))) {
                //console.debug(port.name.text)
                //if (){
                this.addMessage({
                    range: port.range,
                    severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                    message: `Coding rule: Port '${port.name}' should be in uppercase`,
                });
            }
            //}
        }
    }

    checkGenericsDeclaration() {
        if ((this.tree instanceof objects_1.OFileWithEntity === false) || (!this.tree.entity)) {
            return;
        }

        const tree = this.tree;
        if (this.options.CheckCodingRules) {
            for (const port of tree.entity.generics) {
                let newName = ""
                if (port instanceof objects_1.OPort) {
                    // only check names of normal generic ports, not of generic types or packages.
                    if ((port.name.text.match(/^G_[A-Z]+/) === null) || (port.name.text.match(/[a-z]+/) !== null)) {
                        const code = this.addCodeActionCallback((textDocumentUri) => {
                            const actions = [];
                            //const newName = port.name.text.replace(/^(._|_?)/, 'i_');
                            if (port.name.text.match(/^g_[0-9A-Z_a-z]+/) === null) {
                                newName = "G_" + port.name.text.toUpperCase() + " ";
                            }
                            else {
                                newName = port.name.text.toUpperCase();
                            }

                            actions.push(vscode_languageserver_1.CodeAction.create(`Replace portname with '${newName}`, {
                                changes: {
                                    [textDocumentUri]: [vscode_languageserver_1.TextEdit.replace(port.name.range, newName)]
                                }
                            }, vscode_languageserver_1.CodeActionKind.QuickFix));
                            return actions;
                        });
                        this.addMessage({
                            range: port.range,
                            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                            message: `Generic '${port.name}' should be G_<uppercase> ${newName}`,
                            code
                        });
                    }

                }
            }
        }
    }


    getProjectEntity(instantiation) {
        let projectEntities = this.projectParser.getEntities();
        // in case of parsing only packages, make sure projectEntities is  not empty
        if (!projectEntities) projectEntities = this.projectParser.getPackages();
        if (instantiation.library) {
            const entityWithLibrary = projectEntities.find(entity => entity.name.toLowerCase() === instantiation.componentName.toLowerCase() && typeof entity.library !== 'undefined' && typeof instantiation.library !== 'undefined' && entity.library.toLowerCase() === instantiation.library.toLowerCase());
            if (entityWithLibrary) {
                //console.log("found entity : "+entityWithLibrary.text.substring(entityWithLibrary.range.start,entityWithLibrary.range.end))
                return entityWithLibrary;
            }
        }
        if (!instantiation.componentName) return null
        const entity = projectEntities.find(entity => entity.name.toLowerCase() === instantiation.componentName.toLowerCase());
        if (entity) return entity
        else { // in case of a project with  packages
            const entity = this.projectParser.getPackages().find(entity => entity.name.toLowerCase() === instantiation.componentName.toLowerCase());
            if (entity) return entity
        }
        return null
    }

    checkClkCrossing() {
        for (const process of this.tree.objectList.filter(object => object instanceof objects_1.OProcess)) {
            if (process.isRegisterProcess()) {
                const writes = process.getFlatWrites()
                const clk = process.clock
                for (const proc of this.tree.objectList.filter(object => {
                    if (object instanceof objects_1.OProcess) {
                        if (object.isRegisterProcess() && (object.clock !== clk)) {
                            //console.log("Found "+object.text.substring(0, object.text.indexOf('\n')))
                            return true;
                        }
                        return false;
                    }
                    return false;
                })) {
                    // all clocked processes which have a different clock than the current process
                    const reads = proc.getFlatReads()
                    let wr = []
                    for (const w of writes) {
                        wr.push(w.text)
                    }
                    for (const r of reads) {
                        if (wr.includes(r.text)) {
                            if ((this.tree.options.CheckClockCrossingStart !== 0) && (this.tree.options.CheckClockCrossingEnd !== 0)) {
                                if ((this.tree.options.CheckClockCrossingStart > r.range.start.line) || (this.tree.options.CheckClockCrossingEnd < r.range.end.line)) {
                                    this.addMessage({
                                        range: r.range,
                                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                                        message: `Signal ${r.text} is written on clock ${clk} and read on clock ${proc.clock}`,
                                    });

                                }

                            }
                        }
                    }
                }
            }
        }
    }



    checkInstantiations(architecture) {
        if (!architecture) {
            return;
        }
        // checks if:
        // - the port map doesn't contain non existing ports
        // - the port map contains all entity ports without default value.
        for (const instantiation of architecture.instantiations) {
            //console.log("instantiation found " + instantiation.componentName)
            if (instantiation.entityInstantiation) {
                const entity = this.getProjectEntity(instantiation);
                //console.log("entity found of " + instantiation.componentName)
                if (!entity) {
                    //console.log("range = " + instantiation.range.start.i + " - " + instantiation.range.end.i)
                    this.addMessage({
                        range: new objects_1.OIRange(instantiation, instantiation.range.start.i, instantiation.range.start.i + instantiation.text.indexOf('\n')),
                        severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                        message: `can not find entity ${instantiation.componentName}`
                    });
                }
                else {
                    // check if the port map doesn't contain non existing ports
                    const foundPorts = [];
                    if (instantiation.portMappings) {
                        for (const portMapping of instantiation.portMappings.children) {
                            const entityPort = entity.ports.find(port => {
                                for (const part of portMapping.name) {
                                    if (part.text.toLowerCase() === port.name.text.toLowerCase()) {
                                        return true;
                                    }
                                }
                                return false;
                            });
                            if (!entityPort) {
                                if (!(typeof portMapping.name[0] === 'undefined') || (typeof entity.ports === 'undefined')) {
                                    const bestMatch = string_similarity_1.findBestMatch(portMapping.name[0].text, entity.ports.map(port => port.name.text));
                                    const code = this.addCodeActionCallback((textDocumentUri) => {
                                        const actions = [];
                                        actions.push(vscode_languageserver_1.CodeAction.create(`Replace with ${bestMatch.bestMatch.target} (score: ${bestMatch.bestMatch.rating})`, {
                                            changes: {
                                                [textDocumentUri]: [vscode_languageserver_1.TextEdit.replace(vscode_languageserver_1.Range.create(portMapping.name[0].range.start, portMapping.name[portMapping.name.length - 1].range.end), bestMatch.bestMatch.target)]
                                            }
                                        }, vscode_languageserver_1.CodeActionKind.QuickFix));
                                        return actions;
                                    });
                                    const r = entity.range
                                    r.end.i = r.start.i + entity.text.substring(0, entity.text.search('\n')).length
                                    //utils.debuglog("port error in "+r.start.i+", "+r.end.i)
                                    this.addMessage({
                                        range: new objects_1.OIRange(instantiation, portMapping.range.start.i, portMapping.range.end.i),
                                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                                        message: `no port ${portMapping.name.map(name => name.text).join(', ')} on entity ${instantiation.componentName}`,
                                        code
                                    });
                                }
                            }
                            else {
                                foundPorts.push(entityPort);
                            }
                        }
                    }
                    for (const port of entity.ports) {
                        if (!port.defaultValue) port.defaultValue = '' // ports without default value return "" (in win)
                        if (port.direction === 'in' && (typeof port.defaultValue === 'undefined' || port.defaultValue === '') && typeof foundPorts.find(portSearch => portSearch === port) === 'undefined') {
                            this.addMessage({
                                range: new objects_1.OIRange(instantiation, instantiation.range.start.i, instantiation.range.start.i + instantiation.text.indexOf('\n')),
                                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                                message: `input port ${port.name} is missing in port map and has no default value on entity ${instantiation.componentName}`
                            });
                        }
                        if (port.direction !== 'in' && typeof foundPorts.find(portSearch => portSearch === port) === 'undefined') {
                            this.addMessage({
                                range: new objects_1.OIRange(instantiation, instantiation.range.start.i, instantiation.range.start.i + instantiation.text.indexOf('\n')),
                                severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                                message: `port ${port.name} is missing on entity ${instantiation.componentName}`
                            });
                        }

                    }
                }
            }
            else {
                this.addMessage({
                    range: instantiation.range,
                    severity: vscode_languageserver_1.DiagnosticSeverity.Hint,
                    message: `Can not evaluate instantiation via component`
                });
            }
        }
        for (const generate of architecture.generates) {
            this.checkInstantiations(generate);
        }
    }

    checkConstantDeclaration(architecture) {
        if (!architecture) {
            return;
        }
        if (this.options.CheckCodingRules) {
            for (const signal of architecture.getRoot().objectList.filter(object => object instanceof objects_1.OSignal)) {
                let kind = "Constant"
                let newName = ""
                if (signal.constant) {
                    if ((signal.name.text.match(/^C_[0-9A-Z_]+/) === null) || (signal.name.text.match(/[a-z]+/) !== null)) {
                        const code = this.addCodeActionCallback((textDocumentUri) => {
                            const actions = [];
                            if (signal.name.text.match(/^c_[0-9A-Z_]+/) === null) {
                                newName = signal.name.text.toUpperCase() + " ";
                            }
                            else {
                                newName = "C_" + signal.name.text.toUpperCase() + " ";
                            }

                            actions.push(vscode_languageserver_1.CodeAction.create(`Replace typename with '${newName}'`, {
                                changes: {
                                    [textDocumentUri]: [vscode_languageserver_1.TextEdit.replace(signal.name.range, newName)]
                                }
                            }, vscode_languageserver_1.CodeActionKind.QuickFix));
                            return actions;
                        });
                        this.addMessage({
                            range: signal.range,
                            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                            message: `Coding rule: Constant name ${signal.name} should be C_<uppercase>.`,
                            code
                        });
                    }
                }
            }
        }
    }


    checkTypesDeclaration(architecture) {
        if (!architecture) {
            return;
        }
        if (this.options.CheckCodingRules) {

            for (const type of this.tree.architecture.types) {
                if (type.name.text.match(/^t_[0-9a-z_]+/) === null) {
                    const code = this.addCodeActionCallback((textDocumentUri) => {
                        const actions = [];
                        const newName = "t_" + type.name.text.toLowerCase() + " ";

                        actions.push(vscode_languageserver_1.CodeAction.create(`Replace typename with '${newName}'`, {
                            changes: {
                                [textDocumentUri]: [vscode_languageserver_1.TextEdit.replace(type.name.range, newName)]
                            }
                        }, vscode_languageserver_1.CodeActionKind.QuickFix));
                        return actions;
                    });
                    this.addMessage({
                        range: type.range,
                        severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                        message: `Coding rule: Type name ${type.name} should be t_<lowercase>.`,
                        code
                    });
                }

            }
        }
    }

    GetDefFromPackages(obj) {
        const def = this.projectParser.packages.find(m => m.name.toLowerCase() === obj.text.toLowerCase());
        if (def) return def
        if (obj.text.toLowerCase() === "std") return "OK" // patch to support lib.package.whatever
        for (const pack of this.projectParser.packages) {
            //console.log("checking package "+pack.name+" for "+obj.text)
            if (obj instanceof objects_1.OProcedureCall) {
                //console.log("pdeb proc detected")
                for (const proc of pack.procedures) {
                    if (obj.procedureName.text.toLowerCase() === proc.name.text.toLowerCase()) {
                        return proc;
                        //return obj
                    }
                }
                for (const tproc of pack.types.filter(m => m instanceof objects_1.OProtected)) {
                    for (const proc of tproc.procedures) {
                        if (obj.procedureName.text.toLowerCase() === proc.name.text.toLowerCase()) {
                            return proc;
                            //return obj
                        }
                    }
                }
            }
            if (obj instanceof objects_1.OFunction) {
                //console.log("pdeb funct detected")
                for (const proc of pack.functions) {
                    if (obj.name.text.toLowerCase() === proc.name.text.toLowerCase()) {
                        //obj.definition = proc;                                                   
                        return proc;
                    }
                }
                for (const tproc of pack.types.filter(m => m instanceof objects_1.OProtected)) {
                    for (const proc of tproc.functions) {
                        if (obj.procedureName.text.toLowerCase() === proc.name.text.toLowerCase()) {
                            return proc;
                            //return obj
                        }
                    }
                }
            }
            if ((obj instanceof objects_1.ORead) || (obj instanceof objects_1.OWrite) || (obj instanceof objects_1.OMappingName)) {
                //console.log("pdeb signal "+obj.text+", "+obj.constructor.name)
                if (obj.text.toLowerCase() === pack.name.toLowerCase()) return pack
                for (const proc of pack.constants) {
                    //console.log("pdeb checking for " + proc.name.text)
                    if (obj.text.toLowerCase() === proc.name.text.toLowerCase()) {
                        //obj.definition = proc;                                                   
                        return proc;
                    }
                }
                for (const proc of pack.types) {
                    //console.log("pdeb checking type " + proc.name.text)
                    if (proc instanceof objects_1.OEnum) {
                        if (proc.name.text.toLowerCase() === obj.text.toLowerCase()) {
                            return proc;
                        }
                        for (const state of proc.states) {
                            if (state.name.text.toLowerCase() === obj.text.toLowerCase()) {
                                return state;
                            }
                        }
                    }
                    else if (proc instanceof objects_1.OProtected) {
                        let def = proc.functions.find(m => m.name.text.toLowerCase() === obj.text.toLowerCase())
                        if (def) return def
                        def = proc.procedures.find(m => m.name.text.toLowerCase() === obj.text.toLowerCase())
                        if (def) return def
                        if (proc.name.text === obj.text.toLowerCase()) {
                            return proc;
                        }
                    }
                    else if (proc instanceof objects_1.ORecord) {
                        for (const child of proc.children) {
                            if (child.name.text.toLowerCase() === obj.text.toLowerCase()) {
                                return child;
                            }
                        }
                        if (proc.name.text === obj.text.toLowerCase()) {
                            return proc;
                        }
                    }
                    else {
                        if (proc.name.text.toLowerCase() === obj.text.toLowerCase()) {
                            return proc;
                        }
                    }

                }
                for (const proc of pack.functions) {
                    if (obj.name) {
                        if (obj.name.text.toLowerCase() === proc.name.text.toLowerCase()) {
                            //obj.definition = proc;                                                   
                            return proc;
                        }
                    } else if (obj.text) {
                        if (obj.text.toLowerCase() === proc.name.text.toLowerCase()) {
                            //obj.definition = proc;                                                   
                            return proc;
                        }
                    }
                }
            }
        }
        if (obj.text) return this.projectParser.packages.find(m => m.name === obj.text)
        return null
    }

    checkProcedures(architecture) {
        if (!architecture) {
            return;
        }
        for (let obj of architecture.getRoot().objectList.filter(m => ((m instanceof objects_1.OProcedureCall) && (!m.definition)))) {
            if (obj instanceof objects_1.OProcedureCall) {
                let searchObj = obj.parent;
                while (!(searchObj instanceof objects_1.OFile)) {
                    if (searchObj instanceof objects_1.OProcess) {
                        for (const procedureSearch of searchObj.procedures) {
                            if (procedureSearch.name.text === obj.procedureName.text) {
                                obj.definition = procedureSearch;
                                break;
                            }
                        }
                    }
                    if (searchObj instanceof objects_1.OArchitecture) {
                        for (const procedureSearch of searchObj.procedures) {
                            if (procedureSearch.name.text === obj.procedureName.text) {
                                obj.definition = procedureSearch;
                                break;
                            }
                        }
                        if (obj.procedureName.text.search(".") > -1) {
                            const name = obj.procedureName.text.split(".")[0]
                            for (const prot of searchObj.types) {
                                if (prot instanceof objects_1.OProtected) {
                                    for (const proc of prot.procedures) {
                                        if (proc.name.text.toLowerCase() === name.toLowerCase()) {
                                            obj.definition = proc;
                                            break;
                                        }
                                    }
                                }
                            }

                        }
                    }
                    searchObj = searchObj.parent;
                }
                if (!obj.definition) {
                    //console.log("pdb proc not defined "+obj.procedureName.text)
                    let def = this.GetDefFromPackages(obj);
                    if (def != null) {
                        obj.definition = def
                    }
                }
                if (!obj.definition) {
                    if (obj.procedureName.text.toLowerCase() !== "null") {
                        this.addMessage({
                            range: obj.procedureName.range,
                            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                            message: `procedure '${obj.procedureName.text}' is not declared`
                        });
                    }
                }
                else {
                    if (obj.portMap) {
                        for (const [index, portMapping] of obj.portMap.children.entries()) {
                            if (obj.definition.ports.length - 1 < index) {
                                this.addMessage({
                                    range: portMapping.range,
                                    severity: vscode_languageserver_1.DiagnosticSeverity.Error,
                                    message: `Too many Ports in Procedure Instantiation`
                                });
                            }
                            else {
                                if (obj.definition.ports[index].direction === 'in') {
                                    for (const mapping of portMapping.mappingIfOutput.flat()) {
                                        const index = this.tree.objectList.indexOf(mapping);
                                        this.tree.objectList.splice(index, 1);
                                        for (const mentionable of this.tree.objectList.filter(object => object instanceof objects_1.OMentionable)) {
                                            for (const [index, mention] of mentionable.mentions.entries()) {
                                                if (mention === mapping) {
                                                    mentionable.mentions.splice(index, 1);
                                                }
                                            }
                                        }
                                    }
                                    portMapping.mappingIfOutput = [[], []];
                                }
                            }
                        }
                    }
                    // for (const port of entity.ports) {
                    //   if (port.direction === 'in' && typeof port.defaultValue === 'undefined' && typeof foundPorts.find(portSearch => portSearch === port) === 'undefined') {
                    //     this.addMessage({
                    //       range: instantiation.range,
                    //       severity: DiagnosticSeverity.Error,
                    //       message: `input port ${port.name} is missing in port map and has no default value on entity ${instantiation.componentName}`
                    //     });
                    //   }
                    // }
                }
            }
        }
    }
    getIFromPosition(p) {
        let text = this.text.split('\n').slice(0, p.line);
        let i = text.join('\n').length + p.character;
        return i;
    }
}
exports.VhdlLinter = VhdlLinter;
// | {
//   title?: string,
//   priority?: number,
//   position: Range,
//   apply: (() => any),
// }
//# sourceMappingURL=vhdl-toolbox.js.map
// TODO : space between number and physical units
// TODO : find  dead states, 
// TODO : check if booleans are compared to false/true
// TODO : statemachine diagram
// TODO : check if header is OK

// TODO : batch autoformat
// TODO : when a litteral constant is used => info : consider putting it in a constant


// TODO : when signals are attributed, they are always fully OK with assigned and read


