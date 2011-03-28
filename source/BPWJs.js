/*
* This is a parsing framework and a few Utility classes.
*
* Significant portions of this code were ported by kybernetikos from Java code.
*
* The Java code is (c) Steven John Metsker and was companion to his book Building Parsers With Java.
* http://oozinoz.xp123.com/bpwj.htm In that book, he gave permission for the code to be used as
* the reader wished, as long as they do not claim that they wrote it.
*
*/
var Util = function () {
    function Util() {}
    Util.prototype.extend = function (subclass, superclass) {
        var intermediate = function () {};
        intermediate.prototype = superclass.prototype;
        subclass.prototype = new intermediate
    };
    Util.prototype.bind = function (object, func) {
        if (typeof func == "string") func = object[func];
        if (typeof func != "function") throw new Error("Invalid function passed to bind");
        return function () {
            func.apply(object, arguments);
        }
    };
    Util.prototype.getFile = function getFile(url, successHandler, failureHandler, timeout, timeoutHandler) {
        var req =
        new XMLHttpRequest;
        req.open("GET", url, true);
        req.onreadystatechange = function (aEvt) {
            if (req.readyState == 4) {
              if (req.status == 200 || url.substring(0, 5) == "file:" && req.status == 0) {
                successHandler(req.responseText, req.getAllResponseHeaders());
              }
            } else if (failureHandler != null) {
              failureHandler(url, req.status);
            }
        };
        req.send(null);
        if (timeout != null && timeout > 0) setTimeout(function () {
            req.abort();
            if (timeoutHandler != null) timeoutHandler(url, timeout)
        }, timeout)
    };
    Util.prototype.lazy = function (initialise) {
        var value = null;
        return function () {
            if (value == null) value = initialise();
            return value
        }
    };
    Util.prototype.startsWith = function startsWith(sPrefix, sString) {
        if (sPrefix == null || sString == null) return false;
        if (sPrefix == "") return true;
        if (sString.length < sPrefix.length) return false;
        return sString.substring(0, sPrefix.length) == sPrefix
    };
    Util.prototype.clamp = function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max)
    };
    Util.prototype.random = function random(arrayLength) {
        return Math.floor(Math.random() * arrayLength)
    };
    Util.prototype.store = function store(name, data) {
        try {
            localStorage[name] = JSON.stringify(data)
        } catch (e) {
            return false
        }
        return true
    };
    Util.prototype.retrieve = function retreive(name) {
        var stored = localStorage[name];
        if (stored == null) return null;
        return JSON.parse(stored)
    };
    Util.prototype.clear = function clear(name) {
        delete localStorage[name]
    };
    Util.prototype.toSet = function toSet(string) {
        var items = string.split(" ");
        var result = {};
        for (var i = 0; i < items.length; ++i) result[items[i]] = true;
        return result
    };
    return new Util
}();
var Arrays = function () {
    function Arrays() {}
    Arrays.prototype.remove = function (array, value) {
        var index = this.indexOf(array, value);
        if (index >= 0) array.splice(index, 1)
    };
    Arrays.prototype.indexOf = function (array, value) {
        for (var i = 0; i < array.length; ++i) if (array[i] == value) return i;
        return -1
    };
    Arrays.prototype.contains = function (array, value) {
        for (var i = 0; i < array.length; ++i) if (array[i] == value) return true;
        return false
    };
    Arrays.prototype.each = function (array, func) {
        for (var i = 0; i < array.length; ++i) func(array[i])
    };
    Arrays.prototype.map =

    function (array, func) {
        var result = new Array(array.length);
        for (var i = 0; i < array.length; ++i) result[i] = func(array[i])
    };
    return new Arrays
}();

function PushbackReader(string) {
    this.string = string;
    this.index = 0
}
PushbackReader.prototype.read = function read() {
    if (this.index < this.string.length) {
        var c = this.string.charAt(this.index++);
        return c
    }
    return null
};
PushbackReader.prototype.unread = function unread(chr) {
    if (chr == null) return;
    if (this.string.charAt(--this.index) != chr) throw new Error("Unread char " + chr + " but was actually " + this.string.charAt(this.index));
};

