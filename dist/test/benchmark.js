"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vhdl_linter_1 = require("../lib/vhdl-linter");
const glob = require("glob");
const util_1 = require("util");
const fs_1 = require("fs");
const process_1 = require("process");
const project_parser_1 = require("../lib/project-parser");
const filesCache = [];
const projectParser = new project_parser_1.ProjectParser([]);
(async () => {
    const files = await util_1.promisify(glob)('test/**/*.vhd');
    console.log(`Found ${files.length} vhdl files.`);
    const time1 = new Date().getTime();
    for (const file of files) {
        filesCache.push({
            time: 0,
            path: file,
            text: fs_1.readFileSync(file, { encoding: 'utf8' })
        });
    }
    const time2 = new Date().getTime();
    console.log(`Read all files after ${time2 - time1} ms`);
    for (const file of filesCache) {
        const before = new Date().getTime();
        file.linter = new vhdl_linter_1.VhdlLinter(file.path, file.text, projectParser, true);
        const after = new Date().getTime();
        file.time = after - before;
    }
    const time3 = new Date().getTime();
    console.log(`Linted all files after ${time3 - time2} ms`);
    filesCache.sort((b, a) => a.time - b.time);
    console.log(filesCache.slice(0, 10).map(file => ({ path: file.path, time: file.time })));
    const time4 = new Date().getTime();
    console.log(`Sorted all files after ${time4 - time3} ms`);
})();
//# sourceMappingURL=benchmark.js.map