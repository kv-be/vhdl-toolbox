"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const escapeStringRegexp = require("escape-string-regexp");
class Tokenizer {
    constructor() {
        this.operators = [
            ['abs', 'not'],
            ['mod', "&", "null", "ns", "ms", "us", "fs", "ps", "s", "all"],
            ['sll', 'srl', 'sla', 'sra', 'rol', 'ror'],
            ['and', 'or', 'nand', 'nor', 'xor', 'xnor'],
            ['downto', 'to', 'others', 'when', 'else', 'range', 'elsif']
        ];
        this.tokenTypes = [
            { regex: /^(["])(([^"\\\n]|\\.|\\\n)*)["]/i, tokenType: 'STRING_LITERAL' },
            { regex: /^[*\/&\-?=<>+]+/i, tokenType: 'OPERATION' },
            { regex: /^\s+/i, tokenType: 'WHITESPACE' },
            { regex: /^[()]/i, tokenType: 'BRACE' },
            { regex: /^,/i, tokenType: 'COMMA' },
            { regex: /^[0-9]+/i, tokenType: 'INTEGER_LITERAL' },
            { regex: /^true|false/i, tokenType: 'BOOLEAN_LITERAL' },
            { regex: /^"[0-9]+"/i, tokenType: 'LOGIC_LITERAL' },
            { regex: /^x"[0-9A-F_]+"/i, tokenType: 'LOGIC_LITERAL' },
            { regex: /^b"[01]+"/i, tokenType: 'LOGIC_LITERAL' },
            { regex: /^'[0-9]+'/i, tokenType: 'LOGIC_LITERAL' },
            { regex: /^\w+'\w+(?=\s*\()/i, tokenType: 'ATTRIBUTE_FUNCTION' },
            { regex: /^()([a-z]\w*)\s*(?=\=>)/i, tokenType: 'RECORD_ELEMENT' },
            { regex: /^[a-z]\w*(?!\s*[(]|\w)/i, tokenType: 'VARIABLE' },
            { regex: /^(\.)([a-z]\w*)(?!\s*[(]|\w)/i, tokenType: 'RECORD_ELEMENT' },
            { regex: /^\w+(?=\s*\()/i, tokenType: 'FUNCTION' },
            { regex: /^(\.)(\w+)(?=\s*\()/i, tokenType: 'FUNCTION_RECORD_ELEMENT' },
            { regex: /^'(\w+)/i, tokenType: 'ATTRIBUTE' },
        ];
        for (const operatorGroup of this.operators) {
            for (const operator of operatorGroup) {
                this.tokenTypes.unshift({
                    regex: new RegExp('^' + operator + '\\b', 'i'),
                    tokenType: 'KEYWORD',
                });
            }
        }
    }
    tokenize(text, libraries) {
        const tokens = [];
        let foundToken;
        let offset = 0;
        const librariesSanitized = libraries.map(escapeStringRegexp);
        librariesSanitized.push('work');
        const librariesRegex = new RegExp('^(' + librariesSanitized.join('|') + ')\\..*?\\.', 'i');
        // console.log(librariesRegex);
        do {
            foundToken = false;
            const match = text.match(librariesRegex);
            if (match) {
                tokens.push({
                    type: 'LIBRARY_PREFIX',
                    value: match[0],
                    offset
                });
                offset += match[0].length;
                text = text.substring(match[0].length);
            }
            for (const tokenType of this.tokenTypes) {
                let match = text.match(tokenType.regex);
                if (match) {
                    const token = { type: tokenType.tokenType, value: match[2] ? match[2] : match[0], offset: match[2] ? offset + match[1].length : offset };
                    tokens.push(token);
                    text = text.substring(match[0].length);
                    offset += match[0].length;
                    foundToken = true;
                    break;
                }
            }
        } while (text.length > 0 && foundToken);
        // console.log(tokens);
        return tokens;
    }
}
exports.tokenizer = new Tokenizer();
//# sourceMappingURL=tokenizer.js.map