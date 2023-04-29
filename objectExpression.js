"use strict";

let variables = ["x", "y", "z"];

function Const(value) {
    this.value = value;
}

Const.prototype.evaluate = function () {
    return this.value;
}

Const.prototype.toString = function () {
    return this.value.toString();
}

Const.prototype.diff = function () {
    return ZERO;
}

Const.prototype.prefix = function () {
    return this.value.toString();
}

Const.prototype.postfix = function () {
    return this.value.toString();
}

let ZERO = new Const(0);
let ONE = new Const(1);
let TWO = new Const(2);
let THREE = new Const(3);
let FOUR = new Const(4);
let FIVE = new Const(5);
let constants = [ZERO, ONE, TWO, THREE, FOUR, FIVE];
function getConst(value) {
    if (value <= constants.length) {
        return constants[value];
    } else {
        return new Const(value);
    }
}

function Variable(name) {
    this.name = name;
}

Variable.prototype.evaluate = function (...vars) {
    return vars[variables.indexOf(this.name)]
}
Variable.prototype.toString = function () {
    return this.name;
}
Variable.prototype.diff = function (diffBy) {
    if (this.name === diffBy) {
        return ONE;
    } else {
        return ZERO;
    }
}

Variable.prototype.prefix = function () {
    return this.name;
}

Variable.prototype.postfix = function () {
    return this.name;
}

function Operation(op, fEval, fDiff, ...args) {
    this.op = op;
    this.fEval = fEval;
    this.fDiff = fDiff;
    this.args = args;
}

Operation.prototype.evaluate = function (...vars) {
    return this.fEval(...this.args.map((el) => el.evaluate(...vars)));
}

Operation.prototype.toString = function () {
    return this.args.join(" ") + " " + this.op;
}

Operation.prototype.diff = function (diffBy) {
    return this.fDiff(...this.args, ...this.args.map((el) => el.diff(diffBy)), diffBy);
}

Operation.prototype.prefix = function () {
    return `(${this.op} ${this.args.map((el) => el.prefix()).join(" ")})`;
}

Operation.prototype.postfix = function () {
    return `(${this.args.map((el) => el.postfix()).join(" ")} ${this.op})`;
}

function getConstructor(...args) {
    let constr = function (...arr) {
        Operation.call(this, ...args, ...arr);
    }
    constr.prototype = Object.create(Operation.prototype);
    return constr;
}

let Add = getConstructor("+", (a, b) => a + b, (l, r, dl, dr) => new Add(dl, dr));

let Subtract = getConstructor("-", (a, b) => a - b, (l, r, dl, dr) => new Subtract(dl, dr));

let Multiply = getConstructor("*", (a, b) => a * b, (l, r, dl, dr) => new Add(
    new Multiply(dl, r), new Multiply(l, dr)));

let Divide = getConstructor("/", (a, b) => a / b, (l, r, dl, dr) => new Divide(
    new Subtract(new Multiply(dl, r), new Multiply(l, dr)), new Multiply(r, r)
));

let Negate = getConstructor("negate", (a) => -a, (e, de) => new Multiply(new Const(-1), de));

function diffSumrec(...arr) {
    let result = ZERO;
    for (let i = 0; i < (arr.length - 1) / 2; i++) {
        result = new Add(result, new Divide(
            new Negate(arr[(arr.length - 1) / 2 + i]), new Multiply(arr[i], arr[i])
        ));
    }
    return result;
}

function Sumrec(countArgs) {
    return getConstructor("sumrec" + countArgs.toString(),
        (...arr) => arr.reduce((el1, el2) => el1 + 1 / el2, 0),
        (...arr) => diffSumrec(...arr));
}

function diffHMean(countArgs, ...arr) {
    let tmpSumrec = getSumrec(countArgs);
    return new Divide(getConst(countArgs),
        new tmpSumrec(...arr.slice(0, (arr.length - 1) / 2))).diff(arr[arr.length - 1]);
}
function HMean(countArgs) {
    return getConstructor("hmean" + countArgs.toString(),
        (...arr) => countArgs / arr.reduce((el1, el2) => el1 + 1 / el2, 0),
        (...arr) => diffHMean(countArgs, ...arr));
}



let Sumrec2 = Sumrec(2);
let Sumrec3 = Sumrec(3);
let Sumrec4 = Sumrec(4);
let Sumrec5 = Sumrec(5);
let HMean2 = HMean(2);
let HMean3 = HMean(3);
let HMean4 = HMean(4);
let HMean5 = HMean(5);

const sumrecs = [Sumrec2, Sumrec3, Sumrec3, Sumrec5, Sumrec5];
function getSumrec(countArgs) {
    if (countArgs >= 2 && countArgs <= 5) {
        return sumrecs[countArgs - 1];
    }
    else {
        return Sumrec(countArgs);
    }
}

let Meansq = getConstructor("meansq",
    (...arr) => arr.reduce((el1, el2) => el1 + el2 * el2, 0) / arr.length,
    (...arr) => meansqDiff(...arr));

let RMS = getConstructor("rms",
    (...arr) => Math.sqrt(arr.reduce((el1, el2) => el1 + el2 * el2, 0) / arr.length),
    (...arr) => RMSdiff(...arr));

const operationsMap = new Map([
        ['+', [Add, 2]],
        ['-', [Subtract, 2]],
        ['*', [Multiply, 2]],
        ['/', [Divide, 2]],
        ['negate', [Negate, 1]],
        ['sumrec2', [Sumrec2, 2]],
        ['sumrec3', [Sumrec3, 3]],
        ['sumrec4', [Sumrec4, 4]],
        ['sumrec5', [Sumrec5, 5]],
        ['hmean2', [HMean2, 2]],
        ['hmean3', [HMean3, 3]],
        ['hmean4', [HMean4, 4]],
        ['hmean5', [HMean5, 5]],
        ['meansq', [Meansq, -1]],
        ['rms', [RMS, -1]]
    ]
);

