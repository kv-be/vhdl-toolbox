"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { throws } = require("assert");
const { write } = require("fs");
const { compareTwoStrings } = require("string-similarity");
const vscode_languageserver_1 = require("vscode-languageserver");
class OI {
    constructor(parent, i, j) {
        this.parent = parent;
        if (typeof j === 'undefined') {
            this.i_ = i;
        }
        else {
            this.position = {
                line: i,
                character: j,
            };
            this.calcI();
        }
    }
    set i(i) {
        this.position = undefined;
        this.i_ = i;
    }
    get i() {
        return this.i_;
    }
    get line() {
        if (!this.position) {
            this.position = this.calcPosition();
        }
        return this.position.line;
    }
    set line(line) {
        if (!this.position) {
            this.position = this.calcPosition();
        }
        this.position.line = line;
        this.calcI();
    }
    toJSON() {
        if (!this.position) {
            this.position = this.calcPosition();
        }
        return this.position;
    }
    get character() {
        if (!this.position) {
            this.position = this.calcPosition();
        }
        return this.position.character;
    }
    set character(character) {
        if (!this.position) {
            this.position = this.calcPosition();
        }
        this.position.character = character;
        this.calcI();
    }
    getRangeToEndLine() {
        const start = this.i;
        const text = this.parent instanceof OFile ? this.parent.text : this.parent.getRoot().text;
        let end = text.length;
        const match = /\n/.exec(text.substr(start));
        if (match) {
            end = start + match.index;
        }
        return new OIRange(this.parent, start, end);
    }
    calcPosition() {
        const lines = (this.parent instanceof OFile ? this.parent : this.parent.getRoot()).text.slice(0, this.i).split('\n');
        const line = lines.length - 1;
        const character = lines[lines.length - 1].length;
        return { character, line };
    }
    calcI() {
        if (typeof this.position === 'undefined') {
            throw new Error('Something went wrong with OIRange');
        }
        const lines = (this.parent instanceof OFile ? this.parent : this.parent.getRoot()).text.split('\n');
        this.i_ = lines.slice(0, this.position.line).join('\n').length + 1 + this.position.character;
    }
}
exports.OI = OI;
class OIRange {
    constructor(parent, start, end) {
        this.parent = parent;
        if (start instanceof OI) {
            this.start = start;
        }
        else {
            this.start = new OI(parent, start);
        }
        if (end instanceof OI) {
            this.end = end;
        }
        else {
            this.end = new OI(parent, end);
        }
    }
    setEndBacktraceWhitespace(i) {
        this.end.i = i - 1;
        const text = this.parent instanceof OFile ? this.parent.text : this.parent.getRoot().text;
        while (text[this.end.i].match(/\s/)) {
            this.end.i--;
        }
    }
    toJSON() {
        return vscode_languageserver_1.Range.create(this.start, this.end);
    }
}
exports.OIRange = OIRange;
/*class OLib{
    constructor(parent, name,startI, endI){
        this.parent = parent
        this.name = name;
        console.log("new olib with parent type " + parent.constructor.name)
        this.range = new OIRange(this, startI, endI);
    }
}
exports.OLib = OLib;*/
class ObjectBase {
    constructor(parent, startI, endI) {
        this.parent = parent;
        this.range = new OIRange(this, startI, endI);
        this.text = this.parent instanceof OFile ? this.parent.text : this.parent.getRoot().text;
        this.text = this.text.substr(startI, endI)
        let p = parent;
        while (!(p instanceof OFile)) {
            p = p.parent;
        }
        p.objectList.push(this);
    }
    getRoot() {
        if (this.root) {
            return this.root;
        }
        let parent = this;
        while (parent instanceof OFile === false) {
            parent = parent.parent;
        }
        this.root = parent;
        return parent;
    }
}
exports.ObjectBase = ObjectBase;
class OMentionable extends ObjectBase {
    constructor() {
        super(...arguments);
        this.mentions = [];
    }
}
exports.OMentionable = OMentionable;
class OContext extends ObjectBase {
}
exports.OContext = OContext;
class ODefitionable extends ObjectBase {
}
exports.ODefitionable = ODefitionable;
class OFile {
    constructor(text, file, originalText) {
        this.text = text;
        this.file = file;
        this.originalText = originalText;
        this.libraries = [];
        this.useStatements = [];
        this.objectList = [];
        this.magicComments = [];
        this.options = {"coding_rules" : null, "missing_resets_detected" : null, "std_logic_arith_forbidden" : null};
    }
    getJSON() {
        const obj = {};
        const seen = new WeakSet();
        return JSON.stringify(this, (key, value) => {
            if (['parent', 'originalText', 'objectList', 'root'].indexOf(key) > -1) {
                return;
            }
            // text of file
            if (typeof value === 'string' && value.length > 1000) {
                return;
            }
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return;
                }
                value.proto = value.constructor.name;
                seen.add(value);
            }
            return value;
        });
    }
}
exports.OFile = OFile;
class OFileWithEntity extends OFile {
}
exports.OFileWithEntity = OFileWithEntity;
class OFileWithContext extends OFile {
}
exports.OFileWithContext = OFileWithContext;
class OFileWithEntityAndArchitecture extends OFileWithEntity {
}
exports.OFileWithEntityAndArchitecture = OFileWithEntityAndArchitecture;
class OFileWithPackages extends OFile {
}
exports.OFileWithPackages = OFileWithPackages;
class OPackage extends ObjectBase {
    constructor() {
        super(...arguments);
        this.functions = [];
        this.procedures = [];
        this.constants = [];
        this.types = [];
        this.generics = [];
        this.name=null;
        this.instance=null;
    }
}
exports.OPackage = OPackage;
class OPackageBody extends ObjectBase {
    constructor() {
        super(...arguments);
        this.functions = [];
        this.procedures = [];
        this.constants = [];
        this.types = [];
   }
}
exports.OPackageBody = OPackageBody;
class OUseStatement extends ODefitionable {
}
exports.OUseStatement = OUseStatement;

