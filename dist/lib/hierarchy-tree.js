"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HierarchyView = void 0;
const vscode = require("vscode");


class HierarchyDataProvider {
  constructor(list) {
    this.updateData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.updateData.event;
    this.data = [new TreeItem("Initializing", "", "", "", [])]
  }
  
  update(list){
    this.data = this.build_tree(list, -1)
    this.updateData.fire(undefined);
  }

  build_tree(list, root){
    let tree = []
    for (let m =0;m<list.length; m++ ){
      if (root ===-1) tree.push(new TreeItem(list[m].name, this.build_tree(list[m].children, m), list[m].path, list[m].file, m, list[m].hierPath))
      else tree.push(new TreeItem(list[m].name, this.build_tree(list[m].children, root), list[m].path, list[m].file, root, list[m].hierPath))
    }
    return tree
  }
  
  find(label, list){
    let found = []
    for (const i of list){
      if (i.children.length > 0){
        if (i.children.filter(m=> m.label === label).length > 0) found.push([i.label, i.file])
        found = found.concat(this.find (label, i.children))
      }  
    }
    return found
  }

  whereUsed(args, level){
     if (level === -1) return this.find(args.label, this.data)
     else return this.find(args.label, [this.data[level]])
  }

  getTreeItem(element) {
    if (element.children.length > 0) element.iconPath = new vscode.ThemeIcon("symbol-class")
    else element.iconPath = new vscode.ThemeIcon("symbol-method")
    if (element.file === "") element.iconPath = new vscode.ThemeIcon("symbol-module")
    if (element.label){
      const uri = vscode.Uri.parse(element.file);
      const used= this.find(element.label, this.data)
      let res = ""
      for (const u of used){
        if (!res.includes(u[0])) res +=`* [${u[0]}](${vscode.Uri.parse(u[1])})\n`
      }
      if ((res !== "") && (element.file !== "")) element.tooltip = new vscode.MarkdownString(`Open [${element.label}](${uri})\n\nUsed in :\n\n${res}`, true);  
      else if (element.file !== "") element.tooltip = new vscode.MarkdownString(`Open [${element.label}](${uri})\n\n`, true);  
      else element.tooltip = new vscode.MarkdownString(`Used in :\n\n${res}`, true);  
    }
    return element;
  }

  getChildren(element) {
    if (element === undefined) {
      return this.data;
    }
    return element.children;
  }
}

exports.HierarchyDataProvider = HierarchyDataProvider

class TreeItem extends vscode.TreeItem {

  constructor(label="", children, path, file, root, hierPath, line) {
    super(
        label,
        typeof children === "undefined" ? vscode.TreeItemCollapsibleState.None :
                                 vscode.TreeItemCollapsibleState.Collapsed);
    this.children = children
    this.path = path
    this.file = file 
    this.root = root
    this.line = line
    const uri = vscode.Uri.parse(file);
    //this.label =new vscode.MarkdownString(`[${label}](${uri})`, true)
    this.tooltip = new vscode.MarkdownString(`[${label}](${uri})`, true);
    this.description = `${file}`
    this.hierPath = hierPath
  }
}
