"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const objects_1 = require("./parser/objects");
const vhdl_linter_1 = require("./vhdl-linter");
const chokidar_1 = require("chokidar");
const events_1 = require("events");
const path_1 = require("path");
const utils = require("./utils")
const { throws } = require("assert");
const { getFips } = require("crypto");
const { runInThisContext } = require("vm");
const vscode_uri_1 = require("vscode-uri");
const os = require("os")
class ProjectParser {
    constructor(workspaces, settings) {
        this.workspaces = workspaces;
        this.cachedFiles = [];
        this.events = new events_1.EventEmitter();
        this.messages = []
        if (settings) this.options = settings
        else this.options= {"CheckCodingRules" : true, "CheckProcessReset" : true, "CheckStdLogicArith" : true, "ShowProcessesInOutline" : false, "PathsToPartiallyCheck":"", "IgnorePattern":"", "ToplevelSelectPattern":""};
    }

    get_options(){
        return Object.assign({}, this.options);
    }

    async read_options(){
        utils.message("starting workspace with the following global options")
        utils.message("   CheckCodingRules     : "+ this.options.CheckCodingRules)
        utils.message("   CheckProcessReset    : "+ this.options.CheckProcessReset)
        utils.message("   CheckStdLogicArith   : "+ this.options.CheckStdLogicArith)
    }

    async init() {
        let files = new Set
        this.read_options();

        const pkg = __dirname;
        if (pkg) {
            //       console.log(pkg, new Directory(pkg + '/ieee2008'));
            (await this.parseDirectory(path_1.join(pkg, `${path_1.sep}..${path_1.sep}..${path_1.sep}ieee2008`))).forEach(file => files.add(file));
            files.add(path_1.join(pkg, `${path_1.sep}..${path_1.sep}..${path_1.sep}textio.vhd`));
            files.add(path_1.join(pkg, `${path_1.sep}..${path_1.sep}..${path_1.sep}env.vhd`));
            files.add(path_1.join(pkg, `${path_1.sep}..${path_1.sep}..${path_1.sep}std_logic_unsigned.vhd`));
            files.add(path_1.join(pkg, `${path_1.sep}..${path_1.sep}..${path_1.sep}std_logic_arith.vhd`));
            files.add(path_1.join(pkg, `${path_1.sep}..${path_1.sep}..${path_1.sep}standard.vhd`));
        }

        await Promise.all(this.workspaces.map(async (directory) => {
            const directories = await this.parseDirectory(directory);
            return (await Promise.all(directories.map(file => fs_1.promises.realpath(file)))).forEach(file => files.add(file));
        }));
        // for (const directory of this.workspaces) {
        //   this.parseDirectory(directory).forEach(file => files.add(realpathSync(file)));
        // }

        if (this.options.IgnorePattern.length > 0){
            let re = this.options.IgnorePattern.replace(" ", "").split(",").join("|")
            re = new RegExp(re)
            let f = Array.from(files)
            f = f.filter(m=> m.search(re)===-1)
            files = [... new Set(f)]
        }

        for (const file of files) {
            //console.log("adding file " + file)
            let cachedFile = new OFileCache(file, this);
            this.messages.push(cachedFile.get_messages())
            this.cachedFiles.push(cachedFile);
        }

        this.fetchEntitesAndPackages();
        for (const workspace of this.workspaces) {
            const watcher = chokidar_1.watch(workspace.replace(path_1.sep, '/') + '/**/*.vhd[l]', { ignoreInitial: true });
            watcher.on('add', async (path) => {
                let cachedFile = new OFileCache(path, this);
                this.cachedFiles.push(cachedFile);
                this.fetchEntitesAndPackages();
                this.events.emit('change', 'add', path);
            });
            watcher.on('change', async (path) => {
                // console.log('change', path);
                const cachedFile = this.cachedFiles.find(cachedFile => cachedFile.path === path);
                if (cachedFile) {
                    //console.log("reparsing "+ cachedFile)
                    cachedFile.reparse();
                }
                else {
                    console.error('modified file not found', path);
                }
                this.fetchEntitesAndPackages();
                this.events.emit('change', 'change', path);
            });
            watcher.on('unlink', path => {
                const cachedFileIndex = this.cachedFiles.findIndex(cachedFile => cachedFile.path === path);
                this.cachedFiles.splice(cachedFileIndex, 1);
                this.fetchEntitesAndPackages();
                this.events.emit('change', 'unlink', path);
            });
        }
    }

    updateSettings(settings){
        this.options = settings
    }

    
    async parseDirectory(directory) {
        const files = [];
        const entries = await fs_1.promises.readdir(directory);
        // const entries = await promisify(directory.getEntries)()
        await Promise.all(entries.map(async (entry) => {
            try {
                const fileStat = await fs_1.promises.stat(directory + '/' + entry);
                if (fileStat.isFile()) {
                    if (entry.match(/\.vhd[l]?$/i)) {
                        files.push(directory + '/' + entry);
                    }
                }
                else {
                    files.push(...await this.parseDirectory(directory + '/' + entry));
                }
            }
            catch (e) {
                console.log(e);
            }
        }));
        return files;
    }