function Assembly() {
    this.CLASS = "Assembly";
    this.stack = [];
    this.target = null;
    this.index = 0
}
Assembly.prototype.clone = function clone(a) {
    if (a == null) throw new Error("a must be an instance of the class you want to clone");
    a.stack = this.stack.slice();
    if (this.target != null) a.target = this.target.clone();
    a.index = this.index;
    return a
};
Assembly.prototype.consumed = function consumed(delimiter) {
    throw new Error("Not Implemented: Assembly.consumed(String)");
};
Assembly.prototype.defaultDelimiter = function defaultDelimiter() {
    throw new Error("Not Implemented: Assembly.defaultDelimiter()");
};
Assembly.prototype.elementsConsumed = function elementsConsumed() {
    return this.index
};
Assembly.prototype.elementsRemaining = function elementsRemaining() {
    return this.length() - this.elementsConsumed()
};
Assembly.prototype.getStack = function getStack() {
    return this.stack
};
Assembly.prototype.getTarget = function getTarget() {
    return this.target
};
Assembly.prototype.hasMoreElements = function hasMoreElements() {
    return this.elementsConsumed() < this.length()
};
Assembly.prototype.nextElement = function nextElement() {
    throw new Error("Not Implemented: Assembly.nextElement()");
};
Assembly.prototype.length = function length() {
    throw new Error("Not Implemented: Assembly.length()");
};
Assembly.prototype.peek = function peek() {
    throw new Error("Not Implemented: Assembly.peek()");
};
Assembly.prototype.pop = function pop() {
    return this.stack.shift()
};
Assembly.prototype.push = function push(o) {
    this.stack.unshift(o)
};
Assembly.prototype.remainder = function remainder(delimiter) {
    throw new Error("Not Implemented: Assembly.remainder");
};
Assembly.prototype.setTarget = function setTarget(target) {
    this.target = target
};
Assembly.prototype.stackIsEmpty = function stackIsEmpty() {
    return this.stack.length == 0
};
Assembly.prototype.toString = function toString() {
    var delimiter = this.defaultDelimiter();
    var stack = this.stack.slice().reverse();
    return "[" + stack.join(",") + "]" + this.consumed(delimiter) + "^" + this.remainder(delimiter)
};
Assembly.prototype.unget = function unget(n) {
    this.index -= n;
    if (this.index < 0) this.index = 0
};

function Parser(name) {
    this.name = name;
    this.assembler = null
}
Parser.prototype.accept = function (pv, visited) {
    throw new Error("Not implemented: Parser.acceptVisited [accept(ParserVisitor, Vector)]");
};
Parser.add = function add(v1, v2) {
    for (var i = 0; i < v2.length; ++i) v1.push(v2[i])
};
Parser.prototype.best = function best(v) {
    var best = null;
    for (var i = 0; i < v.length; ++i) {
        var a = v[i];
        if (!a.hasMoreElements()) return a;
        if (best == null) best = a;
        else if (a.elementsConsumed() > best.elementsConsumed()) best = a
    }
    return best
};
Parser.prototype.bestMatch = function bestMatch(a) {
    var inArr = [a];
    var out = this.matchAndAssemble(inArr);
    return this.best(out)
};
Parser.prototype.completeMatch = function completeMatch(a) {
    var best = this.bestMatch(a);
    if (best != null && !best.hasMoreElements()) return best;
    return null
};
Parser.elementClone = function elementClone(v) {
    var copy = [];
    for (var i = 0; i < v.length; ++i) {
        var a = v[i];
        copy.push(a.clone())
    }
    return copy
};
Parser.prototype.getName = function getName() {
    return this.name
};
Parser.prototype.match = function match(inArr) {
    throw new Error("Not Implemented: Parser.match(Vector inArr)");
};
Parser.prototype.matchAndAssemble = function matchAndAssemble(inArr) {
    var out = this.match(inArr);
    if (this.assembler != null) for (var i = 0; i < out.length; ++i) this.assembler.workOn(out[i]);
    return out
};
Parser.prototype.randomExpansion = function randomExpansion(maxDepth, depth) {
    throw new Error("Not Implemented: Parser.randomExpansion(int, int)");
};
Parser.prototype.randomInput = function randomInput(maxDepth, separator) {
    var buf = "";
    var e = this.randomExpansion(maxDepth, 0);
    return e.join(separator)
};
Parser.prototype.setAssembler = function (assembler) {
    this.assembler = assembler;
    return this
};
Parser.prototype.toString = function toString(visited) {
    if (visited == null) visited = [];
    if (this.name != null) return this.name;
    else if (Arrays.contains(visited, this)) return "...";
    else {
        visited.push(this);
        return this.unvisitedString(visited)
    }
};
Parser.prototype.unvisitedString = function unvisitedString(visited) {
    throw new Error("Unimplemented: Parser.unvisistedString(Vector)");
};
Parser.prototype.or = function or(altParser) {
    return new Alternation(this, altParser)
};
Parser.prototype.repeating = function repeating() {
    return new Repetition(this)
};
Parser.prototype.then = function then(nextParser) {
    return new Sequence(this, nextParser)
};
Parser.prototype.matcher = function matcher(assemblyType) {
    var p = this;

    function match(str) {
        var as = str;
        if (str instanceof Assembly == false) as = new assemblyType(str);
        return p.completeMatch(as) != null
    }
    return {
        match: match,
        toString: function () {
            return "Matcher(" + p.toString() + ")"
        }
    }
};

