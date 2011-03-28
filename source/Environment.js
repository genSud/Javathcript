Javathcript.Environment = (function() {
  var LAMBDA_SIGN = "\u03bb";
  var Nil = [];

  function buildStringRep(exp, result) {
    if (result == null) {
      result = [];
    }
    if (exp instanceof Array) {
      result.push("(");
      for (var i = 0; i < exp.length; ++i) {
        buildStringRep(exp[i], result);
      }
      result.push(")");
    } else {
      result.push(exp);
    }
    return result;
  }

  function stringify(exp) {
    return buildStringRep(exp).join(" ").replace(/(\() | (\))/g, '$1$2');
  }

  function bool(b) {
    return b ? 't' : Nil;
  }

  function equal(a, b) {
    // three types, list, atom, string, number
    if (a instanceof Javathcript.Atom) {
      return b instanceof Javathcript.Atom && a.name == b.name;
    } else if (b instanceof Javathcript.Atom) {
      return false;
    }

    // Empty array is equal to empty string.
    var aIsEmpty = (a instanceof Array || typeof(a) == 'string') && a.length == 0;
    var bIsEmpty = (b instanceof Array || typeof(b) == 'string') && b.length == 0;
    if (aIsEmpty && bIsEmpty) {
      return true;
    }

    if (a instanceof Array && b instanceof Array) {
      if (a.length != b.length) {
        return false;
      }
      for (var i = 0; i < a.length; ++i) {
        if (equal(a[i], b[i]) == false) {
          return false;
        }
      }
      return true;
    }

    return a == b;
  }

  function newScope(oldScope) {
    function constructor() {}
    constructor.prototype = oldScope;
    var result = new constructor();
    return result;
  }

  function mergeScope(into, merging) {
    if (merging) {
      for (var i in merging) {
        into[i] = merging[i];
      }
    }
    return into;
  }

  function addNonGlobalsFromScope(into, merge) {
    for (var x in merge) {
      if (merge[x] != globalScope[x]) {
        into[x] = merge[x];
      }
    }
  }

  function wrapJsResult(jsResult) {
    if (typeof(jsResult) == 'boolean') {
      if (jsResult) {
        return "t";
      } else {
        return Nil;
      }
    }
    return jsResult;
  }

  var globalScope = null;

  function Environment() {
    globalScope = this;
  }

  Environment.prototype["quote"] = function(a, callback) {
    callback(a);
  };

  Environment.prototype["car"] = function(args, callback) {
    this["_value"](args, function(item) {
      if (typeof(item) == 'string') {
        callback(item.substring(0, 1));
      } else {
        callback(item[0]);
      }
    });
  };


  Environment.prototype["cdr"] = function(args, callback) {
    this["_value"](args, function(args) {
      var val = args.slice();
      if (val.substring) {
        callback(val.substring(1));
      } else {
        val.shift();
        callback(val);
      }
    });
  },

  Environment.prototype["equal"] = function(a, b) {
    this["_evalBinaryOp"](
      a, b, function(a, b) { return equal(a, b) ? "t" : Nil; }, callback);
  };

  Environment.prototype["cons"] = function(a, b, callback) {
    var that = this;
    this["_value"](a, function(a) {
      that["_value"](b, function(b) {
        if (typeof(a) == 'string' && typeof(b) == 'string') {
          callback(a+b);
        } else {
          b = b.slice();
          b.unshift(a);
          callback(b);
        }
      });
    });
  };

  Environment.prototype["concat"] = function(/* arguments */) {
    var args = Array.prototype.slice.call(arguments);
    var callback = args.pop();
    this["_valueArray"](args, function(args) {
      var result = args.shift();
      if (result instanceof Array) {
        callback(Array.prototype.concat.apply(result, args));
      } else {
        callback(result + args.join(""));
      }
    });
  };

  Environment.prototype["atom"] = function(a, callback) {
    this["_value"](a, function(a) {
      callback(bool( a instanceof Javathcript.Atom ));
    });
  };

  Environment.prototype["cond"] = function(callback) {
    var args = Array.prototype.slice.call(arguments);
    var callback = args.pop();
    if (args.length > 0) {
      var eval_index = 0;
      var that = this;
      var condHelper = function(elem) {
        eval_index++;
        if (eval_index > args.length) {
          callback(Nil);
        } else if (!equal(condition, Nil)) {
          that["_value"](args[eval_index - 1][1], callback);
        } else {
          that["_value"](args[eval_index], andHelper);
        }
      };
      this["_value"](args[eval_index][0], condHelper);
    } else {
      callback(Nil);
    }
  };

  Environment.prototype["lambda"] = function(variables, expression, callback) {
    // scope when function is defined
    var defScopeNonGlobals = {};
    addNonGlobalsFromScope(defScopeNonGlobals, this);

    var that = this;
    var func = function(/* arguments */) {
      var args = Array.prototype.slice.apply(arguments);
      var inner_callback = args.pop();
      // scope when function is called
      var funcScope = newScope(this);

      // add all nonglobal values into this funcscope
      mergeScope(funcScope, defScopeNonGlobals);

      that["_valueArray"](args, variables.length, function(args) {
        for (var i = 0; i < variables.length; ++i) {
          funcScope[variables[i]] = args[i];
        }
        if (arguments.callee["label"] != null) {
          funcScope[arguments.callee["label"]] = arguments.callee;
        }

        funcScope._value(expression, inner_callback);
      });
    };
    func.toString = function() {
      return LAMBDA_SIGN + stringify(variables)+stringify(expression);
    };
    callback(func);
  };

  Environment.prototype["export"] = function(lambda, callback) {
    var scope = this;
    callback(function(/* arguments */) {
      var args = arguments;
      scope["_value"](lambda, function(func) {
        lambda.apply(scope, args);
      });
    });
  };

  Environment.prototype["label"] = function(label, func, callback) {
    this["_value"](func, function(func) {
      func["label"] = label;
      callback(func);
    });
  };

  Environment.prototype["js"] = function(js_expr, callback) {
    var that = this;
    this["_value"](js_expr, function(val) {
      var result = eval(val);
      if (typeof(result) == 'function') {
        var wrappedFunction = function(/* arguments */) {
          var args = Array.prototype.slice.apply(arguments);
          var inner_callback = args.pop();
          that["_valueArray"](args, function(args) {
            var jsResult = result.apply(null, args);
            inner_callback(wrapJsResult(jsResult));
          });
        };
                wrappedFunction.toString = function() {
                    return result.toString();
                };
                callback(wrappedFunction);
      } else {
        callback(result);
      }
    });
  };

  Environment.prototype["method"] = function(obj, property, callback) {
    var that = this;
    this["_value"](obj, function(val) {
      that["_value"](property, function(property) {
        if (property instanceof Javathcript.Atom) {
          property = property.name;
        }
        var func = val[property];
        // some weird stuff happens with native functions in IE
        if (typeof(func) == 'object' && typeof(window.alert) == 'object') {
          func = function(a, b, c, d, e, f, g, h, i) {
            return val[property](a, b, c, d, e, f, g, h, i);
          };
        }
        if (typeof(func) != "function") {
          that["_error"]("Method "+property+" not found on object "+val);
        }
        callback(function(/* arguments */) {
          var args = Array.prototype.slice.apply(arguments);
          var inner_callback = args.pop();
          that["_valueArray"](args, function(args) {
            var jsResult = func.apply(val, args);
            inner_callback(wrapJsResult(jsResult));
          });
        });
      });
    });
  };

  Environment.prototype["let"] = function(bindings, expression, callback) {
    var letScope = newScope(this);
    var binds_count = bindings.length;
    var bind_names = [];
    var bind_expressions = [];
    for (var i = 0; i < binds_count; ++i) {
      bind_names.push(bindings[i][0]);
      bind_expressions.push(bindings[i][1]);
    }
    this["_valueArray"](bind_expressions, function(bind_expressions) {
      for (var i = 0; i < binds_count; ++i) {
        letScope[bind_names[i]] = bind_expressions[i];
      }
      letScope["_value"](expression, callback);
    });
  };

  Environment.prototype["let*"] = function(bindings, expression, callback) {
    var letScope = newScope(this);
    var binds_count = bindings.length;
    var bind_names = [];
    var bind_expressions = [];
    for (var i = 0; i < binds_count; ++i) {
      bind_names.push(bindings[i][0]);
      bind_expressions.push(bindings[i][1]);
    }
    letScope["_valueArray"](bind_expressions, function(bind_expressions) {
      for (var i = 0; i < binds_count; ++i) {
        letScope[bind_names[i]] = bind_expressions[i];
      }
      letScope["_value"](expression, callback);
    });
  };

  Environment.prototype["defun"] = function(name, variables, expression, callback) {
    this["lambda"](variables, expression, function(func) {
      globalScope[name] = func;
      callback(func);
    });
  };

  Environment.prototype["def"] = function(name, value, callback) {
    this["_value"](value, function(value) {
      globalScope[name] = value;
      callback(value);
    });
  };

  Environment.prototype["def-dyn"] = function(name, value, callback) {
    var that = this;
    this["_value"](name, function(name) {
      that["def"](name, value, callback);
    });
  };

  Environment.prototype["plus"] = function(/* arguments */) {
    var args = Array.prototype.slice.call(arguments);
    var callback = args.pop();
    this["_valueArray"](args, function(args) {
      var result = args[0];
      for (var i = 1; i < args.length; ++i) {
        result += args[i];
      }
      callback(result);
    });
  };

  Environment.prototype["minus"] = function(/* arguments */) {
    var args = Array.prototype.slice.call(arguments);
    var callback = args.pop();
    this["_valueArray"](args, function(args) {
      if (args.length == 1)  {
        callback(-args[0]);
      } else {
        var result = args[0];
        for (var i = 1; i < args.length; ++i) {
          result -= args[i];
        }
        callback(result);
      }
    });
  };

  Environment.prototype["divide"] = function(/* arguments */) {
    var args = Array.prototype.slice.call(arguments);
    var callback = args.pop();
    this["_valueArray"](args, function(args) {
      var result = args[0];
      for (var i = 1; i < args.length; ++i) {
        result /= args[i];
      }
      callback(result);
    });
  };

  Environment.prototype["times"] = function(/* arguments */) {
    var args = Array.prototype.slice.call(arguments);
    var callback = args.pop();
    this["_valueArray"](args, function(args) {
      var result = args[0];
      for (var i = 1; i < args.length; ++i) {
        result *= args[i];
      }
      callback(result);
    });
  };

  Environment.prototype["rem"] = function(a, b, callback) {
    this["_evalBinaryOp"](a, b, function(a, b) { return a % b; }, callback);
  };

  Environment.prototype["if"] = function(conditional, truePath, falsePath, callback) {
    var that = this;
    this["_value"](conditional, function(conditional) {
      if (equal(conditional, Nil) == false) {
        that["_value"](truePath, callback);
      } else if (falsePath != null) {
        that["_value"](falsePath, callback);
      } else {
        callback(Nil);
      }
    });
  };

  Environment.prototype["<"] = function(a, b, callback) {
    this["_evalBinaryOp"](a, b, function(a, b) { return bool(a < b); }, callback);
  };

  Environment.prototype[">"] = function(a, b, callback) {
    this["_evalBinaryOp"](a, b, function(a, b) { return bool(a > b); }, callback);
  };

  Environment.prototype["/="] = function(a, b, callback) {
    this["_evalBinaryOp"](a, b, function(a, b) { return !equal(a, b); }, callback);
  };

  Environment.prototype[">="] = function(a, b, callback) {
    this["_evalBinaryOp"](a, b, function(a, b) { return bool(a >= b); }, callback);
  };

  Environment.prototype["<="] = function(a, b, callback) {
    this["_evalBinaryOp"](a, b, function(a, b) { return bool(a <= b); }, callback);
  };

  Environment.prototype["not"] = function(a, callback) {
    this["_value"](a, function(a) {
      callback(bool(a, Nil));
    });
  };

  Environment.prototype["or"] = function(/* arguments */) {
    var args = Array.prototype.slice.call(arguments);
    var callback = args.pop();
    if (args.length > 0) {
      var eval_index = 0;
      var that = this;
      var andHelper = function(elem) {
        eval_index++;
        if (eval_index > args.length) {
          callback(Nil);
        } else if (!equal(elem, Nil)) {
          callback(elem);
        } else {
          that["_value"](args[eval_index], andHelper);
        }
      };
      this["_value"](args[eval_index], andHelper);
    } else {
      callback(Nil);
    }
  };

  Environment.prototype["and"] = function(/* arguments */) {
    var args = Array.prototype.slice.call(arguments);
    var callback = args.pop();
    if (args.length > 0) {
      var eval_index = 0;
      var that = this;
      var andHelper = function(elem) {
        eval_index++;
        if (eval_index > args.length) {
          callback("t");
        } else if (equal(elem, Nil)) {
          callback(Nil);
        } else {
          that["_value"](args[eval_index], andHelper);
        }
      }
      this["_value"](args[eval_index], andHelper);
    } else {
      callback("t");
    }
  };

  Environment.prototype["nth"] = function(n, l, callback) {
    var that = this;
    this["_value"](l, function(l) {
      that["_value"](n, function(n) {
        callback([n]);
      });
    });
  };

  Environment.prototype["consp"] = function(a, callback) {
    this["_value"](a, function(val) {
      callback(bool( val instanceof Array && val.length > 0 ));
    });
  };

  Environment.prototype["length"] = function(l, callback) {
    this["_value"](l, function(l) {
      callback(l.length);
    });
  };

  Environment.prototype["list"] = function(callback) {
    this["_valueArray"](arguments, callback);
  };

  Environment.prototype["get"] = function(obj, property, callback) {
    this["_value"](obj, function(val) {
      if (property instanceof Javathcript.Atom) {
        property = property.name;
      }
      callback(val[property]);
    });
  };

  Environment.prototype["substring"] = function(string, start, end, callback) {
    var that = this;
    this["_value"](string, function(string) {
      that["_value"](start, function(start) {
        that["_value"](end, function(end) {
          callback(string.substring(start, end));
        });
      });
    });
  };

  Environment.prototype["set"] = function(obj, property, value, callback) {
    var that = this;
    this["_value"](obj, function(obj) {
      that["_value"](value, function(val) {
        if (property instanceof Javathcript.Atom) {
          property = property.name;
        }
        obj[property] = val;
        callback(obj);
      });
    });
  };

  Environment.prototype["t"] = "t";
  Environment.prototype["Nil"] = Nil;

  Environment.prototype["_value"] = function(e, callback) {
    if (e instanceof Javathcript.UnevaluatedObj) {
      var object = new Object();
      for (var key in e) {
        object[key] = this["_value"](e[key]);
      }
      callback(object);
    } else if (e instanceof Array) {
      var data = e.slice();
      var head = data.shift();
      var that = this;
      this["_value"](head, function(headFunc) {
        if (typeof(headFunc) == 'function') {
          data.push(callback);
          headFunc.apply(that, data);
        } else {
          that["_error"]("'"+headFunc+"' not a function in environment when trying to evaluate "+stringify(e));
        }
      });
    } else if (e instanceof Javathcript.Atom) {
      if (this[e.name] != null) {
        callback(this[e.name]);
      } else {
        callback(e);
      }
    } else {
      callback(e);
    }
  };

  Environment.prototype["_valueArray"] = function(arr, maxitems, callback) {
    if (callback === undefined && maxitems !== undefined) {
      callback = maxitems;
      maxitems = undefined;
    }
    if (maxitems === undefined) {
      maxitems = arr.length;
    }
    var result = Array.prototype.slice.call(arr, 0, maxitems);
    var eval_index = 0;
    if (result.length > 0) {
      var that = this;
      var evalElement = function(elem) {
        result[eval_index++] = elem;
        if (eval_index == result.length) {
          callback(result);
        } else {
          that["_value"](result[eval_index], evalElement);
        }
      };
      this["_value"](result[eval_index], evalElement);
    } else {
      callback([]);
    }
  };

  Environment.prototype["_evalBinaryOp"] = function(a, b, op, callback) {
    var that = this;
    this["_value"](a, function(a) {
      that["_value"](b, function(b) {
        callback(op(a, b));
      });
    });
  };

  Environment.prototype["_error"] = function(message/* no callback*/) {
    console.error('Javathcript Error: ' + message);
  };

  Environment.prototype["_stringify"] = stringify;

  for (prop in Environment.prototype) {
    if (Environment.prototype[prop] instanceof Function) {
    Environment.prototype[prop].toString = function() {
      return '{library macro}';
    };
    }
  }

  return Environment;
})();
