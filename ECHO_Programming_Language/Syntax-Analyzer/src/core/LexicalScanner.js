import { TOKEN_TYPES, KEYWORDS } from '../../../shared/tokenTypes.js';

/**
 * Lexical Scanner for the ECHO language.
 * Transforms raw source code into a linear sequence of tokens by analyzing characters against grammar rules.
 * Depends on the shared TokenTypes module for token definitions and keyword constants.
 */

// Core tokenizer engine processing source code into tokens.
class Lexer {
  constructor(rawCode) {
    this.code = this.normalize(rawCode);
    this.length = this.code.length;
    this.tokens = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;

    // Character sets definitions
    this.operatorChars = new Set(['<', '>', '!', '=', '&', '|', '+', '-', '*', '/', '%', '^', '?']);
    this.delimiters = {
      '(': TOKEN_TYPES.DEL_LPAREN,
      ')': TOKEN_TYPES.DEL_RPAREN,
      '[': TOKEN_TYPES.DEL_LBRACK,
      ']': TOKEN_TYPES.DEL_RBRACK,
      '{': TOKEN_TYPES.DEL_LBRACE,
      '}': TOKEN_TYPES.DEL_RBRACE,
      ',': TOKEN_TYPES.DEL_COMMA,
      '.': TOKEN_TYPES.DEL_PERIOD,
      ':': TOKEN_TYPES.DEL_COLON,
    };
  }

  normalize(code) {
    return (code || '')
      .replace(/\u00A0/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '');
  }

  isLetter(c) {
    return c && /[A-Za-z]/.test(c);
  }

  isDigit(c) {
    return c && /[0-9]/.test(c);
  }

  isIdentifierStart(c) {
    return c && /[a-zA-Z_]/.test(c);
  }

  isIdentifierPart(c) {
    return c && /[a-zA-Z0-9_]/.test(c);
  }

  isNumberStart(c) {
    const next = this.peek(1);
    return (
      this.isDigit(c) ||
      ((c === '+' || c === '-') && next && this.isDigit(next)) ||
      (c === '.' && next && this.isDigit(next))
    );
  }

  tokenize() {
    while (this.pos < this.length) {
      const char = this.peek();

      if (char === '\r') {
        this.pos++;
        continue;
      }
      if (char === ' ' || char === '\t' || char === '\n') {
        this.consumeWhitespace();
        continue;
      }

      if (char === '/' && this.peek(1) === '/') {
        // Check if this should be treated as an operator (integer division) or comment
        let prevNonWhitespace = null;
        let j = this.pos - 1;
        while (j >= 0 && (this.code[j] === ' ' || this.code[j] === '\t')) {
          j--;
        }
        if (j >= 0 && this.code[j] !== '\n' && this.code[j] !== '\r') {
          prevNonWhitespace = this.code[j];
        }

        // Treat as operator if not at start of line (after whitespace)
        const isOperator = prevNonWhitespace !== null && prevNonWhitespace !== '\n' && prevNonWhitespace !== '\r';
        
        if (isOperator) {
          this.scanOperator();
          continue;
        } else {
          this.scanSingleLineComment();
          continue;
        }
      }
      if (char === '/' && this.peek(1) === '*') {
        this.scanMultiLineComment();
        continue;
      }

      if (char === '"') {
        this.scanString();
        continue;
      }

      if (this.isNumberStart(char)) {
        this.scanNumber();
        continue;
      }

      if (this.isIdentifierStart(char)) {
        this.scanIdentifier();
        continue;
      }

      if (char === '@') {
        this.scanSISMarker();
        continue;
      }

      if (this.operatorChars.has(char)) {
        this.scanOperator();
        continue;
      }

      if (this.delimiters[char]) {
        this.addToken(this.delimiters[char], char);
        this.advance();
        continue;
      }

      this.handleUnknown();
    }

    return this.tokens;
  }

  // --- State Management ---

  peek(offset = 0) {
    if (this.pos + offset >= this.length) return null;
    return this.code[this.pos + offset];
  }

  advance() {
    if (this.pos >= this.length) return null;
    const char = this.code[this.pos];
    this.pos++;
    
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else if (char === '\t') {
      this.column += 4;
    } else {
      this.column++;
    }
    return char;
  }

  addToken(type, lexeme, startLine, startColumn) {
    this.tokens.push({
      type,
      lexeme,
      line: startLine || this.line,
      column: startColumn || (this.column - lexeme.length)
    });
  }

