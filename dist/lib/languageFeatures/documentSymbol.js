"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const language_server_1 = require("../language-server");
const objects_1 = require("../parser/objects");

function getComponents(architecture){
    const symbols = [];
    
    symbols.push(...architecture.instantiations.map(instantiation => ({
        name: instantiation.label + ': ' + instantiation.componentName,
        detail: "Component",
        kind: vscode_languageserver_1.SymbolKind.Class,
        range: instantiation.range,
        selectionRange: instantiation.range
    })));
    return symbols
}

function getSignals(architecture){
    const symbols = [];
    for (const signal of architecture.signals){
        if (!signal.constant){
            symbols.push(
                {
                    name: signal.name.text,
                    detail: signal.declaration,
                    kind: vscode_languageserver_1.SymbolKind.Variable,
                    range: signal.range,
                    selectionRange: signal.range    
                }
            )        
        }
    }
    return symbols
}

function getConstants(architecture){
    const symbols = [];
    for (const signal of architecture.signals){
        if (signal.constant){
            symbols.push(
                {
                    name: signal.name.text,
                    detail: signal.declaration,
                    kind: vscode_languageserver_1.SymbolKind.Variable,
                    range: signal.range,
                    selectionRange: signal.range    
                }
            )        
        }
    }
    return symbols
}

function getProcesses(architecture){
    const symbols = [];
    symbols.push(...architecture.processes.map(process => ({
        name: process.label || 'no label',
        detail: "Process",
        kind: vscode_languageserver_1.SymbolKind.Method,
        range: process.range,
        selectionRange: process.range,
        children: process.statements.map(statement => parseStatements(statement)).flat()
    })));
    return symbols
}

function getTypes(architecture){
    const symbols = [];
    symbols.push(...architecture.types.map(type => ({
        name: type.name.text,
        detail: "Type",
        kind: vscode_languageserver_1.SymbolKind.TypeParameter,
        range: type.range,
        selectionRange: type.range
    })));
    return symbols    
}

function parseArchitecture1(architecture, linter) {
    const symbols = [];
    symbols.push(...architecture.instantiations.map(instantiation => ({
        name: instantiation.label + ': ' + instantiation.componentName,
        detail: instantiation.label,
        kind: vscode_languageserver_1.SymbolKind.Class,
        range: instantiation.range,
        selectionRange: instantiation.range
    })));
    symbols.push(...architecture.blocks.map(block => ({
        name: block.label + 'block',
        detail: block.label,
        kind: vscode_languageserver_1.SymbolKind.Object,
        range: block.range,
        selectionRange: block.range
    })));
    if (linter.global_options.ShowProcessesInOutline)
    {
        symbols.push(...architecture.processes.map(process => ({
            name: process.label || 'no label',
            detail: process.label,
            kind: vscode_languageserver_1.SymbolKind.Method,
            range: process.range,
            selectionRange: process.range,
            children: process.statements.map(statement => parseStatements(statement)).flat()
        })));
    
    }
    for (const generate of architecture.generates) {
        symbols.push({
            name: linter.text.split('\n')[generate.range.start.line],
            kind: vscode_languageserver_1.SymbolKind.Enum,
            range: generate.range,
            selectionRange: generate.range,
            children: parseArchitecture(generate, linter).flat()
        });
    }
    return symbols;
}



function parseArchitecture(architecture, linter) {
    const symbols = [];
    if (getComponents(architecture).length>0){
        symbols.push(getComponents(architecture))
        /*symbols.push({
            symbols.push({
            name: "Components",
            kind: vscode_languageserver_1.SymbolKind.Object,
            range: architecture.range,
            selectionRange: architecture.range,
            children: getComponents(architecture)
        });  */    
    }
    /*if (getConstants(architecture).length>0){
        symbols.push({
            name: "Constants",
            kind: vscode_languageserver_1.SymbolKind.Object,
            range: architecture.range,
            selectionRange: architecture.range,
            children: getConstants(architecture)
        });  
    }
    if (getTypes(architecture).length>0){
        symbols.push({
            name: "Types",
            kind: vscode_languageserver_1.SymbolKind.Object,
            range: architecture.range,
            selectionRange: architecture.range,
            children: getTypes(architecture)
        });      
    }
    if (getSignals(architecture).length>0){
        symbols.push({
            name: "Signals",
            kind: vscode_languageserver_1.SymbolKind.Object,
            range: architecture.range,
            selectionRange: architecture.range,
            children: getSignals(architecture)
        }); 
    }
 
    symbols.push(...architecture.blocks.map(block => ({
        name: block.label + 'block',
        detail: block.label,
        kind: vscode_languageserver_1.SymbolKind.Object,
        range: block.range,
        selectionRange: block.range
    })));*/

    if (getProcesses(architecture).length>0){
        
        symbols.push(getProcesses(architecture))
        /*symbols.push({
            name: "Processes",
            kind: vscode_languageserver_1.SymbolKind.Object,
            range: architecture.range,
            selectionRange: architecture.range,
            children: getProcesses(architecture)
        });      */
    }


    for (const generate of architecture.generates) {
        const comps = getComponents(generate)
        symbols.push({
            name: linter.text.split('\n')[generate.range.start.line],
            kind: vscode_languageserver_1.SymbolKind.Object,
            range: generate.range,
            selectionRange: generate.range,
            children: comps
        });
    }
    return symbols;
}