class OProcedure extends OMentionable {
    constructor() {
        super(...arguments);
        this.variables = [];
        this.statements = [];
        this.procedures = [];
        this.functions = [];
        this.types = [];
        this.ports = [];
    }
}
exports.OProcedure = OProcedure;
class OFunction extends OMentionable {
    constructor() {
        super(...arguments);
        this.variables = [];
        this.statements = [];
        this.ports = [];
        this.flatReads = null;
        this.flatWrites = null;
        this.types = [];
        this.procedures = [];
        this.functions = [];
    }
    getFlatReads(){
        return getFlatSignalReads(this)
    }
    getFlatWrites(){
        return getFlatSignalWrites(this)
    }
}
exports.OFunction = OFunction;
class OArchitecture extends ObjectBase {
    constructor() {
        super(...arguments);
        this.signals = [];
        this.types = [];
        this.functions = [];
        this.procedureInstantiations = [];
        this.procedures = [];
        this.statements = [];
        // processes: OProcess[] = [];
        // instantiations: OInstantiation[] = [];
        // generates: OArchitecture[] = [];
        // assignments: OAssignment[] = [];
    }
    get processes() {
        return this.statements.filter(statement => statement instanceof OProcess);
    }
    get instantiations() {
        return this.statements.filter(statement => statement instanceof OInstantiation);
    }
    get blocks() {
        return this.statements.filter(statement => statement instanceof OBlock);
    }
    get generates() {
        const generates = this.statements.filter(statement => statement instanceof OForGenerate);
        for (const ifObj of this.statements.filter(statement => statement instanceof OIfGenerate)) {
            generates.push(...ifObj.ifGenerates);
            if (ifObj.elseGenerate) {
                generates.push(ifObj.elseGenerate);
            }
        }
        return generates;
    }
    get assignments() {
        return this.statements.filter(statement => statement instanceof OAssignment);
    }
}
exports.OArchitecture = OArchitecture;
class OBlock extends OArchitecture {
}
exports.OBlock = OBlock;
class OType extends OMentionable {
    finddef(read, isRead = true) {
        let kind = OElementRead
        if (!isRead){
            kind = OWrite
        }
        if (this.name.text.toLowerCase() === read.text.toLowerCase()) {
            return this;
        }
        if (this.units) {
            for (const unit of this.units) {
                if (unit.toLowerCase() === read.text.toLowerCase()) {
                    return this;
                }
            }
        }
        if (this instanceof OEnum) {
            for (const state of this.states) {
                if (state.name.text.toLowerCase() === read.text.toLowerCase()) {
                    return state;
                }
            }
        }
        else if (this instanceof ORecord && read instanceof kind) {
            for (const child of this.children) {
                if (child.name.text.toLowerCase() === read.text.toLowerCase()) {
                    return child;
                }
            }
        }
        else if (this instanceof OProtected && read instanceof kind) {
            for (const child of this.functions) {
                if (child.name.text.toLowerCase() === read.text.toLowerCase()) {
                    return child;
                }
            }
            for (const child of this.procedures) {
                if (child.name.text.toLowerCase() === read.text.toLowerCase()) {
                    return child;
                }
            }
        }
        
        return false;
    }
}
exports.OType = OType;
class OSubType extends OType {
}
exports.OSubType = OSubType;
class OEnum extends OType {
    constructor() {
        super(...arguments);
        this.states = [];
    }
}
exports.OEnum = OEnum;
class ORecord extends OType {
}
exports.ORecord = ORecord;
class ORecordChild extends OType {
}
exports.ORecordChild = ORecordChild;
class OProtected extends OType {
}
exports.OProtected = OProtected;