function Repetition(subparser, name) {
    if (subparser instanceof Parser == false) throw new Error("Subparser for Repetition must be a parser.");
    Parser.call(this, name);
    this.CLASS = "Repetition";
    this.subparser = subparser;
    this.EXPWIDTH = 4;
    this.preAssembler = null
}
Util.extend(Repetition, Parser);
Repetition.prototype.accept = function accept(pv, visited) {
    pv.visitRepetition(this, visited)
};
Repetition.prototype.getSubparser = function getSubparser() {
    return this.subparser
};
Repetition.prototype.match = function (inArr) {
    if (this.preAssembler != null) for (var i = 0; i < inArr.length; ++i) this.preAssembler.workOn(inArr[i]);
    var out = Parser.elementClone(inArr);
    var s = inArr;
    while (s.length > 0) {
        if (this.subparser.matchAndAssemble == null) console.log(">>> " + this.subparser.CLASS);
        s = this.subparser.matchAndAssemble(s);
        Parser.add(out, s)
    }
    return out
};
Repetition.prototype.randomExpansion = function randomExpansion(maxDepth, depth) {
    v = [];
    if (depth >= maxDepth) return v;
    var n = Math.floor(this.EXPWIDTH * Math.random());
    for (var j = 0; j < n; j++) {
        var w = this.subparser.randomExpansion(maxDepth, depth++);
        for (var i = 0; i < w.length; i++) v.push(w[i])
    }
    return v
};
Repetition.prototype.setPreAssembler = function setPreAssembler(preAssembler) {
    this.preAssembler = preAssembler;
    return this
};
Repetition.prototype.unvisitedString = function unvisitedString(visited) {
    return this.subparser.toString(visited) + "*"
};

function Terminal(name) {
    Parser.call(this, name);
    this._discard = false
}
Util.extend(Terminal, Parser);
Terminal.prototype.discard = function discard() {
    return this.setDiscard(true)
};
Terminal.prototype.match = function match(inArr) {
    var out = [];
    for (var i = 0; i < inArr.length; ++i) {
        var a = inArr[i];
        var b = this.matchOneAssembly(a);
        if (b != null) out.push(b)
    }
    return out
};
Terminal.prototype.matchOneAssembly = function matchOneAssembly(inAs) {
    if (!inAs.hasMoreElements()) return null;
    var peek = inAs.peek();
    if (this.qualifies(peek)) {
        var out = inAs.clone();
        var o = out.nextElement();
        if (!this._discard) out.push(o);
        return out
    }
    return null
};
Terminal.prototype.qualifies = function qualifies(o) {
    return true
};
Terminal.prototype.randomExpansion = function randomExpansion(maxDepth, depth) {
    var v = [];
    v.push(this.toString());
    return v
};
Terminal.prototype.setDiscard = function setDiscard(discard) {
    this._discard = discard;
    return this
};
Terminal.prototype.unvisitedString = function unvisitedString(visited) {
    return "any"
};

function CollectionParser(name) {
    if (typeof name == "string") {
        Parser.call(this, name);
        this.subparsers = []
    } else {
        Parser.call(this);
        this.subparsers = [].slice.call(arguments)
    }
    this.CLASS = "CollectionParser"
}
Util.extend(CollectionParser, Parser);
CollectionParser.prototype.add = function add(e) {
    this.subparsers.push(e);
    return this
};
CollectionParser.prototype.getSubparsers = function getSubparsers() {
    return this.subparsers
};
CollectionParser.prototype.toStringSeparator = function toStringSeparator() {
    throw new Error("Not Implemented: CollectionParser.toStringSeparator");
};
CollectionParser.prototype.unvisitedString = function unvisitedString(visited) {
    var buf = ["<"];
    for (var i = 0; i < this.subparsers.length; ++i) buf.push(this.subparsers[i].toString(visited));
    buf.push(">");
    return buf.join(this.toStringSeparator())
};

