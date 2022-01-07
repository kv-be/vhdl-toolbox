"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tokenizer_1 = require("../lib/parser/tokenizer");
console.log(tokenizer_1.tokenizer.tokenize('s_emptyDataA(i)', []));
class Counter {
    constructor() {
        this.arr = ['a', 'b'];
    }
    [Symbol.iterator]() {
        let counter = 0;
        return {
            next: function () {
                return {
                    done: counter === this.arr.length,
                    value: this.arr[counter++]
                };
            }.bind(this)
        };
    }
}
let c = new Counter();
for (let i of c)
    console.log(i);
console.log('ccc');
for (let i of c)
    console.log(i);
//# sourceMappingURL=test2.js.map