class OProtectedChild extends OType {
    constructor(){
        super(...arguments);
        this.functions = [];
        this.procedures = [];
    }
}
exports.OProtectedChild = OProtectedChild;
class OState extends OMentionable {
}
exports.OState = OState;
class OForGenerate extends OArchitecture {
    constructor(parent, startI, endI, start, end) {
        super(parent, startI, endI);
        this.parent = parent;
        this.start = start;
        this.end = end;
    }
}
exports.OForGenerate = OForGenerate;
class OIfGenerate extends ObjectBase {
    constructor() {
        super(...arguments);
        this.ifGenerates = [];
    }
}
exports.OIfGenerate = OIfGenerate;
class OIfGenerateClause extends OArchitecture {
}
exports.OIfGenerateClause = OIfGenerateClause;
class OElseGenerateClause extends OArchitecture {
}
exports.OElseGenerateClause = OElseGenerateClause;
class OName extends ObjectBase {
    toString() {
        return this.text;
    }
}
exports.OName = OName;
class OAttribute extends ObjectBase {
}
exports.OAttribute = OAttribute;
class OAttributeDef extends ObjectBase {
}
exports.OAttributeDef = OAttributeDef;
class OVariableBase extends OMentionable {
    constructor(parent, startI, endI) {
        super(parent, startI, endI);
        this.parent = parent;
        this.register = null;
        this.typename=""
    }
}
exports.OVariableBase = OVariableBase;
class OSignalBase extends OVariableBase {
    constructor(parent, startI, endI) {
        super(parent, startI, endI);
        this.parent = parent;
        this.register = null;
        this.typename=""
    }
    getSignalRange(){
        //console.log("getting range of signal"+this.name.text)
        if (this.typename){
            //console.log("getting range of signal"+this.name.text+", "+this.typename)
            const matches = [...this.typename.matchAll(/([0-9]+)\s*(downto|to)\s*([0-9]+)/gi)]
            const ok = this.typename.search(/.*?\(\s*[0-9]+\s*(downto|to)\s*[0-9]+\s*\)/gi)
            if ((matches.length>0) && (ok > -1) ){
                let l = matches[0][1]
                let r = matches[0][3]
                l = parseInt(l, 10)
                r = parseInt(r, 10)             
                //console.log(`get signal range ${l}, ${r}`)
                if (l>r) return [r, l]
                else return [l,r]
            }
            else{
                //console.log("get signal range, not type found")
                return [-1, -1]
            }
        }
        //console.log("get signal range, not type found")
        return [-1,-1]
    }
    isRegister() {
        if (this.register !== null) {
            return this.register;
        }
        this.register = false;
        // const processes = this.parent instanceof OArchitecture ? this.parent.processes : (this.parent.parent instanceof OFileWithEntityAndArchitecture ? this.parent.parent.architecture.processes : []);
        const processes = this.getRoot().objectList.filter(object => object instanceof OProcess);
        // TODO: Redeclaration of Signals
        for (const process of processes) {
            if (process.isRegisterProcess()) {
                for (const write of process.getFlatWrites()) {
                    if (write.text.toLowerCase() === this.name.text.toLowerCase()) {
                        this.register = true;
                        this.registerProcess = process;
                    }
                }
            }
        }
        return this.register;
    }
    getRegisterProcess() {
        if (this.isRegister === null) {
            return null;
        }
        return this.registerProcess;
    }
}
exports.OSignalBase = OSignalBase;
class OVariable extends OVariableBase {
}
exports.OVariable = OVariable;
class OSignal extends OSignalBase {
    getSignalRange(){
        if (this.typename){
            const matches = [...this.typename.matchAll(/([0-9]+)\s*(downto|to)\s*([0-9]+)/gi)]
            const ok = this.typename.search(/.*?\(\s*[0-9]+\s*(downto|to)\s*[0-9]+\s*\)/gi)
            if ((matches.length>0) && (ok > -1) ){
                let l = matches[0][1]
                let r = matches[0][3]
                l = parseInt(l, 10)
                r = parseInt(r, 10)             
                if (l>r) return [r, l]
                else return [l,r]
            }
            else return [-1, -1]
        }
    }
}
exports.OSignal = OSignal;
class OMap extends ObjectBase {
    constructor() {
        super(...arguments);
        this.children = [];
    }
}
exports.OMap = OMap;
class OGenericMap extends OMap {
    constructor(parent, startI, endI) {
        super(parent, startI, endI);
        this.parent = parent;
    }
}
exports.OGenericMap = OGenericMap;
class OPortMap extends OMap {
    constructor(parent, startI, endI) {
        super(parent, startI, endI);
        this.parent = parent;
    }
}
exports.OPortMap = OPortMap;

function getFlatPortReads(obj, entity) {
    if ((obj instanceof OInstantiation) || (obj instanceof OProcedure) || (obj instanceof OFunction)){
        if (obj.flatReads !== null) {
            return obj.flatReads;
        }
        obj.flatReads = [];
        if (obj.portMappings) {
            for (const portMapping of obj.portMappings.children) {
                if (entity) {
                    const entityPort = entity.ports.find(port => {
                        for (const part of portMapping.name) {
                            if (part.text.toLowerCase() === port.name.text.toLowerCase()) {
                                return true;
                            }
                        }
                        return false;
                    });
                    if (entityPort && (entityPort.direction === 'in' || entityPort.direction === 'inout')) {
                        obj.flatReads.push(...portMapping.mappingIfInput);
                    }
                    // reads mapped to outputs doesn't make sense!
                    /*else if (entityPort && entityPort.direction === 'out') {
                        obj.flatReads.push(...portMapping.mappingIfOutput[0]);
                    }*/
                }
                else {
                    obj.flatReads.push(...portMapping.mappingIfInput);
                }
            }
        }
        if (obj.genericMappings) {
            for (const portMapping of obj.genericMappings.children) {
                obj.flatReads.push(...portMapping.mappingIfInput);
            }
        }
        return obj.flatReads;
    }
    else{
        return []
    }
}

function getFlatPortWrites(obj, entity) {
    if ((obj instanceof OInstantiation) || (obj instanceof OProcedure) || (obj instanceof OFunction)){
        if (obj.flatWrites !== null) {
            return obj.flatWrites;
        }
        obj.flatWrites = [];
        if (obj.portMappings) {
            for (const portMapping of obj.portMappings.children) {
                if (entity) {
                    const entityPort = entity.ports.find(port => {
                        for (const part of portMapping.name) {
                            if (part.text.toLowerCase() === port.name.text.toLowerCase()) {
                                return true;
                            }
                        }
                        return false;
                    });
                    if (entityPort && (entityPort.direction === 'out' || entityPort.direction === 'inout')) {
                        obj.flatWrites.push(...portMapping.mappingIfOutput[1]);
                    }
                }
                /*else {
                    obj.flatWrites.push(...portMapping.mappingIfInput);
                }*/
            }
        }
        return obj.flatWrites;
    }
    else{
        return []
    }
}