function meansqDiff(...arr) {
    let result = ZERO;
    let sz = (arr.length - 1) / 2;
    for (let i = 0; i < sz; i++) {
        result = new Add(result, new Multiply(arr[i], arr[i].diff(arr[arr.length - 1])));
    }
    result = new Divide(result, new Const(0.5 * sz));
    return result;
}
function RMSdiff(...arr) {
    let sz = (arr.length - 1) / 2;
    let result = ZERO;
    for (let i = 0; i < sz; i++) {
        result = new Add(result, new Multiply(arr[i], arr[sz + i]));
    }
    result = new Divide(result, new Const(sz));
    result = new Divide(result, new RMS(...arr.slice(0, sz)));
    return result;
}
const parse = function (s) {
    let stack = [];
    for (const operand of s.split(/\s+/).filter(el => el.length > 0)) {
        if (operationsMap.has(operand)) {
            const op = operationsMap.get(operand)[0];
            const countArg = operationsMap.get(operand)[1];
            stack.push(new op(...stack.splice(stack.length - countArg, countArg)));
        } else if (variables.includes(operand)) {
            stack.push(new Variable(operand));
        } else {
            stack.push(new Const(Number(operand)));
        }
    }
    return stack[0];
}

function ParseError(pos, message) {
    this.message = "On position " + pos.toString() + ": " + message;
}

ParseError.prototype = Object.create(Error.prototype);
ParseError.prototype.name = "ParseError";
ParseError.prototype.constructor = ParseError;

function BaseParser(s) {
    this._s = s;
    this._ind = 0;
    this._ch = this._s === '' ? "EOF" : this._s[0];

    this._getCh = function () {
        return this._ind < this._s.length ? this._s[this._ind] : "EOF";
    }

    this._take = function () {
        this._ind++;
        this._ch = this._getCh();
    }

    this.parsePrefix = function () {
        let result = this._getElement("prefix");
        if (result === null) {
            throw this._error("Empty expression");
        }
        this._skipWS();
        this._expect("EOF");
        return result;
    }

    this.parsePostfix = function () {
        let result = this._getElement("postfix");
        if (result === null) {
            throw this._error("Empty expression");
        }
        this._skipWS();
        this._expect("EOF");
        return result;
    }
    this._getInfo = function (mode) {
        if (mode === "prefix") {
            let op = this._getOperation();
            let arg = this._getElement(mode);
            let opArgs = [];
            while (arg !== null) {
                if (operationsMap.has(arg)) {
                    throw this._error(`\"${arg}\" can't be parsed as argument of operation`)
                }
                opArgs.push(arg);
                arg = this._getElement(mode);
            }
            return [op, opArgs];
        } else {
            let arg = this._getElement(mode);
            let opArgs = [];
            while (arg !== null && !operationsMap.has(arg)) {
                opArgs.push(arg);
                arg = this._getElement(mode);
            }
            if (arg === null) {
                throw this._error(`Operation expected, but not found`)
            }
            return [arg, opArgs];
        }
    }

    this._getElement = function (mode) {
        this._skipWS();
        if (this._test('(')) {
            this._take();
            let info = this._getInfo(mode);
            let op = operationsMap.get(info[0])[0];
            let neededCountArgs = operationsMap.get(info[0])[1];
            let opArgs = info[1];
            if (neededCountArgs !== -1 && neededCountArgs !== opArgs.length) {
                throw this._error(`Operation \"${info[0]}\" needed ${neededCountArgs} arguments, but actually have `
                    + `${opArgs.length} arguments`);
            }
            this._skipWS();
            this._expect(')');
            return new op(...opArgs);
        }
        return this._GetVariableOrConstByToken(this._getToken());
    }

    this._getOperation = function () {
        this._skipWS();
        let token = this._getToken();
        if (!operationsMap.has(token)) {
            throw this._error(`Expected operation, but found \"${token}\"`);
        }
        return token;
    }

    this._isWhiteSpace = function (c) {
        return /\s/.test(c);
    }

    this._skipWS = function () {
        while (this._isWhiteSpace(this._ch)) {
            this._take();
        }
    }

    this._test = function (expected) {
        return this._ch === expected;
    }

    this._expect = function (expected) {
        if (this._ch !== expected) {
            throw this._error(`Expected \"${expected}\", actual \"${this._ch}\"`);
        }
        this._take();
    }

    this._getToken = function () {
        let result = "";
        while (this._ch !== "EOF" && this._ch !== '(' && this._ch !== ')' && !this._isWhiteSpace(this._ch)) {
            result += this._ch;
            this._take();
        }
        this._skipWS();
        return result;
    }

    this._GetVariableOrConstByToken = function (token) {
        if (token.length === 0) return null;

        if (operationsMap.has(token)) {
            return token;
        } else if (variables.includes(token)) {
            return new Variable(token);
        } else if (!isNaN(Number(token))) {
            return new Const(Number(token));
        } else {
            throw this._error(`Token \"${token}\" can't be parsed as Number/Variable`);
        }
    }

    this._error = function (message) {
        return new ParseError(this._ind, message);
    }
}

const parsePrefix = function (s) {
    let parser = new BaseParser(s);
    return parser.parsePrefix();
}
const parsePostfix = function (s) {
    let parser = new BaseParser(s);
    return parser.parsePostfix();
}