  // --- Scanners ---

  consumeWhitespace() {
    this.advance();
  }

  scanSingleLineComment() {
    const startLine = this.line;
    const startColumn = this.column;
    let comment = '';
    
    this.advance(); 
    this.advance(); 
    comment += '//';

    while (this.pos < this.length && this.peek() !== '\n') {
      comment += this.advance();
    }
    
    this.addToken(TOKEN_TYPES.COMMENT_SINGLE, comment, startLine, startColumn);
  }

  scanMultiLineComment() {
    const startLine = this.line;
    const startColumn = this.column;
    let comment = '/*';

    this.advance();
    this.advance();

    while (this.pos < this.length) {
      if (this.peek() === '*' && this.peek(1) === '/') {
        comment += '*/';
        this.advance();
        this.advance();
        break;
      }
      comment += this.advance();
    }

    this.addToken(TOKEN_TYPES.COMMENT_MULTI, comment, startLine, startColumn);
  }

  scanString() {
    let currentSegment = '';
    let startLine = this.line;
    let startColumn = this.column;

    this.advance(); // Consume opening quote

    while (this.pos < this.length && this.peek() !== '"') {
      const char = this.peek();

      // Handle SIS Interpolation (@variable)
      if (char === '@') {
        const nextChar = this.peek(1);

        // Error case: Space immediately following SIS marker
        if (nextChar === ' ') {
          if (currentSegment.length > 0) {
            this.addToken(TOKEN_TYPES.STRING_LITERAL, `"${currentSegment}"`, startLine, startColumn);
            currentSegment = '';
          }
          this.addToken(TOKEN_TYPES.UNKNOWN, '@ ', this.line, this.column);
          this.advance();
          this.advance();
          
          startLine = this.line;
          startColumn = this.column;
          continue;
        }

        if (currentSegment.length > 0) {
          this.addToken(TOKEN_TYPES.STRING_LITERAL, `"${currentSegment}"`, startLine, startColumn);
          currentSegment = '';
        }

        this.scanSISMarker();
        
        startLine = this.line;
        startColumn = this.column;
        continue;
      }

      if (char === '\\' && this.peek(1)) {
        currentSegment += this.advance();
        currentSegment += this.advance();
        continue;
      }

      currentSegment += this.advance();
    }

    // Flush remaining segment or handle empty strings
    // Logic: If previous token was SIS, we need an empty string to close, or if it's literally ""
    if (currentSegment.length > 0) {
      this.addToken(TOKEN_TYPES.STRING_LITERAL, `"${currentSegment}"`, startLine, startColumn);
    } else {
      const lastToken = this.tokens[this.tokens.length - 1];
      const isSIS = lastToken && lastToken.type === TOKEN_TYPES.SIS_MARKER;
      
      if (this.tokens.length === 0 || isSIS || 
         (this.tokens.length > 0 && this.tokens[this.tokens.length - 1].lexeme !== `"${currentSegment}"`)) {
        this.addToken(TOKEN_TYPES.STRING_LITERAL, '""', startLine, startColumn);
      }
    }

    if (this.peek() === '"') {
      this.advance(); // Consume closing quote
    }
  }

  scanSISMarker() {
    const startLine = this.line;
    const startColumn = this.column;
    let lexeme = this.advance();

    if (this.isIdentifierStart(this.peek())) {
      while (this.isIdentifierPart(this.peek())) {
        lexeme += this.advance();
      }
    }

    this.addToken(TOKEN_TYPES.SIS_MARKER, lexeme, startLine, startColumn);
  }

  scanNumber() {
    const startLine = this.line;
    const startColumn = this.column;
    let num = '';
    let isDecimal = false;
    let hasExponent = false;

    if (['+', '-'].includes(this.peek())) {
      num += this.advance();
    }

    while (this.pos < this.length) {
      const c = this.peek();

      if (this.isDigit(c)) {
        num += this.advance();
        continue;
      }

      if (c === '.' && !isDecimal && !hasExponent) {
        isDecimal = true;
        num += this.advance();
        continue;
      }

      if ((c === 'e' || c === 'E') && !hasExponent) {
        hasExponent = true;
        num += this.advance();
        if (['+', '-'].includes(this.peek())) {
          num += this.advance();
        }
        continue;
      }

      // Check for invalid identifier start (e.g., 123abc)
      if (this.isIdentifierStart(c)) {
        // Consume invalid tail to prevent downstream errors
        while (this.isIdentifierPart(this.peek())) {
          num += this.advance();
        }
        this.addToken(TOKEN_TYPES.UNKNOWN, num, startLine, startColumn);
        return;
      }

      break;
    }

    const type = (isDecimal || hasExponent) ? TOKEN_TYPES.DECIMAL_LITERAL : TOKEN_TYPES.NUMBER_LITERAL;
    this.addToken(type, num, startLine, startColumn);
  }