function getFlatSignalWrites(obj) {
    if ((obj instanceof OProcess) || (obj instanceof OFunction) || (obj instanceof OProcedure)){
        if (obj.flatWrites !== null) {
            return obj.flatWrites;
        }
        const flatten = (objects) => {
            const flatWrites = [];
            for (const object of objects) {
                if (object instanceof OAssignment) {
                    flatWrites.push(...object.writes);
                }
                else if (object instanceof OIf) {
                    if (object.else) {
                        flatWrites.push(...flatten(object.else.statements));
                    }
                    for (const clause of object.clauses) {
                        flatWrites.push(...flatten(clause.statements));
                    }
                }
                else if (object instanceof OCase) {
                    for (const whenClause of object.whenClauses) {
                        flatWrites.push(...flatten(whenClause.statements));
                    }
                }
                else if (object instanceof OForLoop || object instanceof OWhileLoop) {
                    flatWrites.push(...flatten(object.statements));
                }
                else if (object instanceof OProcedureCall) {
                    // TODO
                }
                else {
                    throw new Error('UUPS');
                }
            }
            return flatWrites;
        };
        const flatWrites = flatten(obj.statements);
        let unique =[]
        obj.flatWrites = []
        for (let s of flatWrites) {
            const ss = s.text.trim()
            //console.log("sigdeb checking "+ss)
            if (!unique.includes(ss.toLocaleLowerCase())) {
                //console.log("adding "+ss)
                unique.push(ss)
                obj.flatWrites.push(s)
            }
        }
        return obj.flatWrites;

    }
    else{
        return []
    }
}

function getFlatSignalReads(obj) {
    if ((obj instanceof OProcess) || (obj instanceof OProcedure) || (obj instanceof OFunction)){
        if (obj.flatReads !== null) {
            return obj.flatReads;
        }
        const flatten = (objects) => {
            const flatReads = [];
            for (const object of objects) {
                if (object instanceof OAssignment) {
                    flatReads.push(...object.reads);
                }
                else if (object instanceof OIf) {
                    if (object.else) {
                        flatReads.push(...flatten(object.else.statements));
                    }
                    for (const clause of object.clauses) {
                        flatReads.push(...clause.conditionReads);
                        flatReads.push(...flatten(clause.statements));
                    }
                }
                else if (object instanceof OCase) {
                    flatReads.push(...object.variable);
                    for (const whenClause of object.whenClauses) {
                        flatReads.push(...whenClause.condition);
                        flatReads.push(...flatten(whenClause.statements));
                    }
                }
                else if (object instanceof OForLoop) {
                    flatReads.push(...flatten(object.statements));
                }
                else if (object instanceof OWhileLoop) {
                    flatReads.push(...flatten(object.statements));
                    flatReads.push(...object.conditionReads);
                }
                else if (object instanceof OProcedureCall) {
                    // TODO
                }
                else {
                    throw new Error('UUPS');
                }
            }

            return flatReads;
        };
        const flatReads = flatten(obj.statements);
        let unique =[]
        obj.flatReads = []
        for (let s of flatReads) {
            const ss = s.text.trim()
            //console.log("sigdeb checking "+ss)
            if (!unique.includes(ss.toLocaleLowerCase())) {
                //console.log("adding "+ss)
                unique.push(ss)
                obj.flatReads.push(s)
            }
        }
        return obj.flatReads;
    }
    else{
        return []      
    } 
}

class OInstantiation extends ODefitionable {
    constructor() {
        super(...arguments);
        this.flatReads = null;
        this.flatWrites = null;
    }
    getFlatReads(entity) {
        //     console.log(entity, 'asd2');
        return getFlatPortReads(this, entity)
        
        if (this.flatReads !== null) {
            return this.flatReads;
        }
        this.flatReads = [];
        if (this.portMappings) {
            for (const portMapping of this.portMappings.children) {
                if (entity) {
                    const entityPort = entity.ports.find(port => {
                        for (const part of portMapping.name) {
                            if (part.text.toLowerCase() === port.name.text.toLowerCase()) {
                                return true;
                            }
                        }
                        return false;
                    });
                    if (entityPort && (entityPort.direction === 'in' || entityPort.direction === 'inout')) {
                        this.flatReads.push(...portMapping.mappingIfInput);
                    }
                    // reads mapped to outputs doesn't make sense!
                    /*else if (entityPort && entityPort.direction === 'out') {
                        this.flatReads.push(...portMapping.mappingIfOutput[0]);
                    }*/
                }
                else {
                    this.flatReads.push(...portMapping.mappingIfInput);
                }
            }
        }
        if (this.genericMappings) {
            for (const portMapping of this.genericMappings.children) {
                this.flatReads.push(...portMapping.mappingIfInput);
            }
        }
        return this.flatReads;
    }
    getFlatWrites(entity) {
        return getFlatPortWrites(this, entity)
        //     console.log(entity, 'asd');
        if (this.flatWrites !== null) {
            return this.flatWrites;
        }
        this.flatWrites = [];
        if (this.portMappings) {
            for (const portMapping of this.portMappings.children) {
                if (entity) {
                    const entityPort = entity.ports.find(port => {
                        for (const part of portMapping.name) {
                            if (part.text.toLowerCase() === port.name.text.toLowerCase()) {
                                return true;
                            }
                        }
                        return false;
                    });
                    if (entityPort && (entityPort.direction === 'out' || entityPort.direction === 'inout')) {
                        this.flatWrites.push(...portMapping.mappingIfOutput[1]);
                    }
                }
                /*else {
                    this.flatWrites.push(...portMapping.mappingIfInput);
                }*/
            }
        }
        return this.flatWrites;
    }
}




