Javathcript.Parser = (function() {
  /*
   * expression = atomOrListOrObject | quotedAtomOrList
   * atomOrList = atom | list | object
   * object = '{' nameValue* '}
   * nameValue = atom ':' expression
   * quotedAtomOrList = ''' atomOrList
   * list = '(' expression* ')'
   * atom = Word | Num | QuotedString
   */

  var expression = Javathcript.BPWJs.grammarRule(Javathcript.BPWJs.Alternation, function(exp) {
    exp.either(atomOrListOrObject()).or(quotedAtomOrList());
  });

  var atomOrListOrObject = Javathcript.BPWJs.grammarRule(
      Javathcript.BPWJs.Alternation, function(atomOrListOrObject) {
    atomOrListOrObject.either(atom()).or(list()).or(object());
  });

  var objectStart = new Javathcript.BPWJs.Symbol("{").discard();
  objectStart.setAssembler(new Javathcript.BPWJs.Assembler(function(a) {
    a.push(new Javathcript.UnevaluatedObj());
  }));

  var object = Javathcript.BPWJs.grammarRule(Javathcript.BPWJs.Track, function(object) {
    object.first(objectStart).then(nameValue().repeating()).then(new Javathcript.BPWJs.Symbol("}").discard());
  });

  var nameValue = Javathcript.BPWJs.grammarRule(Javathcript.BPWJs.Track, function(nameValue) {
    nameValue.first(atom()).then(new Javathcript.BPWJs.Symbol(":").discard()).then(expression());
  }, new Javathcript.BPWJs.Assembler(function(a) {
    var exp = a.pop();
    var name = a.pop();
    var obj = a.pop();
    obj[name] = exp;
    a.push(obj);
  }));

  var quotedAtomOrList = Javathcript.BPWJs.grammarRule(
      Javathcript.BPWJs.Sequence, function(quotedAtomOrList) {
    quotedAtomOrList.first(new Javathcript.BPWJs.Symbol("'").discard()).then(atomOrListOrObject());
  }, new Javathcript.BPWJs.Assembler(function(a) {
    var val = a.pop();
    a.push([new Javathcript.Atom("quote"), val]);
  }));

  var openBrace = new Javathcript.BPWJs.Symbol('(');

  var list = Javathcript.BPWJs.grammarRule(Javathcript.BPWJs.Track, function(list) {
    list.first(openBrace).then(expression().repeating()).then(new Javathcript.BPWJs.Symbol(')').discard());
  }, new Javathcript.BPWJs.Assembler(function(a) {
    var elements = Javathcript.BPWJs.Assembler.elementsAbove(a, "(");
    a.push(elements.reverse());
  }));

  var string = new Javathcript.BPWJs.QuotedString();
  string.setAssembler(Javathcript.BPWJs.Assembler.unary(function (token) {
    return token.sval.substring(1, token.sval.length -1);
  }));

  var num  = new Javathcript.BPWJs.Num();
  num.setAssembler(Javathcript.BPWJs.Assembler.unary(function (token) {return token.nval;}));

  var word = new Javathcript.BPWJs.Word();
  word.setAssembler(Javathcript.BPWJs.Assembler.unary(function (token) {
    token.sval.atom = true;
    return new Javathcript.Atom(token.sval);
  }));

  var atom = Javathcript.BPWJs.grammarRule(Javathcript.BPWJs.Alternation, function(atom) {
    atom.either(word).or(num).or(string);
  });

  return {
    parse: function(s) {
      var a = expression().completeMatch(new Javathcript.BPWJs.TokenAssembly(new Javathcript.Tokenizer(s)));
      if (a == null) {
        throw new Error("Failed to parse "+s);
      }
      return a.pop();
    },
    parsePartial: function(tokA) {
      var a = expression().bestMatch(tokA);
      if (a == null) {
        throw new Error("Failed to parse "+tokA);
      }
      return a;
    }
  };
})();