    getScopeRange(pos, signal, path, isVar){
        const file = this.cachedFiles.filter(p=>p.path === path)[0]
        let start = 0
        let end = 0
        // strip first and last lines
        let text = ""
        // all objects around the position
        let obj = file.linter.tree.objectList.filter(b=> (b.range.start.i < pos)&&(b.range.end.i > pos))
        // filter out all procedures, functions, architectures, entities and processes, package
        if (isVar) obj = obj.filter(o=> (o instanceof objects_1.OProcedure) || (o instanceof objects_1.OFunction)|| (o instanceof objects_1.OProcess))
        else obj = obj.filter(o=> (o instanceof objects_1.OProcedure) ||(o instanceof objects_1.OPackage) || (o instanceof objects_1.OFunction) || (o instanceof objects_1.OArchitecture)|| (o instanceof objects_1.OEntity) )
        if (obj.length === 0) return {start, end, text}
        let min = obj[0].range.end.i
        let target = obj[0]
        for (const o of obj){
            if (o.range.end.i < min){
                min = o.range.end.i
                target = o
            }
        }
        start = target.range.start.line
        end = target.range.end.line
        // strip first and last lines
        text = "\n"+file.text.substring(target.range.start.i, target.range.end.i).split('\n').slice(1,-1).join('\n')
        text = text.replace(/\r*\n\s*function\s+.*\s+return\s+.*?\s+is[\s\S\n]+?end\s+function\s*.*?;/gi, "")
        text = text.replace(/\r*\n\s*procedure\s+.*\s+is[\s\S\n]+?end\s+procedure\s*.*?;/gi, "")
        return {start, end, text}
    }    

    objcopy(what){
        return JSON.parse(JSON.stringify(what))
    }

    fetchEntitesAndPackages() {
        //     console.log(this.cachedFiles);
        this.packages = []
        this.entities = []
        this.messages = []
        this.contexts = []
        for (const cachedFile of this.cachedFiles) {
            if (cachedFile.entity) {
                //console.log("adding entiry " + cachedFile.entity.name)
                this.entities.push(cachedFile.entity);
            }
            if (cachedFile.packages) {
                //console.log("adding package " + cachedFile.packages.name)
                this.packages.push(...cachedFile.packages);
            }
            if (cachedFile.context){
                this.contexts.push(cachedFile.context)
            }
            this.messages.push(cachedFile.get_messages())
            
        }
      this.list = this.buildList(this.cachedFiles)
      // now parse the list and make it a hierarchy: for each child, find the children, build the path and indicate the parent
      this.tmptoplevels = []
      for (let l of this.list){
        l.children =  (this.getChildren(l, "",l.name, l.children, false))
        if (!l.parent) l.parent = ""
        if (!l.path) l.path = ""
        if (!l.path) l.hierPath = l.name
      }
      this.toplevels = this.list.filter(m=> m.instance ==="")
      for (let l of this.toplevels){
          let ll = this.objcopy(l)
          ll.children =  (this.getChildren(ll, "",ll.name, ll.children, true))
          if (!ll.parent) ll.parent = ""
          if (!ll.path) ll.path = ""
          if (!ll.path) ll.hierPath = ll.name
          l = ll
          this.tmptoplevels.push(ll)
      }
      this.toplevels = this.tmptoplevels
      if (this.options.ToplevelSelectPattern){
          let re = this.options.ToplevelSelectPattern.split(',').join("|").replace(" ", "")
          re = new RegExp(re)
          this.toplevels = this.toplevels.filter(m=> m.name.search(re)>-1)
      }
    }

    getMessages(){
        return this.messages.filter(m => m)
    }

    getHierarchy(){
        return this.toplevels
    }

    getContexts(){
        return this.contexts
    }
    getChildren(parent, instance, hierPath,  list, copy = true){
        if (list.length > 0){
            let resultlist = []
            for (let c of list){
                let cc
                if (copy) cc = this.objcopy(c)
                else cc = c
                // for each child, find the definition in the base list (to get the childs of the child)
                let def
                if (copy) def = this.objcopy(this.list.filter(m => m.name === cc.name))
                else def = this.list.filter(m => m.name === cc.name)
                cc.children = []
                cc.path = instance + ("/"+cc.instance)
                cc.hierPath = hierPath+("/"+cc.name)
                                
                if (def.length > 0){
                    cc.file = def[0].file
                    def[0].parent = parent.name
                    def[0].instance = cc.path
                    def[0].hierPath = cc.hierPath
                    if (def[0].children.length > 0){
                        cc.children = this.getChildren(def[0], cc.path, cc.hierPath, def[0].children, copy)
                    }
                }
                else{
                    cc.file = ""
                }
                cc.parent = parent.name
                resultlist.push(cc)
            }
            return resultlist
        }
        else return []
    }