exports.OInstantiation = OInstantiation;
class OProcedureCallPortMap extends OMap {
    constructor(parent, startI, endI) {
        super(parent, startI, endI);
        this.parent = parent;
    }
}
exports.OProcedureCallPortMap = OProcedureCallPortMap;
class OProcedureCall extends ODefitionable {
}
exports.OProcedureCall = OProcedureCall;
class OMapping extends ODefitionable {
    constructor(parent, startI, endI) {
        super(parent, startI, endI);
        this.parent = parent;
    }
}
exports.OMapping = OMapping;
class OEntity extends ObjectBase {
    constructor(parent, startI, endI, library) {
        super(parent, startI, endI);
        this.parent = parent;
        this.library = library;
        this.ports = [];
        this.generics = [];
        this.signals = [];
        this.functions = [];
        this.procedures = [];
        this.types = [];
        this.statements = [];
    }
}
exports.OEntity = OEntity;
class OPort extends OSignalBase {
}
exports.OPort = OPort;
class OGenericType extends OMentionable {
}
exports.OGenericType = OGenericType;
class OGenericActual extends OVariableBase {
}
exports.OGenericActual = OGenericActual;
class OIf extends ObjectBase {
    constructor() {
        super(...arguments);
        this.clauses = [];
    }
}
exports.OIf = OIf;
class OWhileLoop extends ObjectBase {
    constructor() {
        super(...arguments);
        this.statements = [];
    }
}
exports.OWhileLoop = OWhileLoop;
class OElseClause extends ObjectBase {
    constructor() {
        super(...arguments);
        this.statements = [];
    }
}
exports.OElseClause = OElseClause;
class OIfClause extends ObjectBase {
    constructor() {
        super(...arguments);
        this.statements = [];
    }
}
exports.OIfClause = OIfClause;
class OCase extends ObjectBase {
    constructor() {
        super(...arguments);
        this.whenClauses = [];
        this.signal=""
    }
}
exports.OCase = OCase;
class OWhenClause extends ObjectBase {
    constructor() {
        super(...arguments);
        this.statements = [];
        this.conditionName = this.text.substring(0, this.text.search(/\n/gi))
        this.conditionName = this.conditionName.replace(/\s*when\s*/, '')
        this.conditionName = this.conditionName.replace(/=>.*/, '')
        this.conditionName = this.conditionName.trim()
    }
}
exports.OWhenClause = OWhenClause;
class OProcess extends ObjectBase {
    constructor() {
        super(...arguments);
        this.statements = [];
        this.variables = [];
        this.registerProcess = null;
        this.flatWrites = null;
        this.flatReads = null;
        this.resets = null;
        this.reset_signal = null;
        this.reset_range = null;
        this.clock = "";
        this.clock_range = "";
        this.procedures = [];
        this.functions = [];
        this.reset_type=""
        this.sensitivity_list=""
        this.readstrings = ""
        this.reset_condition = new RegExp(/\brst\b|\breset\b|\breset_n\b|\brst_n\b|\b[\S]+_rst\b|\b[\S]+_reset\b|\b[\S]+_reset_n\b|\b[\S]+_rst_n\b|\brst_[\S]+\b|\breset_[\S]+\b/i)
    }
    getReadStrings(){
        if (this.readstrings !== "")
            return this.readstrings
        else{
            let sigs = []
            for (const p of this.getFlatReads()) {
                if ((p.definition) && (p.scope)){
                    if (!(p.definition.constant) && !(p.definition instanceof OGenericActual) && !(p.scope instanceof OForGenerate)){ // filter out hte generics 
                        sigs.push(p.text.trim())
                    }    
                }
            }
            for (let s of sigs) {
                if (!this.readstrings.includes(s)) {
                    if ((s != "") && (this.readstrings != null) && s != "'" && s != '"') {
                        this.readstrings += (s+", ")
                    }
                }
            }

            return this.readstrings
        }
    }

    hasSensitivityList(){
        return (this.getSensitivityList() !== null)
    }

    getSensitivityList(){
        if (this.sensitivity_list !== ""){
            return this.sensitivity_list
        }
        else{
            this.sensitivity_list = " "
            let ar 
            let decl = this.text.substring(  0, this.text.search(/\n\s*begin/i)  ).toLowerCase()
            const search_sensi = new RegExp(/\s*[a-zA-Z0-9_: ]*process\s*\(([a-zA-Z0-9_: ,\n\(\) -]*)\)/gi)
            if (decl.search(search_sensi) >= 0){
                ar = [...decl.matchAll(search_sensi)];
                this.sensitivity_list = ar[0][1]
            }
            else this.sensitivity_list = null
            return this.sensitivity_list    
        }
    }