function Alternation() {
    CollectionParser.apply(this, arguments);
    this.CLASS = "Alternation"
}
Util.extend(Alternation, CollectionParser);
Alternation.prototype.accept = function accept(pv, visited) {
    pv.visitAlternation(this, visited)
};
Alternation.prototype.match = function match(inArr) {
    var out = [];
    for (var i = 0; i < this.subparsers.length; ++i) Parser.add(out, this.subparsers[i].matchAndAssemble(inArr));
    return out
};
Alternation.prototype.randomExpansion = function randomExpansion(maxDepth, depth) {
    if (depth >= maxDepth) return this.randomSettle(maxDepth, depth);
    var n = this.subparsers.length;
    var i = Math.floor(n * Math.random());
    var j = this.subparsers[i];
    return j.randomExpansion(maxDepth, depth++)
};
Alternation.prototype.randomSettle = function randomSettle(maxDepth, depth) {
    var terms = [];
    for (var i = 0; i < this.subparsers.length; ++i) {
        var j = this.subparsers[i];
        if (j instanceof Terminal) terms.push(j)
    }
    var which = terms;
    if (terms.length == 0) which = this.subparsers;
    var n = which.length;
    var i = Math.floor(n * Math.random());
    var p = which[i];
    return p.randomExpansion(maxDepth, depth++)
};
Alternation.prototype.toStringSeparator = function toStringSeparator() {
    return "|"
};
Alternation.prototype.or = function or(altParser) {
    return this.add(altParser)
};
Alternation.prototype.either = Alternation.prototype.or;

function Sequence() {
    CollectionParser.apply(this, arguments);
    this.CLASS = "Sequence"
}
Util.extend(Sequence, CollectionParser);
Sequence.prototype.accept = function accept(pv, visited) {
    pv.visitSequence(this, visited)
};
Sequence.prototype.match = function match(inArr) {
    var out = inArr;
    for (var i = 0; i < this.subparsers.length; ++i) {
        var p = this.subparsers[i];
        if (p == null) console.log(this.subparsers);
        out = p.matchAndAssemble(out);
        if (out.length == 0) return out
    }
    return out
};
Sequence.prototype.randomExpansion = function randomExpansion(maxDepth, depth) {
    var v = [];
    for (var i = 0; i < this.subparsers.length; ++i) {
        var p = this.subparsers[i];
        var w = p.randomExpansion(maxDepth, depth++);
        Parser.add(v, w)
    }
    return v
};
Sequence.prototype.toStringSeparator = function toStringSeparator() {
    return ""
};
Sequence.prototype.then = function (childParser) {
    if (childParser instanceof Sequence) {
        for (var i = 0; i < childParser.subparsers.length; ++i) this.subparsers.push(childParser.subparsers[i]);
        return this
    }
    return this.add(childParser)
};
Sequence.prototype.first = function (child) {
    if (this.subparsers.length == 0) return this.add(child);
    else
    throw new Error("There is already a parser in this sequence; could nopt add " + child);
};

function Track() {
    Sequence.apply(this, arguments)
}
Util.extend(Track, Sequence);
Track.prototype.match = function match(inArr) {
    var inTrack = false;
    var last = inArr;
    var out = inArr;
    for (var i = 0; i < this.subparsers.length; ++i) {
        var p = this.subparsers[i];
        out = p.matchAndAssemble(last);
        if (out.length == 0) {
            if (inTrack) this.throwTrackException(last, p);
            return out
        }
        inTrack = true;
        last = out
    }
    return out
};
Track.prototype.throwTrackException = function throwTrackException(previousState, p) {
    var best = this.best(previousState);
    var after = best.consumed(" ");
    if (after == "") after = "-nothing-";
    var expected = p.toString();
    var next = best.peek();
    var found = next == null ? "-nothing-" : next.toString();
    throw new Error("After: " + after + "\n expected: " + expected + "\n found: " + found);
};

function Empty() {
    Parser.call(this)
}
Util.extend(Empty, Parser);
Empty.prototype.accept = function accept(pv, visited) {
    pv.visitEmpty(this, visited)
};
Empty.prototype.match = function match(inArr) {
    return Parser.elementClone(inArr)
};
Empty.prototype.randomExpansion = function randomExpansion(maxDepth, depth) {
    return []
};
Empty.prototype.unvisitedString = function unvisitedString(visited) {
    return " empty "
};

function Assembler(workFunc) {
    if (workFunc != null) this.workOn = workFunc
}
Assembler.unary = function unary(workFunc) {
    return new Assembler(function (a) {
        var val = a.pop();
        a.push(workFunc(val))
    })
};
Assembler.binary = function binary(workFunc) {
    return new Assembler(function (a) {
        var val2 = a.pop();
        var val1 = a.pop();
        a.push(workFunc(val1, val2))
    })
};
Assembler.elementsAbove = function elementsAbove(a, fence) {
    var items = [];
    while (!a.stackIsEmpty()) {
        var top = a.pop();
        if (top == fence || top.equals && top.equals(fence)) break;
        items.push(top)
    }
    return items
};
Assembler.prototype.workOn = function workOn(a) {
    throw new Error("Not Implemented: Assembler.workOn");
};

