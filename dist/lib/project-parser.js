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
class ProjectParser {
    constructor(workspaces, settings) {
        this.workspaces = workspaces;
        this.cachedFiles = [];
        this.events = new events_1.EventEmitter();
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

        await Promise.all(this.workspaces.map(async (directory) => {
            const directories = await this.parseDirectory(directory);
            return (await Promise.all(directories.map(file => fs_1.promises.realpath(file)))).forEach(file => files.add(file));
        }));
        // for (const directory of this.workspaces) {
        //   this.parseDirectory(directory).forEach(file => files.add(realpathSync(file)));
        // }
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
    fetchEntitesAndPackages() {
        //     console.log(this.cachedFiles);
        this.packages = [];
        this.entities = [];
        for (const cachedFile of this.cachedFiles) {
            if (cachedFile.entity) {
                //console.log("adding entiry " + cachedFile.entity.name)
                this.entities.push(cachedFile.entity);
            }
            if (cachedFile.packages) {
                //console.log("adding package " + cachedFile.packages.name)
                this.packages.push(...cachedFile.packages);
            }
        }
    }
    addFolders(folders) {
        this.watcher.add(folders.map(folder => folder.replace(path_1.sep, '/') + '/**/*.vhd[l]'));
    }

    
    deleteFile(file){
        let index = -1
        for (const f in this.cachedFiles){
            if (this.cachedFiles[f].path === file){
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
        let f = this.cachedFiles.filter(f => f.path === file)
        if (f.length ===0){
            const tmpfile = new OFileCache(file, this);
            this.cachedFiles.push(tmpfile)
        }
        this.fetchEntitesAndPackages()
    }

    updateFile(file, text, linter){
        for (let f in this.cachedFiles){
            if (this.cachedFiles[f].path === file){
                //delete this.cachedFiles[f]
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
        if (!text) {
            return;
        }    
        this.text = text;
        this.path = file;
        utils.message("parsing of "+file)
        this.onlyDeclarations = false
        if (linter === null){
            this.linter = new vhdl_linter_1.VhdlLinter(this.path, this.text, this.projectParser);
        }
        else{
            this.linter = linter;
        }
        this.parsePackages();
        this.parseEntity();
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
    parseEntity() {
        if ((this.linter.tree instanceof objects_1.OFileWithEntity)) {
            this.entity = this.linter.tree.entity;
        }
    }
}
exports.OFileCache = OFileCache;
// type t_packet is (p_NONE, p_CM_REQ, p_CM_REJ, p_CM_REP, p_CM_RTU, p_CM_DREQ, p_CM_DREP, p_RC_MR, p_RC_SIZE, p_RC_DECLINE, p_RDMA_F, p_RDMA_M, p_RDMA_L, p_RDMA_O, p_ACK);
//# sourceMappingURL=project-parser.js.map