    getMissingSensitivityList(){
        if (this.hasSensitivityList()){
            let sensi = this.getSensitivityList()
            let missing = []
            if (this.isRegisterProcess()){
                //console.log("missing of sync proc "+sensi)
                if (!sensi.includes(this.clock.toLowerCase())){
                    missing.push(this.clock)
                    //console.log("missing of clock "+this.clock.toLowerCase())
                }
                if (this.reset_type === "async") {
                    for (const r of this.reset_signal){
                        if (!sensi.includes(r.toLowerCase())) missing.push(r)
                    }
                    //console.log("missing async reset")
                }
                return missing
            }
            else{
                //console.log("missing of async proc")
                let unique = this.getReadStrings()
                //console.log("sigdeb "+ unique)
                for (let s of unique.split(',')) {
                    s = s.trim()
                    //console.log("sigdeb checking "+s)
                    if (!sensi.includes(s.toLocaleLowerCase())) {
                        //console.log("adding "+s)
                        missing.push(s)
                    }
                }
                return missing     
            }
        }
        else return []
    }

    getNotNeededSensitivityList(){
        if (this.hasSensitivityList()){
            let sensitivity = this.getSensitivityList().split(',')
            let unique = this.getReadStrings().toLowerCase()
            let too_much = []
            //console.log("sigdeb "+sensitivity)
            for (let s of sensitivity) {
                s = s.trim()
                if (!unique.includes(s)) {
                    too_much.push(s)
                }
            }
            return too_much
        }
        else return ""
    }

