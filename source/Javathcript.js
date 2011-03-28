(function() {
  function eval(environment, parsed, result_callback) {
    var value = environment._value(parsed, function(value) {
      if (value === null) value = [];  // Nil
      if (value instanceof Array) {
        value.toString = function() {
          return Javathcript.environment._stringify(this);
        };
      }
      if (result_callback) result_callback(value);
    });
  }

  Javathcript.environment = new Javathcript.Environment();

  Javathcript.eval = function(command, result_callback) {
    var parsed = Javathcript.Parser.parse(command);
    eval(Javathcript.environment, parsed, result_callback);
  };

  Javathcript.evalMulti = function(command, result_callback, done_callback) {
    var tokA = new Javathcript.BPWJs.TokenAssembly(new Javathcript.Tokenizer(command));
    if (tokA.hasMoreElements()) {
      var continuation = function(result) {
        if (result_callback) result_callback(result);
        tokA.commit();
        if (tokA.hasMoreElements()) {
          tokA = Javathcript.Parser.parsePartial(tokA);
          eval(Javathcript.environment, tokA.pop(), continuation);
        } else {
          if (done_callback) done_callback();
        }
      };
      tokA = Javathcript.Parser.parsePartial(tokA);
      eval(Javathcript.environment, tokA.pop(), continuation);
    } else {
      if (done_callback) done_callback();
    }
  };
})();
