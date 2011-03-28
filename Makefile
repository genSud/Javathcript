FILES = \
  source/BPWJs.js \
  source/Base.js \
  source/JavathcriptTokenizer.js \
  source/JavathcriptParser.js \
  source/Environment.js \
  source/Javathcript.js \
  source/DocumentEvaluator.js

all: Javathcript.js

Javathcript.js: $(FILES)
	cat $^ | yui-compressor --type js -o $@

clean:
	rm -f Javathcript.js
