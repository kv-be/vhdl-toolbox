"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestView = void 0;
const vscode = require("vscode");


class HierarchyDataProvider {
  constructor(list) {
    if (list.length > 0){
       this.data = list 
    }
  }

  getHierarchyItem(element) {
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

class HierarchyItem extends vscode.HierarchyItem {

  constructor(label="", children) {
    super(
        label,
        typeof children === "undefined" ? vscode.HierarchyItemCollapsibleState.None :
                                 vscode.HierarchyItemCollapsibleState.Collapsed);
    this.children = children
    this.path = path
    this.file = file 
    this.root = root

  }
}