    addFolders(folders) {
        this.watcher.add(folders.map(folder => folder.replace(path_1.sep, '/') + '/**/*.vhd[l]'));
    }

    compare_paths(patha, pathb){
        let op_sys = os.platform()
        let a = path_1.normalize(patha)
        let b = path_1.normalize(pathb)
        if (op_sys === "win32"){
            a = a.toLowerCase()
            b = b.toLowerCase()
        }
        return (a === b)
    }

    buildList(list){
        let ret = []
//        let childs = f.linter.tree.objectList.filter(m=>m instanceof objects_1.OInstantiation)
//        if (f.linter.tree.objectList){

        for (const f of list){
            if (f.entity){
                let childs = []
                if (f.linter.tree.objectList){
                    for (const c of f.instances) {
                        if ((c.parent instanceof objects_1.OIfGenerateClause) || (c.parent instanceof objects_1.OForGenerate)){
                            childs.push({"name": c.componentName, "instance" : c.parent.name + " : "+c.label , "line" : c.range.start.line})
                        }
                        else{
                            childs.push({"name": c.componentName, "instance" : c.label , "line" : c.range.start.line})
                        }
                    }
                }
                ret.push({"name" : f.entity.name, "instance": "", "file": f.path, "children": childs})
            }
        }   
        return ret     
    }
    
    deleteFile(file){
        let index = -1
        for (const f in this.cachedFiles){
            if (this.compare_paths(this.cachedFiles[f].path , file)){
                index = f
                break
            }
        }
        if (index >= 0){
            this.cachedFiles.splice(index, 1);
        }
        this.fetchEntitesAndPackages()
    }

    
    addFile(file){
        let f = this.cachedFiles.filter(f => this.compare_paths(f.path, file))
        if (f.length ===0){
            const tmpfile = new OFileCache(file, this);
            this.cachedFiles.push(tmpfile)
        }
        this.fetchEntitesAndPackages()
    }

    updateFile(file, text, linter){

        for (let f in this.cachedFiles){
            /*let patha = path_1.normalize(this.cachedFiles[f].path)
            let pathb = path_1.normalize(file)
            if (op_sys === "win32"){
                patha = patha.toLowerCase()
                pathb = pathb.toLowerCase()
            }*/
            if (this.compare_paths(this.cachedFiles[f].path, file)){
                delete this.cachedFiles[f]
                const tmpfile = new OFileCache(file, this, text, linter);
                this.cachedFiles[f] = tmpfile
                break
            }
        }
        
        this.fetchEntitesAndPackages()
    }

    getPackages() {
        return this.packages;
    }
    getEntities() {
        return this.entities;
    }
}
exports.ProjectParser = ProjectParser;
class OFileCache {
    constructor(file, projectParser, newtext = null, linter = null) {
        this.projectParser = projectParser;
        let text
        if (newtext === null){
            text = fs_1.readFileSync(file, { encoding: 'utf8' });
        }
        else{
            text = newtext
        }
        this.path = file;
        if (!text) {
            return;
        }    
        this.text = text;

        utils.message("parsing of "+file)

        if (linter === null){
            this.linter = new vhdl_linter_1.VhdlLinter(this.path, this.text, this.projectParser);
        }
        else{
            this.linter = linter;
        }
        this.parsePackages();
        this.parseContexts();
        this.parseEntity();
        this.messages = {"file" : vscode_uri_1.URI.file(this.path), "diagnostic":this.linter.get_messages()}
    }

    get_messages(){
        return this.messages
    }
    reparse() {
        this.text = fs_1.readFileSync(this.path, { encoding: 'utf8' });
        this.linter = new vhdl_linter_1.VhdlLinter(this.path, this.text, this.projectParser);
        this.parsePackages();
        this.parseEntity();
    }
    parsePackages() {
        if ((this.linter.tree instanceof objects_1.OFileWithPackages)) {
            this.packages = this.linter.tree.packages;
        }
    }
    parseContexts() {
        if ((this.linter.tree instanceof objects_1.OFileWithContext)) {
            this.context = this.linter.tree.context;
        }
    }
    parseEntity() {
        if ((this.linter.tree instanceof objects_1.OFileWithEntity)) {
            this.entity = this.linter.tree.entity;
            this.instances = this.linter.tree.objectList.filter(m=> m instanceof objects_1.OInstantiation)
        }
    }
}
exports.OFileCache = OFileCache;


// type t_packet is (p_NONE, p_CM_REQ, p_CM_REJ, p_CM_REP, p_CM_RTU, p_CM_DREQ, p_CM_DREP, p_RC_MR, p_RC_SIZE, p_RC_DECLINE, p_RDMA_F, p_RDMA_M, p_RDMA_L, p_RDMA_O, p_ACK);
//# sourceMappingURL=project-parser.js.map