function parseEntity(entity, linter) {
    const symbols = [];

    symbols.push(...entity.ports.map(port => ({
        name: port.name.text ,
        detail: port.direction + " "+port.declaration,
        kind: vscode_languageserver_1.SymbolKind.Interface,
        range: port.range,
        selectionRange: port.range,
    })));
    symbols.push(...entity.generics.map(generic => ({
        name: generic.name.text,
        detail: generic.declaration,
        kind: vscode_languageserver_1.SymbolKind.Key,
        range: generic.range,
        selectionRange: generic.range
    })));

    return symbols;
}

function parseFile(file, linter) {
    const symbols = [];

    symbols.push(...[file.architecture].map(architecture =>({
        name: architecture.name ,
        detail: "Architecture",
        kind: vscode_languageserver_1.SymbolKind.Constructor,
        range: architecture.range,
        selectionRange: architecture.range,
        children: parseArchitecture(architecture, linter)
    })));
    /*if (file.entity){
        symbols.push(...[file.entity].map(entity =>({
            name: entity.name,
            detail: "Entity",
            kind: vscode_languageserver_1.SymbolKind.Interface,
            range: entity.range,
            selectionRange: entity.range,
            //children: parseEntity(entity, linter)
        })));    
    }*/

    return symbols;
}

function parseStatements(statement) {
    // OCase | OAssignment | OIf | OForLoop
    if (statement instanceof objects_1.OCase) {
        const result = [{
                name: statement.variable.map(read => read.text).join(' '),
                kind: vscode_languageserver_1.SymbolKind.Enum,
                range: statement.range,
                selectionRange: statement.range,
                children: statement.whenClauses.map(whenClause => {
                    let name = whenClause.condition.map(read => read.text).join(' ');
                    if (name === '') {
                        name = 'others';
                    }
                    return {
                        name,
                        kind: vscode_languageserver_1.SymbolKind.EnumMember,
                        range: whenClause.range,
                        selectionRange: whenClause.range,
                        children: whenClause.statements.map(statement => parseStatements(statement)).flat()
                    };
                }).flat()
            }];
        return result;
    }
    else if (statement instanceof objects_1.OIf) {
        const symbols = [];
        symbols.push(...statement.clauses.map(clause => clause.statements.map(parseStatements)).flat(2));
        if (statement.else) {
            for (const statement_ of statement.else.statements) {
                symbols.push(...parseStatements(statement_));
            }
        }
        return symbols;
    }
    else if (statement instanceof objects_1.OForLoop) {
        return statement.statements.map(statement => parseStatements(statement)).flat();
    }
    return [];
}
async function handleOnDocumentSymbol(params) {
    await language_server_1.initialization;
    const linter = language_server_1.linters.get(params.textDocument.uri);
    if (!linter) {
        return [];
    }
    const returnValue = [];
    if (linter.tree instanceof objects_1.OFileWithPackages) {
        returnValue.push(...linter.tree.packages.map(pkg => pkg.types).flat().map(type => vscode_languageserver_1.DocumentSymbol.create(type.name.text, undefined, vscode_languageserver_1.SymbolKind.Enum, type.range, type.range)));
        returnValue.push(...linter.tree.packages.map(pkg => pkg.functions).flat().map(func => vscode_languageserver_1.DocumentSymbol.create(func.name.text, undefined, vscode_languageserver_1.SymbolKind.Function, func.range, func.range)));
        returnValue.push(...linter.tree.packages.map(pkg => pkg.constants).flat().map(constants => vscode_languageserver_1.DocumentSymbol.create(constants.name.text, undefined, vscode_languageserver_1.SymbolKind.Constant, constants.range, constants.range)));
    }
    if (linter.tree instanceof objects_1.OFileWithEntityAndArchitecture) {
        //returnValue.push(...parseFile(linter.tree, linter));
        returnValue.push(...parseArchitecture1(linter.tree.architecture, linter));
    }
    return returnValue;
}
exports.handleOnDocumentSymbol = handleOnDocumentSymbol;
//# sourceMappingURL=documentSymbol.js.map