function grammarRule(type, initialise, assembler) {
    var val;
    if (typeof type == "function") val = new type;
    else val = type;
    var initialised = false;
    return function () {
        if (initialised == false) {
            initialised = true;
            initialise(val);
            if (assembler != null) val.setAssembler(assembler)
        }
        return val
    }
};

function Num() {
    Terminal.call(this)
}
Util.extend(Num, Terminal);
Num.prototype.qualifies = function qualifies(o) {
    var t = o;
    return t.isNumber()
};
Num.prototype.randomExpansion = function randomExpansion(maxDepth, depth) {
    var d = Math.floor(1E3 * Math.random()) / 10;
    var v = [];
    v.push(new String(d));
    return v
};
Num.prototype.unvisitedString = function unvisitedString(visited) {
    return "Num"
};

function NumberState() {
    this.CLASS = "NumberState";
    this.c = "";
    this._value = 0;
    this.absorbedLeadingMinus = false;
    this.absorbedDot = false;
    this.gotAdigit = false
}
NumberState.prototype.absorbDigits = function absorbDigits(r, fraction) {
    var divideBy = 1;
    var v = 0;
    while (this.c != null && "0" <= this.c && this.c <= "9") {
        this.gotAdigit = true;
        v = v * 10 + parseInt(this.c, 10);
        this.c = r.read();
        if (fraction) divideBy *= 10
    }
    if (fraction) v = v / divideBy;
    return v
};
NumberState.prototype.nextToken = function nextToken(r, cin, t) {
    this.reset(cin);
    this.parseLeft(r);
    this.parseRight(r);
    r.unread(this.c);
    return this.value(r, t)
};
NumberState.prototype.parseLeft = function parseLeft(r) {
    if (this.c == "-") {
        this.c = r.read();
        this.absorbedLeadingMinus = true
    }
    this._value = this.absorbDigits(r, false)
};
NumberState.prototype.parseRight = function parseRight(r) {
    if (this.c == ".") {
        this.c = r.read();
        this.absorbedDot = true;
        this._value += this.absorbDigits(r, true)
    }
};
NumberState.prototype.reset = function reset(cin) {
    this.c = cin;
    this._value = 0;
    this.absorbedLeadingMinus = false;
    this.absorbedDot = false;
    this.gotAdigit = false
};
NumberState.prototype.value = function value(r, t) {
    if (!this.gotAdigit) {
        if (this.absorbedLeadingMinus && this.absorbedDot) {
            r.unread(".");
            return t.symbolState.nextToken(r, "-", t)
        }
        if (this.absorbedLeadingMinus) return t.symbolState.nextToken(r, "-", t);
        if (this.absorbedDot) return t.symbolState.nextToken(r, ".", t)
    }
    if (this.absorbedLeadingMinus) this._value = -this._value;
    return new Token(Token.TT_NUMBER, "", this._value)
};
NumberState.prototype.toString = function toString() {
    return "{NumberState}"
};

function QuoteState() {
    this.CLASS = "QuoteState"
}
QuoteState.prototype.nextToken = function nextToken(r, cin, t) {
    var c = cin;
    var sval = c;
    do {
        c = r.read();
        if (c == null) c = cin;
        sval += c
    } while (c != cin);
    return new Token(Token.TT_QUOTED, sval, 0)
};
QuoteState.prototype.toString = function toString() {
    return "{QuoteState}"
};

function SlashSlashState() {
    this.CLASS = "SlashSlashState"
}
SlashSlashState.prototype.nextToken = function nextToken(r, theSlash, t) {
    var c = "";
    while ((c = r.read()) != "\n" && c != "\r" && c != null);
    return t.nextToken()
};
SlashSlashState.prototype.toString = function toString() {
    return "{SlashSlashState}"
};

function SlashStarState() {
    this.CLASS = "SlashStarState"
}
SlashStarState.prototype.nextToken = function nextToken(r, theStar, t) {
    var c = "";
    var lastc = "";
    while (c != null) {
        if (lastc == "*" && c == "/") break;
        lastc = c;
        c = r.read()
    }
    return t.nextToken()
};
SlashStarState.prototype.toString = function toString() {
    return "{SlashStarState}"
};

function SlashState() {
    this.slashStarState = new SlashStarState;
    this.slashSlashState = new SlashSlashState
}
SlashState.prototype.nextToken = function nextToken(r, theSlash, t) {
    var c = r.read();
    if (c == "*") return this.slashStarState.nextToken(r, "*", t);
    if (c == "/") return this.slashSlashState.nextToken(r, "/", t);
    if (c != null) r.unread(c);
    return new Token(Token.TT_SYMBOL, "/", 0)
};
SlashState.prototype.toString = function toString() {
    return "{SlashState}"
};

