"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../lib/parser/parser");
const objects_1 = require("../lib/parser/objects");
const config_1 = require("../lib/parser/config");
const process_1 = require("process");
const colors = require("colors");
const fs = require("fs");
const glob = require("glob");
const blessed = require("blessed");
const util_1 = require("util");
const { diffString, diff } = require('json-diff');
const child_process_1 = require("child_process");
config_1.config.debug = false;
const files = glob.sync('./test/**/*.vhd', { follow: true }).filter((file) => file.indexOf('_syn') === -1);
// const files = glob.sync('./test/test.vhd', { follow: true }).filter((file) => file.indexOf('_syn') === -1);
// console.log(files);
// exit();
const megaFunction = async (file) => {
    let returnValue;
    try {
        let parser = new parser_1.Parser(await util_1.promisify(fs.readFile)(file, { encoding: 'utf8' }), file);
        const tree = parser.parse();
        const result = { success: true, tree };
        returnValue = JSON.stringify(result);
    }
    catch (e) {
        if (e instanceof objects_1.ParserError) {
            const result = { success: false, error: { range: e.range, text: e.toString() } };
            returnValue = JSON.stringify(result);
            // console.error(e);
        }
        else {
            console.error(file);
            throw e;
        }
    }
    return returnValue;
};
const screen = blessed.screen({ smartCSR: true });
const debugLog = blessed.log({
    top: '0%',
    left: '0%',
    width: '50%',
    height: '90%',
    content: '',
    tags: true,
    scrollback: 100,
    border: {
        type: 'line'
    }
});
screen.append(debugLog);
const kaputtLog = blessed.log({
    top: '0%',
    left: '50%',
    width: '50%',
    height: '90%',
    content: '',
    tags: true,
    scrollback: 100,
    border: {
        type: 'line'
    }
});
screen.append(kaputtLog);
const debugProgress = blessed.progressbar({
    top: '90%',
    left: '0%',
    width: '100%',
    height: '10%',
    tags: true,
    orientation: 'horizontal',
    pch: '*',
    filled: 0,
    value: 0,
    keys: false,
    mouse: false,
    border: {
        type: 'line'
    }
});
screen.append(debugProgress);
const debugText = blessed.textbox({
    top: '92%',
    left: '50%-6',
    width: '8%',
    height: 'shrink',
    tags: true,
    keys: false,
    mouse: false
});
screen.append(debugText);
screen.key(['C-c'], () => {
    return process.exit(130);
});
(async () => {
    if (process_1.argv[2] === '-c') {
        for (const [count, file] of files.entries()) {
            if (fs.statSync(file).size > 50 * 1024) {
                debugLog.log(colors.blue(`File too large: skipping ${file}`));
                continue;
            }
            debugLog.log(`creating ${file}`);
            const result = await megaFunction(file);
            fs.mkdirSync(`./test_results/${file}`.replace(/\/[^/]*$/i, ''), { recursive: true });
            fs.writeFileSync(`./test_results/${file}.json`, result, { encoding: 'utf8' });
            debugProgress.setProgress((count + 1) / files.length * 100);
            debugText.setText(`{center}${count + 1}/${files.length}\nkaputt: 0{/center}`);
        }
        process_1.exit(0);
    }
    else {
        child_process_1.execSync('rm -rf ./test_results_kaputt');
        let errorCount = 0;
        for (const [count, file] of files.entries()) {
            if (fs.statSync(file).size > 50 * 1024) {
                debugLog.log(colors.blue(`File too large: skipping ${file}`));
                continue;
            }
            debugLog.log(`testing ${file}`);
            let fileString;
            try {
                fileString = await util_1.promisify(fs.readFile)(`./test_results/${file}.json`, { encoding: 'utf8' });
            }
            catch (e) {
                fileString = await megaFunction(file);
                fs.mkdirSync(`./test_results/${file}`.replace(/\/[^/]*$/i, ''), { recursive: true });
                fs.writeFileSync(`./test_results/${file}.json`, fileString, { encoding: 'utf8' });
                kaputtLog.log(colors.green(`${file} had no created test`));
            }
            const expectedResult = JSON.parse(fileString);
            const result = await megaFunction(file);
            const removeTypes = (obj) => {
                // debugger;
                if (typeof obj.type !== 'undefined') {
                    // debugger;
                    delete obj.type;
                }
                for (const key in obj) {
                    // console.log(Object.keys(obj), key, obj);
                    if (obj[key].constructor === Object) {
                        removeTypes(obj[key]);
                    }
                    else if (obj[key].constructor === Array) {
                        obj[key].forEach(removeTypes);
                    }
                }
            };
            // debugger;
            // removeTypes(expectedResult);
            const objResult = JSON.parse(result);
            // removeTypes(objResult);
            expectedResult.tree && expectedResult.tree.text && delete expectedResult.tree.text;
            expectedResult.tree && expectedResult.tree.originalText && delete expectedResult.tree.originalText;
            objResult.tree && objResult.tree.text && delete objResult.tree.text;
            objResult.tree && objResult.tree.originalText && delete objResult.tree.originalText;
            if (result !== JSON.stringify(expectedResult) && diff(objResult, expectedResult)) {
                fs.mkdirSync(`./test_results_kaputt/${file}`.replace(/\/[^/]*$/i, ''), { recursive: true });
                fs.writeFileSync(`./test_results_kaputt/${file}.json`, diffString(expectedResult, objResult), { encoding: 'utf8' });
                kaputtLog.log(colors.red.underline.bold(`${file} is kaputt`));
                errorCount++;
            }
            else {
                debugLog.log(colors.green.underline.bold('is heile'));
            }
            debugProgress.setProgress((count + 1) / files.length * 100);
            debugText.setText(`{center}${count + 1}/${files.length}\nkaputt: ${errorCount}{/center}`);
        }
        if (errorCount === 0) {
            screen.destroy();
            console.log('All tests successfull.');
            process_1.exit(0);
        }
    }
})();
//# sourceMappingURL=test.js.map