    detect_clk_event(clause){
        if (clause.condition.match(/(rising|falling)_edge/i)) {
            this.clock = clause.condition.match(/(?<=(rising|falling)_edge\s*\(\s*).+?(?=\s*\))/g)[0];
            this.clock_range = clause.range;
            this.registerProcess = true
            this.reset_type = "sync"
            return true
        } 
        else if (clause.condition.match(/'event\s*and\s*/i)) {
            this.clock = clause.condition.match(/\b(.+?)'event\s+and\s+.+?\s*=\s*'[01]+'/i)[1];
            this.clock_range = clause.range;
            this.registerProcess = true;
            this.reset_type = "sync"
            return true
        } 
        return false
    }

    isRegisterProcess() {
        if (this.registerProcess !== null) {
            return this.registerProcess;
        }
        this.registerProcess = false;
        let reset_start
        // a process contains typically one statement (the if rising_edge or if reset)
        // exception is if there is a construction like if reset ... elsif rising edge. In this case,there are 2 if statements!
        const ifs = this.statements.filter(s=> s instanceof OIf)
        if (ifs.length !== 1){//if more than one if next to each other in a process => async process
            return this.registerProcess // async process
        } 
        // the first if statement of hte process can be if rising edge or if reset
        if (!this.detect_clk_event(ifs[0].clauses[0])){ 
            // first if did not contain any clock events => should contain reset condition
            // now check if the next if in the else condition contains a clock
            // two options : 
            // - construct if (rst) else if (rising edge) => here we have a if.else
            // - construct if (rst) elsif (rising edge) => here we have 2 if.clauses
            reset_start = ifs[0].clauses[0].range.start.i
            this.reset_signal = ifs[0].clauses[0].condition.replace(/[0-9]+|'|"|or|and|=|>|</g, "").split(" ").filter(s=> s!== "")
    
            if (ifs[0].else){
                // construct if (rst) else if (rising edge)
                // first if after the else is supposed to be the edge detector
                const eifs = ifs[0].else.statements.filter(s=> s instanceof OIf)
                if (!this.detect_clk_event(eifs[0].clauses[0])){
                    // no clock edge detection detected => async process
                    this.reset_signal = null
                    this.reset_start = null
                    this.reset_type = null
                }
                else this.reset_type = "async"
            } else if (ifs[0].clauses.length === 2){
                // in this case the second clause should contain the rising edge
                if (!this.detect_clk_event(ifs[0].clauses[1])){
                    // not clk event detected in the second if => async process
                    this.reset_signal = null
                    this.reset_start = null
                    this.reset_type = null
                }
                else this.reset_type = "async"
            } else{ // we conclude that it is an async process
                this.reset_signal = null
                this.reset_start = null
                this.reset_type = null
            }
        }  else {
            // sync proc, detect the reset
            const eifs = ifs[0].clauses[0].statements.filter(s=>s instanceof OIf)
            if (eifs.length > 0){ // no reset condition found!
                this.reset_signal = eifs[0].clauses[0].condition.replace(/\(|\)|[0-9]+|'|"|or|and|=|>|</g, "").split(" ").filter(s=> s!== "")
            }
        }      
        return this.registerProcess;
    }
    getFlatWrites() {
        return getFlatSignalWrites(this)
        if (this.flatWrites !== null) {
            return this.flatWrites;
        }
        const flatten = (objects) => {
            const flatWrites = [];
            for (const object of objects) {
                if (object instanceof OAssignment) {
                    flatWrites.push(...object.writes);
                }
                else if (object instanceof OIf) {
                    if (object.else) {
                        flatWrites.push(...flatten(object.else.statements));
                    }
                    for (const clause of object.clauses) {
                        flatWrites.push(...flatten(clause.statements));
                    }
                }
                else if (object instanceof OCase) {
                    for (const whenClause of object.whenClauses) {
                        flatWrites.push(...flatten(whenClause.statements));
                    }
                }
                else if (object instanceof OForLoop || object instanceof OWhileLoop) {
                    flatWrites.push(...flatten(object.statements));
                }
                else if (object instanceof OProcedureCall) {
                    // TODO
                }
                else {
                    throw new Error('UUPS');
                }
            }
            return flatWrites;
        };
        this.flatWrites = flatten(this.statements);
        return this.flatWrites;
    }
    getFlatReads() {
        return getFlatSignalReads(this)
        if (this.flatReads !== null) {
            return this.flatReads;
        }
        const flatten = (objects) => {
            const flatReads = [];
            for (const object of objects) {
                if (object instanceof OAssignment) {
                    flatReads.push(...object.reads);
                }
                else if (object instanceof OIf) {
                    if (object.else) {
                        flatReads.push(...flatten(object.else.statements));
                    }
                    for (const clause of object.clauses) {
                        flatReads.push(...clause.conditionReads);
                        flatReads.push(...flatten(clause.statements));
                    }
                }
                else if (object instanceof OCase) {
                    flatReads.push(...object.variable);
                    for (const whenClause of object.whenClauses) {
                        flatReads.push(...whenClause.condition);
                        flatReads.push(...flatten(whenClause.statements));
                    }
                }
                else if (object instanceof OForLoop) {
                    flatReads.push(...flatten(object.statements));
                }
                else if (object instanceof OWhileLoop) {
                    flatReads.push(...flatten(object.statements));
                    flatReads.push(...object.conditionReads);
                }
                else if (object instanceof OProcedureCall) {
                    // TODO
                }
                else {
                    throw new Error('UUPS');
                }
            }
            return flatReads;
        };
        this.flatReads = flatten(this.statements);
        return this.flatReads;
    }
    getResets() {
        if (this.resets !== null) {
            return this.resets;
        }
        this.resets = [];
        if (!this.isRegisterProcess()) {
            return this.resets;
        }
        //let reset_condition = new RegExp(/\b\w*rst\w*\b|\b\w*reset\w*\b/i)
        let reset_condition = new RegExp(/\b\w+\b/i)
        //console.log("determining reset")
        for (const statement of this.statements) {
            if (statement instanceof OIf) {
                for (const clause of statement.clauses) {
                    if (clause.condition.match(reset_condition)) {
                        //this.reset_signal = clause.condition.match(reset_condition)[0]
                        //console.log("reset = "+this.reset_signal)
                        this.reset_range = statement.range;
                        for (const subStatement of clause.statements) {
                            if (subStatement instanceof OForLoop){
                                for (const ss of subStatement.statements){
                                    if (ss instanceof OAssignment) {
                                        this.resets = this.resets.concat(ss.writes.map(write => write.text));
                                        this.reset_range = ss.range;
                                    }        
                                }
                            }
                            if (subStatement instanceof OAssignment) {
                                this.resets = this.resets.concat(subStatement.writes.map(write => write.text));
                                this.reset_range = subStatement.range;

                            }
                        }
                        //console.log("reset range defined as " + this.reset_range)
                    }
                    else{
                        for (const s of clause.statements) {
                            if (s instanceof OIf) {
                                for (const c of s.clauses) {
                                    //console.log("ifdeb "+c.text )
                                    if (c.condition.match(reset_condition)) {
                                        //this.reset_signal = c.condition.match(reset_condition)[0]
                                        //console.log("reset = "+this.reset_signal)
                                        for (const ss of c.statements) {

                                            if (ss instanceof OForLoop){
                                                for (const s of ss.statements){
                                                    if (s instanceof OAssignment) {
                                                        this.resets = this.resets.concat(s.writes.map(write => write.text));
                                                    }        
                                                }
                                            }
                                            if (ss instanceof OAssignment) {
                                                this.resets = this.resets.concat(ss.writes.map(write => write.text));
                                                
                                            }

                                        }
                                        if (c.statements[c.statements.length-1]){
                                            this.reset_range = c.statements[c.statements.length-1].range;
                                        }
                                        else{
                                            const a = c.range
                                            a.start.line = a.start.line+1
                                            this.reset_range = a
                                        }
                                    }            
                                }
                            }   
                        }
                        //console.log("reset range defined as " + this.reset_range.start.line)
                    }
                }
            }
        }
        return this.resets;
    }
}
exports.OProcess = OProcess;
class OProcedureInstantiation extends ObjectBase {
}
exports.OProcedureInstantiation = OProcedureInstantiation;
class OForLoop extends ObjectBase {
    constructor() {
        super(...arguments);
        this.statements = [];
    }
}
exports.OForLoop = OForLoop;
class OAssignment extends ObjectBase {
    constructor() {
        super(...arguments);
        this.writes = [];
        this.reads = [];
    }
}
exports.OAssignment = OAssignment;
class OToken extends ODefitionable {
    constructor(parent, startI, endI, text) {
        super(parent, startI, endI);
        this.parent = parent;
        this.text = text;
        let object = this;
        yank: do {
            object = object.parent;
            if (object instanceof OArchitecture) {
                for (const signal of object.signals) {
                    if (signal.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = signal;
                        this.scope = object;
                        signal.mentions.push(this);
                        break yank;
                    }
                }
                for (const func of object.functions) {
                    if (func.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = func;
                        this.scope = object;
                        func.mentions.push(this);
                        break yank;
                    }
                }
                for (const type of object.types) {
                    if (type.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = type;
                        this.scope = object;
                        type.mentions.push(this);
                        //console.log("token of type "+this.text+" detectoed")
                        break yank;
                    }
                    if (type instanceof OEnum) {
                        for (const state of type.states) {
                            if (state.name.text.toLowerCase() === text.toLowerCase()) {
                                this.definition = state;
                                this.scope = object;
                                state.mentions.push(this);
                                break yank;
                            }
                        }
                    }
                    if (type instanceof ORecord) {
                        for (const child of type.children) {
                            if (child.name.text.toLowerCase() === text.toLowerCase()) {
                                this.definition = child;
                                this.scope = object;
                                child.mentions.push(this);
                                break yank;
                            }
                        }
                    }
                }
                if (object instanceof OForGenerate && object.variable.name.text.toLowerCase() === text.toLowerCase()) {
                    this.definition = object.variable;
                    this.scope = object;
                    break yank;
                }
            }
            else if (object instanceof OFileWithEntity) {
                for (const signal of object.entity.signals) {
                    if (signal.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = signal;
                        signal.mentions.push(this);
                        this.scope = object.entity;
                        break yank;
                    }
                }
                for (const type of object.entity.types) {
                    if (type.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = type;
                        type.mentions.push(this);
                        this.scope = object.entity;
                        break yank;
                    }
                }
                for (const func of object.entity.functions) {
                    if (func.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = func;
                        this.scope = object.entity;
                        func.mentions.push(this);
                        break yank;
                    }
                }
                for (const port of object.entity.ports) {
                    if (port.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = port;
                        this.scope = object.entity;
                        port.mentions.push(this);
                        break yank;
                    }
                }
                for (const generic of object.entity.generics) {
                    if (generic.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = generic;
                        this.scope = object.entity;
                        generic.mentions.push(this);
                        break yank;
                    }
                }
            }
            else if (object instanceof OProcess) {
                for (const variable of object.variables) {
                    if (variable.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = variable;
                        this.scope = object;
                        variable.mentions.push(this);
                        break yank;
                    }
                }
            }
            else if (object instanceof OProcedure) {
                for (const variable of object.types) {
                    if (variable.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = variable;
                        this.scope = object;
                        variable.mentions.push(this);
                        break yank;
                    }
                }
                for (const variable of object.variables) {
                    if (variable.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = variable;
                        this.scope = object;
                        variable.mentions.push(this);
                        break yank;
                    }
                }
                for (const port of object.ports) {
                    if (port.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = port;
                        this.scope = object;
                        port.mentions.push(this);
                        break yank;
                    }
                }
                for (const port of object.functions) {
                    if (port.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = port;
                        this.scope = object;
                        port.mentions.push(this);
                        break yank;
                    }
                }
            }
            else if (object instanceof OFunction) {
                for (const variable of object.variables) {
                    if (variable.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = variable;
                        this.scope = object;
                        variable.mentions.push(this);
                        break yank;
                    }
                }
                
                for (const variable of object.types) {
                    if (variable.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = variable;
                        this.scope = object;
                        variable.mentions.push(this);
                        break yank;
                    }
                }

                for (const port of object.ports) {
                    if (port.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = port;
                        this.scope = object;
                        port.mentions.push(this);
                        break yank;
                    }
                }
                for (const port of object.functions) {
                    if (port.name.text.toLowerCase() === text.toLowerCase()) {
                        this.definition = port;
                        this.scope = object;
                        port.mentions.push(this);
                        break yank;
                    }
                }
            }
            else if (object instanceof OForLoop) {
                if (object.variable.name.text.toLowerCase() === text.toLowerCase()) {
                    this.definition = object.variable;
                    this.scope = object;
                    object.variable.mentions.push(this);
                    break yank;
                }
            }
        } while (!(object instanceof OFile));
    }
}
exports.OToken = OToken;
class OWrite extends OToken {
}
exports.OWrite = OWrite;
class ORead extends OToken {
}
exports.ORead = ORead;
// Read of Record element or something
class OElementRead extends ORead {
    constructor(parent, startI, endI, text) {
        super(parent, startI, endI, text);
        this.parent = parent;
        this.text = text;
    }
}
exports.OElementRead = OElementRead;
class OMappingName extends ODefitionable {
    constructor(parent, startI, endI, text) {
        super(parent, startI, endI);
        this.parent = parent;
        this.text = text;
    }
}
exports.OMappingName = OMappingName;
class ParserError extends Error {
    constructor(message, range, solution) {
        super(message);
        this.range = range;
        this.solution = solution;
    }
}
exports.ParserError = ParserError;
var MagicCommentType;
(function (MagicCommentType) {
    MagicCommentType[MagicCommentType["Disable"] = 0] = "Disable";
    MagicCommentType[MagicCommentType["Parameter"] = 1] = "Parameter";
    MagicCommentType[MagicCommentType["Todo"] = 2] = "Todo";
})(MagicCommentType = exports.MagicCommentType || (exports.MagicCommentType = {}));
class OMagicComment extends ObjectBase {
    constructor(parent, commentType, range) {
        super(parent, range.start.i, range.end.i);
        this.parent = parent;
        this.commentType = commentType;
    }
}
exports.OMagicComment = OMagicComment;
class OMagicCommentDisable extends OMagicComment {
    constructor(parent, commentType, range) {
        super(parent, commentType, range);
        this.parent = parent;
        this.commentType = commentType;
    }
}
exports.OMagicCommentDisable = OMagicCommentDisable;
class OMagicCommentTodo extends OMagicComment {
    constructor(parent, commentType, range, message) {
        super(parent, commentType, range);
        this.parent = parent;
        this.commentType = commentType;
        this.message = message;
    }
}
exports.OMagicCommentTodo = OMagicCommentTodo;
class OMagicCommentParameter extends OMagicComment {
    constructor(parent, commentType, range, parameter) {
        super(parent, commentType, range);
        this.parent = parent;
        this.commentType = commentType;
        this.parameter = parameter;
    }
}
exports.OMagicCommentParameter = OMagicCommentParameter;
//# sourceMappingURL=objects.js.map