function SymbolNode(parent, myChar) {
    this.myChar = myChar;
    this.children = [];
    this.valid = false;
    this.parent = parent
}
SymbolNode.prototype.addDescendantLine = function addDescendantLine(s) {
    if (s.length > 0) {
        var c = s.charAt(0);
        var n = this.ensureChildWithChar(c);
        n.addDescendantLine(s.substring(1))
    }
};
SymbolNode.prototype.ancestry = function ancestry() {
    return this.parent.ancestry() + this.myChar
};
SymbolNode.prototype.deepestRead = function (r) {
    var c = r.read();
    var n = this.findChildWithChar(c);
    if (n == null) {
        r.unread(c);
        return this
    }
    return n.deepestRead(r)
};
SymbolNode.prototype.ensureChildWithChar = function ensureChildWithChar(c) {
    var n = this.findChildWithChar(c);
    if (n == null) {
        n = new SymbolNode(this, c);
        this.children.push(n)
    }
    return n
};
SymbolNode.prototype.findChildWithChar = function findChildWithChar(c) {
    for (var i = 0; i < this.children.length; ++i) {
        var n = this.children[i];
        if (n.myChar == c) return n
    }
    return null
};
SymbolNode.prototype.findDescendant = function findDescendant(s) {
    var c = s.substring(0, 1);
    var n = this.findChildWithChar(c);
    if (s.length == 1) return n;
    return n.findDescendant(s.substring(1))
};
SymbolNode.prototype.setValid = function setValid(b) {
    this.valid = b
};
SymbolNode.prototype.toString = function toString() {
    return "" + this.myChar + "(" + this.valid + ")"
};
SymbolNode.prototype.unreadToValid = function unreadToValid(r) {
    if (this.valid) return this;
    r.unread(this.myChar);
    return this.parent.unreadToValid(r)
};

function SymbolRootNode() {
    SymbolNode.call(this, "");
    this.table = {};
    this.init()
}
Util.extend(SymbolRootNode, SymbolNode);
SymbolRootNode.prototype.add = function add(s) {
    var c = s.substring(0, 1);
    var n = this.ensureChildWithChar(c);
    n.addDescendantLine(s.substring(1));
    this.findDescendant(s).setValid(true)
};
SymbolRootNode.prototype.ancestry = function ancestry() {
    return ""
};
SymbolRootNode.prototype.findChildWithChar = function findChildWithChar(c) {
    return this.table[c]
};
SymbolRootNode.prototype.init = function init() {
    for (var i = 0; i < 256; ++i) {
        var c = String.fromCharCode(i);
        this.table[c] = new SymbolNode(this, c);
        this.table[c].setValid(true)
    }
};
SymbolRootNode.prototype.nextSymbol = function nextSymbol(r, first) {
    var n1 = this.findChildWithChar(first);
    var n2 = n1.deepestRead(r);
    var n3 = n2.unreadToValid(r);
    return n3.ancestry()
};

function SymbolState() {
    this.CLASS = "SymbolState";
    this.symbols = new SymbolRootNode;
    this.add("!=");
    this.add(":-");
    this.add("<=");
    this.add(">=")
}
SymbolState.prototype.add = function add(s) {
    this.symbols.add(s)
};
SymbolState.prototype.nextToken = function nextToken(r, first, t) {
    var s = this.symbols.nextSymbol(r, first);
    return new Token(Token.TT_SYMBOL, s, 0)
};
SymbolState.prototype.toString = function toString() {
    return "{SymbolState}"
};

function Token(ttype, sval, nval) {
    if (arguments.length == 1) {
        var type = typeof ttype;
        if (type == "number") {
            this.nval = ttype;
            this.sval = "";
            this.ttype = Token.TT_NUMBER
        } else if (type == "string") {
            this.nval = 0;
            this.sval = ttype;
            if (ttype.length == 1) this.ttype = Token.TT_SYMBOL;
            else this.ttype = Token.TT_WORD
        }
    } else {
        this.ttype = ttype;
        this.sval = sval;
        this.nval = nval
    }
}
Token.TT_EOF = "eof";
Token.EOF = new Token(Token.TT_EOF, "", 0);
Token.TT_NUMBER = "number";
Token.TT_WORD = "word";
Token.TT_SYMBOL = "symbol";
Token.TT_QUOTED = "quoted";
Token.prototype.equals = function equals(t) {
    if (!(t instanceof Token)) return false;
    if (this.ttype != t.ttype) return false;
    if (this.ttype == Token.TT_NUMBER) return this.nval == t.nval;
    return this.sval == t.sval
};
Token.prototype.equalsIgnoreCase = function equalsIgnoreCase(t) {
    if (!(t instanceof Token)) return false;
    if (this.ttype != t.ttype) return false;
    if (this.ttype == Token.TT_NUMBER) return this.nval == t.nval;
    if (this.sval == null || t.sval == null) return false;
    return this.sval.toLowerCase() == t.sval.toLowerCase()
};
Token.prototype.isNumber = function isNumber() {
    return this.ttype == Token.TT_NUMBER
};
Token.prototype.isQuotedString = function isQuotedString() {
    return this.ttype == Token.TT_QUOTED
};
Token.prototype.isSymbol = function isSymbol() {
    return this.ttype == Token.TT_SYMBOL
};
Token.prototype.isWord = function isWord() {
    return this.ttype == Token.TT_WORD
};
Token.prototype.toString = function toString() {
    if (this.ttype == Token.TT_EOF) return "EOF";
    return this.value().toString()
};
Token.prototype.value = function value() {
    if (this.ttype == Token.TT_NUMBER) return this.nval;
    if (this.ttype == Token.TT_EOF) return Token.EOF;
    if (this.sval != null) return this.sval;
    return this.ttype
};