  scanIdentifier() {
    const startLine = this.line;
    const startColumn = this.column;
    let word = '';

    while (this.isIdentifierPart(this.peek())) {
      word += this.advance();
    }

    const lowerWord = word.toLowerCase();
    let type = KEYWORDS[lowerWord] || TOKEN_TYPES.IDENTIFIER;

    // Override: Treat built-ins as identifiers
    const builtIns = ['sum', 'median', 'mode', 'average', 'isEven', 'isOdd'];
    if (builtIns.includes(lowerWord)) {
      type = TOKEN_TYPES.IDENTIFIER;
    }

    this.addToken(type, word, startLine, startColumn);
  }

  scanOperator() {
    const startLine = this.line;
    const startColumn = this.column;
    let run = '';

    while (this.operatorChars.has(this.peek())) {
      run += this.advance();
    }

    const singleOps = new Set(["<", ">", "=", "+", "-", "*", "/", "%", "^", "!", "?"]);
    const doubleOps = new Set([
      "<=", ">=", "==", "!=",
      "++", "--",
      "+=", "-=", "*=", "/=", "%=", "^=",
      "&&", "||",
      "//"
    ]);

    let type = TOKEN_TYPES.UNKNOWN;

    if (run.length === 1 && singleOps.has(run)) {
      if (run === "=") type = TOKEN_TYPES.OP_ASSIGN;
      else if (run === "<") type = TOKEN_TYPES.OP_LT;
      else if (run === ">") type = TOKEN_TYPES.OP_GT;
      else if (run === "!") type = TOKEN_TYPES.OP_NOT;
      else if (run === "?") type = TOKEN_TYPES.UNKNOWN;
      else type = TOKEN_TYPES.OP_ADD;
    } else if (run.length === 2 && doubleOps.has(run)) {
      if (run === "<=") type = TOKEN_TYPES.OP_LTE;
      else if (run === ">=") type = TOKEN_TYPES.OP_GTE;
      else if (run === "==") type = TOKEN_TYPES.OP_EQ;
      else if (run === "!=") type = TOKEN_TYPES.OP_NEQ;
      else if (["++", "--"].includes(run)) type = TOKEN_TYPES.OP_INC;
      else if (["&&", "||"].includes(run)) type = TOKEN_TYPES.OP_AND;
      else if (run === "//") type = TOKEN_TYPES.OP_INT_DIV;
      else type = TOKEN_TYPES.OP_ASSIGN;
    } 

    // Specific arithmetic mapping correction
    if (type === TOKEN_TYPES.OP_ADD && run === '*') type = TOKEN_TYPES.OP_MUL;
    if (type === TOKEN_TYPES.OP_ADD && run === '/') type = TOKEN_TYPES.OP_DIV;
    if (type === TOKEN_TYPES.OP_ADD && run === '%') type = TOKEN_TYPES.OP_MOD;
    if (type === TOKEN_TYPES.OP_ADD && run === '^') type = TOKEN_TYPES.OP_EXP;
    if (type === TOKEN_TYPES.OP_ADD && run === '-') type = TOKEN_TYPES.OP_SUB;

    this.addToken(type, run, startLine, startColumn);
  }
  
  scanDelimiter() {
    const char = this.peek();
    this.addToken(this.delimiters[char], char);
    this.advance();
  }

  handleUnknown() {
    const char = this.advance();
    
    // Explicitly handle Semicolon
    if (char === ';') {
      this.addToken(TOKEN_TYPES.UNKNOWN, char);
      return;
    }

    if (char === '\\') {
      this.addToken(TOKEN_TYPES.UNKNOWN, char);
      return;
    }

    this.addToken(TOKEN_TYPES.UNKNOWN, char);
  }
}

/**
 * Main lexical analyzer function exposed to the application.
 */
export const lexicalAnalyzer = (rawCode) => {
  const lexer = new Lexer(rawCode);
  return lexer.tokenize();
};