var Javathcript = (function() {
	
	var defaultEnvironment = new Environment();
	
	function eval(environment, parsed, result_callback) {
		var value = environment._value(parsed, function(value) {
			if (value === null) value = [];  // Nil
			if (value instanceof Array/* || value instanceof Function*/) {
				value.toString = function() {
					return Environment.stringify(this);
				};
			}
			if (result_callback) result_callback(value);
		});
	}
	
	return {
		eval: function(command, result_callback) {
			var parsed = JavathcriptParser.parse(command);
			eval(defaultEnvironment, parsed, result_callback);
		},
		evalMulti: function(command, result_callback, done_callback) {
			var tokA = new TokenAssembly(new JavathcriptTokenizer(command));
			if (tokA.hasMoreElements()) {
				var continuation = function(result) {
					if (result_callback) result_callback(result);
					tokA.commit();
					if (tokA.hasMoreElements()) {
						tokA = JavathcriptParser.parsePartial(tokA);
						eval(defaultEnvironment, tokA.pop(), continuation);
					} else {
						if (done_callback) done_callback();
					}
				};
				tokA = JavathcriptParser.parsePartial(tokA);
				eval(defaultEnvironment, tokA.pop(), continuation);
			} else {
				if (done_callback) done_callback();
			}
		},
		environment: defaultEnvironment
	};
	
})();