function TokenAssembly(tokenString) {
    Assembly.call(this);
    this.CLASSNAME = "TokenAssembly";
    if (tokenString instanceof TokenString == false) tokenString = new TokenString(tokenString);
    this.tokenString = tokenString;
    this.start = 0
}
Util.extend(TokenAssembly, Assembly);
TokenAssembly.prototype.consumed = function consumed(delimiter) {
    var result = [];
    for (var i = this.start; i < this.start + this.index; ++i) result.push(this.tokenString.tokenAt(i));
    return result.join(delimiter)
};
TokenAssembly.prototype.commit = function commit() {
    this.start = this.start + this.index;
    this.index = 0;
    this.stack = []
};
TokenAssembly.prototype.defaultDelimiter = function defaultDelimiter() {
    return "/"
};
TokenAssembly.prototype.length = function length() {
    return this.tokenString.length()
};
TokenAssembly.prototype.nextElement = function nextElement() {
    var oldIndex = this.index++;
    return this.tokenString.tokenAt(this.start + oldIndex)
};
TokenAssembly.prototype.peek = function peek() {
    if (this.start + this.index < this.length()) return this.tokenString.tokenAt(this.start + this.index);
    else
    return null
};
TokenAssembly.prototype.remainder = function remainder(delimiter) {
    var buf = [];
    for (var i = this.start + this.elementsConsumed(); i < this.tokenString.length(); i++) buf.push(this.tokenString.tokenAt(i));
    return buf.join(delimiter)
};
TokenAssembly.prototype.hasMoreElements = function hasMoreElements() {
    return this.start + this.index < this.length()
};
TokenAssembly.prototype.clone = function clone() {
    var tokenAssembly = new TokenAssembly(this.tokenString);
    tokenAssembly.start = this.start;
    return Assembly.prototype.clone.call(this, tokenAssembly)
};

function Tokenizer(s) {
    this.reader = null;
    this.characterState = {};
    this.numberState = new NumberState;
    this.quoteState = new QuoteState;
    this.slashState = new SlashState;
    this.symbolState = new SymbolState;
    this.whitespaceState = new WhitespaceState;
    this.wordState = new WordState;
    this.initialCharacterState();
    if (s != null) this.setString(s)
}
Tokenizer.prototype.initialCharacterState = function () {
    console.log("Tokenizer initialChar");
    this.setCharacterState(0, 255, this.symbolState);
    this.setCharacterState(0, " ", this.whitespaceState);
    this.setCharacterState("a", "z", this.wordState);
    this.setCharacterState("A", "Z", this.wordState);
    this.setCharacterState(192, 255, this.wordState);
    this.setCharacterState("0", "9", this.numberState);
    this.setCharacterState("-", "-", this.numberState);
    this.setCharacterState(".", ".", this.numberState);
    this.setCharacterState('"', '"', this.quoteState);
    this.setCharacterState("'", "'", this.quoteState);
    this.setCharacterState("/", "/", this.slashState)
};
Tokenizer.prototype.getReader = function getReader() {
    return this.reader
};
Tokenizer.prototype.nextToken = function nextToken() {
    var c = this.reader.read();
    if (c != null) {
        var result = this.characterState[c].nextToken(this.reader, c, this);
        return result
    }
    return Token.EOF
};
Tokenizer.prototype.setCharacterState = function setCharacterState(from, to, state) {
    if (state == null) {
        var str = from;
        state = to;
        for (var i = 0; i < str.length; i++) this.characterState[str.substring(i, i + 1)] = state
    } else {
        var fromCode = from;
        if (fromCode.charCodeAt) fromCode = fromCode.charCodeAt(0);
        var toCode = to;
        if (toCode.charCodeAt) toCode = toCode.charCodeAt(0);
        for (var i = fromCode; i <= toCode; i++) this.characterState[String.fromCharCode(i)] = state
    }
};
Tokenizer.prototype.setReader = function setReader(r) {
    this.reader = r
};
Tokenizer.prototype.setString = function setString(s) {
    this.setReader(new PushbackReader(s))
};

