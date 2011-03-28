Javathcript.Tokenizer = function(s) {
  Javathcript.BPWJs.Tokenizer.call(this, s);
  this.CLASS = "JavathcriptTokenizer";
};

Javathcript.BPWJs.Util.extend(Javathcript.Tokenizer, Javathcript.BPWJs.Tokenizer);

Javathcript.Tokenizer.prototype.initialCharacterState = function() {
  this.wordState.setWordChars(".+*-<>=", true);
  this.commentState = new Javathcript.BPWJs.SlashSlashState();
  this.setCharacterState(0, 255, this.wordState);
  this.setCharacterState(0,   ' ', this.whitespaceState);
  this.setCharacterState(",", this.whitespaceState);
  this.setCharacterState("'(){}:", this.symbolState);
  this.setCharacterState(";", this.commentState);
  this.setCharacterState('0', '9', this.numberState);
  this.setCharacterState( '"', this.quoteState);
  this.setCharacterState( ".", this.numberState);
};