function TokenString(tokens) {
    if (typeof tokens == "string") tokens = new Tokenizer(tokens);
    if (tokens instanceof Tokenizer) {
        t = tokens;
        tokens = [];
        while (true) {
            var tok = t.nextToken();
            if (tok.ttype == Token.TT_EOF) break;
            tokens.push(tok)
        }
    }
    this.tokens = tokens
}
TokenString.prototype.length = function length() {
    return this.tokens.length
};
TokenString.prototype.tokenAt = function tokenAt(i) {
    return this.tokens[i]
};
TokenString.prototype.toString = function toString() {
    return this.tokens.join(" ")
};

function WhitespaceState() {
    this.CLASS = "WhitespaceState";
    this.whitespaceChar = {};
    this.setWhitespaceChars(String.fromCharCode(0), " ", true)
}
WhitespaceState.prototype.nextToken = function nextToken(r, aWhitespaceChar, t) {
    var c;
    do c = r.read();
    while (c != null && this.whitespaceChar[c] === true);
    if (c != null) r.unread(c);
    return t.nextToken()
};
WhitespaceState.prototype.setWhitespaceChars = function setWhitespaceChars(from, to, b) {
    for (var i = from.charCodeAt(0); i <= to.charCodeAt(0); i++) this.whitespaceChar[String.fromCharCode(i)] = b
};
WhitespaceState.prototype.toString = function toString() {
    return "{WhitespaceState}"
};

function WordState() {
    this.CLASS = "WordState";
    this.wordChars = {};
    this.setWordChars("a", "z", true);
    this.setWordChars("A", "Z", true);
    this.setWordChars("0", "9", true);
    this.setWordChars("-", "-", true);
    this.setWordChars("_", "_", true);
    this.setWordChars("'", "'", true);
    this.setWordChars(String.fromCharCode(192), String.fromCharCode(255), true)
}
WordState.prototype.nextToken = function nextToken(r, c, t) {
    var sval = "";
    do {
        sval += c;
        c = r.read()
    } while (this.wordChars[c] === true);
    if (c != null) r.unread(c);
    return new Token(Token.TT_WORD, sval, 0)
};
WordState.prototype.setWordChars = function setWordChars(from, to, b) {
    if (b == null) {
        var str = from;
        b = to;
        for (var i = 0; i < str.length; i++) this.wordChars[str.substring(i, i + 1)] = b
    } else {
        var fromCode = from;
        if (fromCode.charCodeAt) fromCode = fromCode.charCodeAt(0);
        var toCode = to;
        if (toCode.charCodeAt) toCode = toCode.charCodeAt(0);
        for (var i = fromCode; i <= toCode; i++) this.wordChars[String.fromCharCode(i)] = b
    }
};
WordState.prototype.toString = function toString() {
    return "{WordState}"
};

function Word() {
    Terminal.call(this);
    this.CLASSNAME = "Word"
}
Util.extend(Word, Terminal);
Word.prototype.qualifies = function qualifies(t) {
    return t.isWord()
};
Word.prototype.randomExpansion = function randomExpansion(maxDepth, depth) {
    var n = Math.floor(5 * Math.random()) + 3;
    var letters = "";
    for (var i = 0; i < n; i++) letters += String.fromCharCode(26 * Math.random() + "a".charCodeAt(0));
    return [letters]
};
Word.prototype.unvisitedString = function unvisitedString(visited) {
    return "Word"
};

function QuotedString() {
    Terminal.call(this)
}
Util.extend(QuotedString, Terminal);
QuotedString.prototype.qualifies = function qualifies(t) {
    return t.isQuotedString()
};
QuotedString.prototype.randomExpansion = function ramdomExpansion(maxDepth, depth) {
    var n = Math.floor(5 * Math.random());
    var result = '"';
    for (var i = 0; i < n; i++) result += String.fromCharCode(26 * Math.random() + "a".charCodeAt(0));
    result += '"';
    return [result]
};
QuotedString.prototype.unvisitedString = function unvisitedString(visited) {
    return "QuotedString"
};

function Symbol(s) {
    Terminal.call(this);
    this.CLASS = "Symbol";
    this.symbol = new Token(Token.TT_SYMBOL, s, 0)
}
Util.extend(Symbol, Terminal);
Symbol.prototype.qualifies = function qualifies(o) {
    return this.symbol.equals(o)
};
Symbol.prototype.unvisitedString = function unvisitedString(visited) {
    return this.symbol.toString()
};
