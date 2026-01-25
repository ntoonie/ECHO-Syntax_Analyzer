/*
ECHO Language Syntax Analyzer

Recursive descent parser for O(N) performance.
Dependencies: TokenTypes, ASTBuilder
*/

import { TOKEN_TYPES, isDataType } from '../../../shared/tokenTypes.js';
import { buildAST } from './ASTBuilder.js';

export const ERROR_CATEGORIES = {
  SYNTAX_ERROR: 'SYNTAX_ERROR',
  GRAMMAR_ERROR: 'GRAMMAR_ERROR',
  SEMANTIC_ERROR: 'SEMANTIC_ERROR',
  STRUCTURAL_ERROR: 'STRUCTURAL_ERROR',
  TYPE_ERROR: 'TYPE_ERROR',
  REFERENCE_ERROR: 'REFERENCE_ERROR'
};

const GRAMMAR_RULES = {
  PROGRAM: '<ECHO_program> => "start" <statement_list> "end"',
  IF: '<if_stmt> => "if" <expression> <statement_list> "end" "if"',
  FOR: '<for_loop> => "for" <id> "=" <expr> "to" <expr> [ "by" <expr> ] <stmt_list> "end" "for"',
  WHILE: '<while_loop> => "while" <expression> <statement_list> "end" "while"',
  DO_WHILE: '<do_while_loop> => "do" <statement_list> "while" <expression> "end" "do"',
  SWITCH: '<switch_stmt> => "switch" <expression> { "case" <literal> <stmt_list> } [ "default" <stmt_list> ] "end" "switch"',
  FUNCTION: '<function_def> => "function" [<return_type>] <id> "(" [<param_list>] ")" <stmt_list> [<return_stmt>] "end" "function"',
  DATA_STRUCT: '<data_struct> => "data" "struct" <identifier> "{" <field_list> "}"',
  INPUT: '<input_stmt> => <identifier> "=" "input" "(" <data_type> ["," <expression>] ")"'
};

/*
Analyzer Class

Main syntax analyzer class with error handling and parsing capabilities.
*/
class Analyzer {
  constructor(tokens) {
    this.tokens = tokens.filter(t => 
      t.type !== TOKEN_TYPES.COMMENT_SINGLE && 
      t.type !== TOKEN_TYPES.COMMENT_MULTI
    );
    this.pos = 0;
    this.errors = [];
    this.warnings = [];
    this.loopDepth = 0;
    this.functionDepth = 0;
    
    // Panic Mode Error Recovery
    this.panicMode = false;
    
    // Symbol Table
    this.symbolTable = new Map();
  }

  // Utility methods
  current() {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  peek(offset = 1) {
    return this.pos + offset < this.tokens.length ? this.tokens[this.pos + offset] : null;
  }

  advance() {
    if (this.pos < this.tokens.length) this.pos++;
    return this.tokens[this.pos - 1];
  }

  match(type) {
    if (this.check(type)) return this.advance();
    return null;
  }

  check(type) {
    const token = this.current();
    return token && token.type === type;
  }

  isAtEnd() {
    return this.pos >= this.tokens.length;
  }

  // Error reporting with duplicate suppression and panic mode
  error(message, category = ERROR_CATEGORIES.SYNTAX_ERROR, context = {}) {
    // Suppress errors during panic mode to prevent cascading
    if (this.panicMode && category !== ERROR_CATEGORIES.STRUCTURAL_ERROR) return;

    // Prevent identical duplicates
    const token = context.token || this.current() || this.tokens[this.tokens.length - 1];
    const line = token ? token.line : 1;
    const column = token ? (token.column || 1) : 1;
    
    const duplicate = this.errors.find(e => e.line === line && e.column === column && e.message === message);
    if (!duplicate) {
      this.errors.push({
        id: Math.random().toString(36).substring(2, 11),
        line,
        column,
        message,
        category,
        severity: 'error',
        timestamp: new Date().toISOString(),
        context
      });
    }

    // 3. Enter panic mode
    this.panicMode = true;
  }

  // Synchronization: Discards tokens until a clear statement boundary is found
  synchronize() {
    this.panicMode = false;

    while (!this.isAtEnd()) {
      if (this.tokens[this.pos - 1].type === TOKEN_TYPES.DEL_SEMICOLON) return; // Optional semicolon support

      const type = this.current().type;
      
      // Stop at keywords that start statements
      if (
        type === TOKEN_TYPES.KEYWORD_IF ||
        type === TOKEN_TYPES.KEYWORD_FOR ||
        type === TOKEN_TYPES.KEYWORD_WHILE ||
        type === TOKEN_TYPES.KEYWORD_DO ||
        type === TOKEN_TYPES.KEYWORD_ECHO ||
        type === TOKEN_TYPES.KEYWORD_SWITCH ||
        type === TOKEN_TYPES.KEYWORD_FUNCTION ||
        type === TOKEN_TYPES.RESERVED_RETURN ||
        type === TOKEN_TYPES.KEYWORD_END || // Stop at block end
        isDataType(type) // Variable declaration
      ) {
        return;
      }

      this.advance();
    }
  }

  warning(message, context = {}) {
    const token = this.current() || this.tokens[this.tokens.length - 1];
    this.warnings.push({
      line: token ? token.line : 1,
      column: token ? (token.column || 1) : 1,
      message,
      category: ERROR_CATEGORIES.SEMANTIC_ERROR,
      severity: 'warning',
      context
    });
  }

  // --- Symbol Table Helpers ---

  declareVariable(name, type, initialized = false) {
    this.symbolTable.set(name, { type, initialized });
  }

  markInitialized(name) {
    if (this.symbolTable.has(name)) {
      const entry = this.symbolTable.get(name);
      entry.initialized = true;
      this.symbolTable.set(name, entry);
    }
  }

  checkVariableUsage(token) {
    // If in panic mode, don't check semantics (avoids noise)
    if (this.panicMode) return;

    const name = token.lexeme;
    
    if (!this.symbolTable.has(name)) {
       if (this.peek()?.type === TOKEN_TYPES.DEL_LPAREN) return; // Basic forward-ref allowance for functions
       this.error(`Variable '${name}' is used but not declared.`, ERROR_CATEGORIES.REFERENCE_ERROR, { token });
       return;
    }

    const entry = this.symbolTable.get(name);
    if (!entry.initialized) {
        this.error(`Variable '${name}' is used but has not been initialized (assigned a value).`, ERROR_CATEGORIES.REFERENCE_ERROR, { token });
    }
  }

  validateIdentifierLength(tokenOrLexeme) {
    const lexeme = typeof tokenOrLexeme === 'string' ? tokenOrLexeme : tokenOrLexeme.lexeme;
    const identifier = lexeme.startsWith('@') ? lexeme.substring(1) : lexeme;
    if (identifier.length > 64) {
      this.error(`Identifier '${identifier}' exceeds maximum length of 64 characters`, ERROR_CATEGORIES.SYNTAX_ERROR);
    }
  }

  validateTypeAssignment(expected, actual) {
    if (this.panicMode) return;
    if (actual === 'unknown' || !actual) return;
    if (expected === actual) return;
    if (expected === 'decimal' && actual === 'number') return;
    this.error(`Type Error: Cannot assign '${actual}' to variable of type '${expected}'`, ERROR_CATEGORIES.TYPE_ERROR);
  }

  // --- Main Entry Point ---

  analyzeProgram() {
    if (!this.tokens.length) {
      this.error('Empty program', ERROR_CATEGORIES.STRUCTURAL_ERROR);
      return;
    }

    if (!this.match(TOKEN_TYPES.KEYWORD_START)) {
      this.error('Program must begin with "start" keyword', ERROR_CATEGORIES.STRUCTURAL_ERROR, { grammar: GRAMMAR_RULES.PROGRAM });
    }

    this.parseStatementList();

    if (!this.check(TOKEN_TYPES.KEYWORD_END)) {
       if (!this.isAtEnd()) {
          this.error(`Unexpected token '${this.current()?.lexeme}'. Expected statement or 'end'.`, ERROR_CATEGORIES.SYNTAX_ERROR);
       } else {
          this.error('Program must end with "end" keyword', ERROR_CATEGORIES.STRUCTURAL_ERROR, { grammar: GRAMMAR_RULES.PROGRAM });
       }
    } else {
      this.advance();
      if (!this.isAtEnd()) {
        this.error('Unexpected tokens after "end" keyword', ERROR_CATEGORIES.STRUCTURAL_ERROR);
      }
    }
  }

  // --- Statement Parsing ---

  parseStatementList(isDoBlock = false) {
    while (!this.isAtEnd()) {
      const type = this.current().type;
      
      if (type === TOKEN_TYPES.KEYWORD_END || 
          type === TOKEN_TYPES.KEYWORD_ELSE || 
          type === TOKEN_TYPES.KEYWORD_CASE || 
          type === TOKEN_TYPES.KEYWORD_DEFAULT) {
        break;
      }
      
      if (type === TOKEN_TYPES.KEYWORD_WHILE && isDoBlock) {
          if (this.isDoWhileTerminator()) {
              break;
          }
      }

      this.parseStatement();

      // Synchronize if we hit an error
      if (this.panicMode) {
        this.synchronize();
      }
    }
  }

  isDoWhileTerminator() {
    let i = this.pos + 1;
    while (i < this.tokens.length) {
        const t = this.tokens[i];
        if (t.type === TOKEN_TYPES.KEYWORD_END) {
            const next = this.tokens[i + 1];
            return next && next.type === TOKEN_TYPES.KEYWORD_DO;
        }
        if (t.type === TOKEN_TYPES.KEYWORD_START || 
            (t.type === TOKEN_TYPES.KEYWORD_END && this.tokens[i + 1]?.type !== TOKEN_TYPES.KEYWORD_DO)) {
            return false;
        }
        i++;
    }
    return false;
  }

  parseStatement() {
    const token = this.current();

    if (token.type === TOKEN_TYPES.UNKNOWN) {
        if (token.lexeme === ';') {
            this.error('Semicolons are not used in ECHO. Use newlines.', ERROR_CATEGORIES.SYNTAX_ERROR);
        } else {
            this.error(`Unknown token: ${token.lexeme}`, ERROR_CATEGORIES.SYNTAX_ERROR);
        }
        this.advance();
        return;
    }

    if (isDataType(token.type)) {
      this.parseDeclaration();
      return;
    }

    if (token.type === TOKEN_TYPES.KEYWORD_ECHO) {
      this.parseEcho();
      return;
    }

    if (token.type === TOKEN_TYPES.KEYWORD_IF) {
      this.parseIf();
      return;
    }
    if (token.type === TOKEN_TYPES.KEYWORD_SWITCH) {
      this.parseSwitch();
      return;
    }

    if (token.type === TOKEN_TYPES.KEYWORD_FOR) {
      this.parseFor();
      return;
    }
    if (token.type === TOKEN_TYPES.KEYWORD_WHILE) {
      this.parseWhile();
      return;
    }
    if (token.type === TOKEN_TYPES.KEYWORD_DO) {
      this.parseDoWhile();
      return;
    }

    if (token.type === TOKEN_TYPES.KEYWORD_FUNCTION) {
      this.parseFunctionDef();
      return;
    }

    if (token.type === TOKEN_TYPES.RESERVED_DATA) {
      this.parseDataStruct();
      return;
    }

    if ([TOKEN_TYPES.RESERVED_BREAK, TOKEN_TYPES.RESERVED_CONTINUE, TOKEN_TYPES.RESERVED_RETURN].includes(token.type)) {
      this.parseJump();
      return;
    }

    if (token.type === TOKEN_TYPES.IDENTIFIER) {
      this.parseIdentifierStart();
      return;
    }

    if (this.isBuiltin(token)) {
      this.parseBuiltinStatement();
      return;
    }

    this.error(`Unexpected token starting statement: '${token.lexeme}'`, ERROR_CATEGORIES.SYNTAX_ERROR);
    this.advance();
  }

  // <declaration_stmt>
  parseDeclaration() {
    const typeToken = this.advance();
    const declaredType = typeToken.lexeme;
    
    do {
      const idToken = this.match(TOKEN_TYPES.IDENTIFIER);
      if (!idToken) {
        // If we expect an ID but find something else (like an Unknown token), error and return.
        // The loop in parseStatementList will catch panicMode and synchronize.
        const errorToken = (this.check(TOKEN_TYPES.KEYWORD_END) || this.isAtEnd()) 
            ? this.tokens[this.pos - 1] 
            : this.current();
        this.error('Expected identifier in declaration', ERROR_CATEGORIES.SYNTAX_ERROR, { token: errorToken });
        return; 
      } else {
        this.validateIdentifierLength(idToken);
      }
      
      let initialized = false;
      if (this.match(TOKEN_TYPES.OP_ASSIGN)) {
        const inferredType = this.parseExpression();
        this.validateTypeAssignment(declaredType, inferredType);
        initialized = true;
      } else if (this.match(TOKEN_TYPES.DEL_LBRACK)) {
        if (!this.match(TOKEN_TYPES.NUMBER_LITERAL)) {
           this.error('Array declaration requires a number literal for size', ERROR_CATEGORIES.SYNTAX_ERROR);
        }
        if (!this.match(TOKEN_TYPES.DEL_RBRACK)) {
           this.error('Expected "]" after array size', ERROR_CATEGORIES.SYNTAX_ERROR);
        }
        initialized = true;
      }

      this.declareVariable(idToken.lexeme, declaredType, initialized);

    } while (this.match(TOKEN_TYPES.DEL_COMMA));
  }

  parseInputExpression() {
    this.advance();
    if (!this.match(TOKEN_TYPES.DEL_LPAREN)) {
      this.error('Expected "(" after input', ERROR_CATEGORIES.SYNTAX_ERROR, { grammar: GRAMMAR_RULES.INPUT });
      return;
    }

    if (!isDataType(this.current()?.type)) {
      this.error('Expected data type as first argument to input()', ERROR_CATEGORIES.TYPE_ERROR);
    } else {
      this.advance();
    }

    if (this.match(TOKEN_TYPES.DEL_COMMA)) {
      this.parseExpression();
    }

    if (!this.match(TOKEN_TYPES.DEL_RPAREN)) {
      this.error('Expected ")" to close input statement', ERROR_CATEGORIES.SYNTAX_ERROR);
    }
    return true; 
  }

  parseIdentifierStart() {
    const idToken = this.advance();
    this.validateIdentifierLength(idToken);

    if (this.check(TOKEN_TYPES.DEL_LBRACK)) {
      this.checkVariableUsage(idToken); 
      this.advance();
      this.parseExpression(); 
      if (!this.match(TOKEN_TYPES.DEL_RBRACK)) {
        this.error('Expected "]" after list index', ERROR_CATEGORIES.SYNTAX_ERROR);
      }
      if (!this.isAssignmentOp(this.current())) {
        this.error('Expected assignment operator after list access', ERROR_CATEGORIES.SYNTAX_ERROR);
      }
      this.advance();
      this.parseExpression();
      return;
    }

    if (this.check(TOKEN_TYPES.DEL_LPAREN)) {
      this.parseFunctionCall();
      return;
    }

    if (this.match(TOKEN_TYPES.OP_INC) || this.match(TOKEN_TYPES.OP_DEC)) {
      this.checkVariableUsage(idToken);
      return; 
    }

    if (this.isAssignmentOp(this.current())) {
      this.advance();
      
      if (this.check(TOKEN_TYPES.KEYWORD_INPUT)) {
        this.parseInputExpression();
        this.markInitialized(idToken.lexeme);
      } else {
        this.parseExpression();
        this.markInitialized(idToken.lexeme);
      }
      return;
    }

    this.error(`Unexpected token '${this.current()?.lexeme}' after identifier '${idToken.lexeme}'`, ERROR_CATEGORIES.SYNTAX_ERROR);
    this.advance();
  }

  parseEcho() {
    this.advance();
    const nextToken = this.current();
    if (!nextToken || !this.isValidExpressionStart(nextToken)) {
        const errorToken = (nextToken && nextToken.type === TOKEN_TYPES.KEYWORD_END) 
            ? this.tokens[this.pos - 1] 
            : nextToken;
        this.error(`Expected expression or string to output after 'echo', found '${nextToken ? nextToken.lexeme : 'end of file'}'`, ERROR_CATEGORIES.SYNTAX_ERROR, { token: errorToken });
        return; 
    }

    this.parseExpression();
  }

  parseExpression() {
    return this.parseLogicOr();
  }
  
  parseLogicOr() {
    let type = this.parseLogicAnd();
    while (this.match(TOKEN_TYPES.OP_OR)) {
      this.parseLogicAnd();
      type = 'boolean';
    }
    return type;
  }

  parseLogicAnd() {
    let type = this.parseEquality();
    while (this.match(TOKEN_TYPES.OP_AND)) {
      this.parseEquality();
      type = 'boolean';
    }
    return type;
  }

  parseEquality() {
    let type = this.parseRelational();
    while (this.match(TOKEN_TYPES.OP_EQ) || this.match(TOKEN_TYPES.OP_NEQ)) {
      this.parseRelational();
      type = 'boolean';
    }
    return type;
  }

  parseRelational() {
    let type = this.parseAdditive();
    while (this.check(TOKEN_TYPES.OP_LT) || this.check(TOKEN_TYPES.OP_GT) || 
           this.check(TOKEN_TYPES.OP_LTE) || this.check(TOKEN_TYPES.OP_GTE)) {
      this.advance();
      this.parseAdditive();
      type = 'boolean';
    }
    return type;
  }

  parseAdditive() {
    let leftType = this.parseMultiplicative();
    while (this.match(TOKEN_TYPES.OP_ADD) || this.match(TOKEN_TYPES.OP_SUB)) {
      const op = this.tokens[this.pos - 1];
      const rightType = this.parseMultiplicative();
      if (op.type === TOKEN_TYPES.OP_ADD && (leftType === 'string' || rightType === 'string')) {
          leftType = 'string';
      } else if (leftType === 'decimal' || rightType === 'decimal') {
          leftType = 'decimal';
      } else {
          leftType = 'number';
      }
    }
    return leftType;
  }

  parseMultiplicative() {
    let leftType = this.parseExponential();
    while (this.match(TOKEN_TYPES.OP_MUL) || this.match(TOKEN_TYPES.OP_DIV) || 
           this.match(TOKEN_TYPES.OP_MOD) || this.check(TOKEN_TYPES.OP_INT_DIV)) {
      const opType = this.current().type;
      if (this.check(TOKEN_TYPES.OP_INT_DIV)) this.advance();
      else this.advance();
      const rightType = this.parseExponential();
      if (opType === TOKEN_TYPES.OP_DIV) {
          leftType = 'decimal';
      } else if (leftType === 'decimal' || rightType === 'decimal') {
          leftType = 'decimal';
      } else {
          leftType = 'number';
      }
    }
    return leftType;
  }

  parseExponential() {
    let type = this.parseUnary();
    while (this.match(TOKEN_TYPES.OP_EXP)) {
      this.parseUnary();
      type = 'number';
    }
    return type;
  }

  parseUnary() {
    if (this.match(TOKEN_TYPES.OP_NOT)) {
      this.parseUnary();
      return 'boolean';
    }
    if (this.match(TOKEN_TYPES.OP_SUB) || this.match(TOKEN_TYPES.OP_ADD) ||
        this.match(TOKEN_TYPES.OP_INC) || this.match(TOKEN_TYPES.OP_DEC)) {
      const type = this.parseUnary();
      return type;
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.current();
    if (!token) return 'unknown';

    if (token.type === TOKEN_TYPES.NUMBER_LITERAL) {
      this.advance();
      return 'number';
    }
    if (token.type === TOKEN_TYPES.DECIMAL_LITERAL) {
      this.advance();
      return 'decimal';
    }
    if (token.type === TOKEN_TYPES.STRING_LITERAL || token.type === TOKEN_TYPES.SIS_MARKER) {
      this.parseStringLiteral();
      return 'string';
    }
    if (token.type === TOKEN_TYPES.RESERVED_TRUE || token.type === TOKEN_TYPES.RESERVED_FALSE) {
      this.advance();
      return 'boolean';
    }
    if (token.type === TOKEN_TYPES.RESERVED_NULL) {
      this.advance();
      return 'null';
    }

    if (token.type === TOKEN_TYPES.IDENTIFIER) {
      this.validateIdentifierLength(token);
      this.advance();
      
      if (this.check(TOKEN_TYPES.DEL_LPAREN)) {
        this.parseFunctionCall();
        return 'unknown'; 
      }
      else if (this.check(TOKEN_TYPES.DEL_LBRACK)) {
        this.checkVariableUsage(token);
        this.advance();
        this.parseExpression();
        if (!this.match(TOKEN_TYPES.DEL_RBRACK)) this.error('Expected "]" in list access', ERROR_CATEGORIES.SYNTAX_ERROR);
        return 'unknown';
      }
      
      this.checkVariableUsage(token);
      
      if (this.symbolTable.has(token.lexeme)) {
          return this.symbolTable.get(token.lexeme).type;
      }
      return 'unknown';
    }

    if (this.match(TOKEN_TYPES.DEL_LPAREN)) {
      const type = this.parseExpression();
      if (!this.match(TOKEN_TYPES.DEL_RPAREN)) {
        this.error('Expected ")" after expression', ERROR_CATEGORIES.SYNTAX_ERROR);
      }
      return type;
    }

    if (this.match(TOKEN_TYPES.DEL_LBRACK)) {
        if (!this.check(TOKEN_TYPES.DEL_RBRACK)) {
            do {
                this.parseExpression();
            } while (this.match(TOKEN_TYPES.DEL_COMMA));
        }
        if (!this.match(TOKEN_TYPES.DEL_RBRACK)) {
            this.error('Expected "]" to close list literal', ERROR_CATEGORIES.SYNTAX_ERROR);
            if (this.check(TOKEN_TYPES.DEL_RPAREN)) {
                this.advance();
            }
        }
        return 'list';
    }

    if (this.isBuiltin(token)) {
        this.advance();
        if (!this.match(TOKEN_TYPES.DEL_LPAREN)) this.error('Expected "("', ERROR_CATEGORIES.SYNTAX_ERROR);
        if (!this.check(TOKEN_TYPES.DEL_RPAREN)) {
             do { this.parseExpression(); } while(this.match(TOKEN_TYPES.DEL_COMMA));
        }
        if (!this.match(TOKEN_TYPES.DEL_RPAREN)) this.error('Expected ")"', ERROR_CATEGORIES.SYNTAX_ERROR);
        return 'number';
    }

    this.error(`Unexpected token in expression: ${token.lexeme}`, ERROR_CATEGORIES.SYNTAX_ERROR);
    this.advance();
    return 'unknown';
  }

  parseStringLiteral() {
    this.advance();
    let lastToken = this.tokens[this.pos - 1]; 

    while (!this.isAtEnd()) {
        const token = this.current();
        if (token.type === TOKEN_TYPES.SIS_MARKER || token.type === TOKEN_TYPES.STRING_LITERAL) {
            if (token.type === TOKEN_TYPES.SIS_MARKER) {
                this.validateIdentifierLength(token);
                const varName = token.lexeme.startsWith('@') ? token.lexeme.substring(1) : token.lexeme;
                this.checkVariableUsage({ lexeme: varName, line: token.line, column: token.column });
            }
            lastToken = this.advance();
        } else {
            break;
        }
    }
    
    if (lastToken.type === TOKEN_TYPES.STRING_LITERAL && !lastToken.lexeme.endsWith('"')) {
        this.error('Unterminated string literal', ERROR_CATEGORIES.SYNTAX_ERROR);
    }
  }

  parseLiteral() {
    if (this.match(TOKEN_TYPES.NUMBER_LITERAL) || 
        this.match(TOKEN_TYPES.STRING_LITERAL) || 
        this.match(TOKEN_TYPES.RESERVED_TRUE) || 
        this.match(TOKEN_TYPES.RESERVED_FALSE)) {
        return;
    }
    this.error('Expected literal value', ERROR_CATEGORIES.SYNTAX_ERROR);
  }

  parseIf() {
    this.advance();
    this.parseExpression();
    this.parseStatementList();
    while (this.check(TOKEN_TYPES.KEYWORD_ELSE)) {
      this.advance();
      if (this.match(TOKEN_TYPES.KEYWORD_IF)) {
        this.parseExpression();
        this.parseStatementList();
      } else {
        this.parseStatementList();
        break;
      }
    }
    this.consumeEndKeyword('if', GRAMMAR_RULES.IF);
  }

  parseFor() {
    this.loopDepth++;
    this.advance();
    
    const idToken = this.match(TOKEN_TYPES.IDENTIFIER);
    if (!idToken) {
      const errorToken = (this.check(TOKEN_TYPES.KEYWORD_END) || this.isAtEnd()) 
          ? this.tokens[this.pos - 1] 
          : this.current();
      this.error('Expected identifier after "for"', ERROR_CATEGORIES.SYNTAX_ERROR, { grammar: GRAMMAR_RULES.FOR, token: errorToken });
      if (!this.check(TOKEN_TYPES.KEYWORD_END)) this.advance();
    } else {
      this.validateIdentifierLength(idToken);
      this.declareVariable(idToken.lexeme, 'number', true);
    }

    if (!this.match(TOKEN_TYPES.OP_ASSIGN)) {
      this.error('Expected "=" in for loop initialization', ERROR_CATEGORIES.SYNTAX_ERROR);
    }
    this.parseExpression();
    if (!this.match(TOKEN_TYPES.NOISE_TO)) {
      this.error('Expected "to" in for loop', ERROR_CATEGORIES.SYNTAX_ERROR);
    }
    this.parseExpression();
    if (this.match(TOKEN_TYPES.NOISE_BY)) {
      this.parseExpression();
    }
    this.parseStatementList();
    this.consumeEndKeyword('for', GRAMMAR_RULES.FOR);
    this.loopDepth--;
  }

  parseWhile() {
    this.loopDepth++;
    this.advance();
    this.parseExpression();
    this.parseStatementList();
    this.consumeEndKeyword('while', GRAMMAR_RULES.WHILE);
    this.loopDepth--;
  }

  parseDoWhile() {
    this.loopDepth++;
    this.advance();
    this.parseStatementList(false, true); 
    if (!this.match(TOKEN_TYPES.KEYWORD_WHILE)) {
      this.error('Expected "while" after do block statements', ERROR_CATEGORIES.SYNTAX_ERROR, { grammar: GRAMMAR_RULES.DO_WHILE });
    }
    this.parseExpression();
    this.consumeEndKeyword('do', GRAMMAR_RULES.DO_WHILE);
    this.loopDepth--;
  }

  parseSwitch() {
    this.advance();
    this.parseExpression();
    while (this.check(TOKEN_TYPES.KEYWORD_CASE)) {
      this.advance();
      this.parseLiteral();
      this.parseStatementList();
    }
    if (this.check(TOKEN_TYPES.KEYWORD_DEFAULT)) {
      this.advance();
      this.parseStatementList();
    }
    this.consumeEndKeyword('switch', GRAMMAR_RULES.SWITCH);
  }

  parseFunctionDef() {
    this.functionDepth++;
    this.advance();
    if (isDataType(this.current()?.type)) {
      this.advance();
    }
    const idToken = this.match(TOKEN_TYPES.IDENTIFIER);
    if (!idToken) {
      const errorToken = (this.check(TOKEN_TYPES.KEYWORD_END) || this.isAtEnd()) 
          ? this.tokens[this.pos - 1] 
          : this.current();
      this.error('Expected function name', ERROR_CATEGORIES.SYNTAX_ERROR, { grammar: GRAMMAR_RULES.FUNCTION, token: errorToken });
      if (!this.check(TOKEN_TYPES.KEYWORD_END)) this.advance();
    } else {
      this.validateIdentifierLength(idToken);
      this.declareVariable(idToken.lexeme, 'function', true);
    }

    if (!this.match(TOKEN_TYPES.DEL_LPAREN)) {
      this.error('Expected "(" after function name', ERROR_CATEGORIES.SYNTAX_ERROR);
    }

    if (!this.check(TOKEN_TYPES.DEL_RPAREN)) {
      do {
        let typeToken = null;
        if (!isDataType(this.current()?.type)) {
          this.error('Expected parameter data type', ERROR_CATEGORIES.SYNTAX_ERROR);
        } else {
          typeToken = this.advance();
        }
        const paramId = this.match(TOKEN_TYPES.IDENTIFIER);
        if (!paramId) {
          this.error('Expected parameter name', ERROR_CATEGORIES.SYNTAX_ERROR);
        } else {
          this.validateIdentifierLength(paramId);
          if (typeToken && paramId) {
             this.declareVariable(paramId.lexeme, typeToken.lexeme, true);
          }
        }
      } while (this.match(TOKEN_TYPES.DEL_COMMA));
    }

    if (!this.match(TOKEN_TYPES.DEL_RPAREN)) {
      this.error('Expected ")" after parameters', ERROR_CATEGORIES.SYNTAX_ERROR);
    }

    this.parseStatementList();
    this.consumeEndKeyword('function', GRAMMAR_RULES.FUNCTION);
    this.functionDepth--;
  }

  parseFunctionCall() {
    this.advance();
    if (!this.check(TOKEN_TYPES.DEL_RPAREN)) {
      do {
        this.parseExpression();
      } while (this.match(TOKEN_TYPES.DEL_COMMA));
    }
    if (!this.match(TOKEN_TYPES.DEL_RPAREN)) {
      this.error('Expected ")" after function arguments', ERROR_CATEGORIES.SYNTAX_ERROR);
    }
  }

  parseBuiltinStatement() {
    this.advance(); 
    if (!this.match(TOKEN_TYPES.DEL_LPAREN)) {
        this.error('Expected "(" after built-in function name', ERROR_CATEGORIES.SYNTAX_ERROR);
    }
    if (!this.check(TOKEN_TYPES.DEL_RPAREN)) {
      do {
        this.parseExpression();
      } while (this.match(TOKEN_TYPES.DEL_COMMA));
    }
    if (!this.match(TOKEN_TYPES.DEL_RPAREN)) {
      this.error('Expected ")" after built-in function arguments', ERROR_CATEGORIES.SYNTAX_ERROR);
    }
  }

  parseDataStruct() {
    this.advance(); 
    if (!this.match(TOKEN_TYPES.RESERVED_STRUCT)) {
      this.error('Expected "struct" after "data"', ERROR_CATEGORIES.SYNTAX_ERROR, { grammar: GRAMMAR_RULES.DATA_STRUCT });
      return;
    }
    const idToken = this.match(TOKEN_TYPES.IDENTIFIER);
    if (!idToken) {
      const errorToken = (this.check(TOKEN_TYPES.KEYWORD_END) || this.isAtEnd()) 
          ? this.tokens[this.pos - 1] 
          : this.current();
      this.error('Expected struct name', ERROR_CATEGORIES.SYNTAX_ERROR, { token: errorToken });
      this.advance();
    } else {
      this.validateIdentifierLength(idToken);
      this.declareVariable(idToken.lexeme, 'struct', true);
    }

    if (!this.match(TOKEN_TYPES.DEL_LBRACE)) {
      this.error('Expected "{" start struct body', ERROR_CATEGORIES.SYNTAX_ERROR);
    }

    while (!this.check(TOKEN_TYPES.DEL_RBRACE) && !this.isAtEnd()) {
      const currentType = this.current().type;
      const nextType = this.peek()?.type;

      if (currentType === TOKEN_TYPES.IDENTIFIER && nextType === TOKEN_TYPES.DEL_COLON) {
          const bindId = this.advance(); 
          this.validateIdentifierLength(bindId);
          this.advance(); 
          if (!isDataType(this.current()?.type)) {
              this.error(`Expected data type after ':' in schema binding, found '${this.current()?.lexeme}'`, ERROR_CATEGORIES.SYNTAX_ERROR);
          } else {
              this.advance(); 
          }
          if (this.check(TOKEN_TYPES.DEL_LPAREN)) {
             this.advance(); 
             const funcId = this.match(TOKEN_TYPES.IDENTIFIER);
             if (!funcId) {
                this.error('Expected function identifier in binding clause', ERROR_CATEGORIES.SYNTAX_ERROR);
             } else {
                this.validateIdentifierLength(funcId);
             }
             if (!this.match(TOKEN_TYPES.DEL_RPAREN)) {
                this.error('Expected closing ")" in binding clause', ERROR_CATEGORIES.SYNTAX_ERROR);
             }
          }
      } 
      else if (isDataType(currentType)) {
          const fieldTypeToken = this.advance();
          const fieldType = fieldTypeToken.lexeme;
          const fieldId = this.match(TOKEN_TYPES.IDENTIFIER);
          if (!fieldId) {
              this.error('Expected field name', ERROR_CATEGORIES.SYNTAX_ERROR);
              this.advance();
          } else {
              this.validateIdentifierLength(fieldId);
          }
          if (this.match(TOKEN_TYPES.OP_ASSIGN)) {
              const inferred = this.parseExpression();
              this.validateTypeAssignment(fieldType, inferred);
          }
      } else {
          if (this.match(TOKEN_TYPES.DEL_COMMA)) continue;
          this.error(`Unexpected token in struct definition: '${this.current()?.lexeme}'`, ERROR_CATEGORIES.SYNTAX_ERROR);
          this.advance();
      }
    }

    if (!this.match(TOKEN_TYPES.DEL_RBRACE)) {
      this.error('Expected "}" to close struct', ERROR_CATEGORIES.SYNTAX_ERROR);
    }
  }

  parseJump() {
    const type = this.advance().type;
    if (type === TOKEN_TYPES.RESERVED_RETURN) {
      if (this.functionDepth === 0) {
        this.error('Return statements are only allowed inside functions', ERROR_CATEGORIES.SEMANTIC_ERROR);
      }
      const next = this.current();
      if (next && this.isValidExpressionStart(next)) {
        this.parseExpression();
      }
    } else {
      if (this.loopDepth === 0) {
         this.error(`${type} statement must be inside a loop`, ERROR_CATEGORIES.SEMANTIC_ERROR);
      }
    }
  }

  consumeEndKeyword(blockType, grammarContext) {
    const typeMap = {
      'if': TOKEN_TYPES.KEYWORD_IF,
      'for': TOKEN_TYPES.KEYWORD_FOR,
      'while': TOKEN_TYPES.KEYWORD_WHILE,
      'do': TOKEN_TYPES.KEYWORD_DO,
      'switch': TOKEN_TYPES.KEYWORD_SWITCH,
      'function': TOKEN_TYPES.KEYWORD_FUNCTION
    };
    
    if (this.check(TOKEN_TYPES.KEYWORD_END)) {
        const expectedSuffix = typeMap[blockType];
        if (expectedSuffix) {
            const next = this.peek(1);
            if (next && next.type === expectedSuffix) {
                this.advance(); 
                this.advance(); 
                return;
            } else {
                this.error(`Expected "${blockType}" after "end"`, ERROR_CATEGORIES.STRUCTURAL_ERROR, { grammar: grammarContext });
                return;
            }
        } else {
             this.advance(); 
             return;
        }
    }
    this.error(`Expected "end" to close ${blockType} block`, ERROR_CATEGORIES.STRUCTURAL_ERROR, { grammar: grammarContext });
  }

  isAssignmentOp(token) {
    return token && [
      TOKEN_TYPES.OP_ASSIGN, TOKEN_TYPES.OP_ADD_ASSIGN, TOKEN_TYPES.OP_SUB_ASSIGN, 
      TOKEN_TYPES.OP_MUL_ASSIGN, TOKEN_TYPES.OP_DIV_ASSIGN, TOKEN_TYPES.OP_MOD_ASSIGN
    ].includes(token.type);
  }

  isValidExpressionStart(token) {
      return [
          TOKEN_TYPES.IDENTIFIER, TOKEN_TYPES.NUMBER_LITERAL, TOKEN_TYPES.STRING_LITERAL,
          TOKEN_TYPES.SIS_MARKER, 
          TOKEN_TYPES.RESERVED_TRUE, TOKEN_TYPES.RESERVED_FALSE, TOKEN_TYPES.DEL_LPAREN,
          TOKEN_TYPES.DEL_LBRACK, TOKEN_TYPES.OP_NOT, TOKEN_TYPES.OP_SUB
      ].includes(token.type) || this.isBuiltin(token);
  }

  isBuiltin(tokenOrType) {
      if (!tokenOrType) return false;
      const lexeme = tokenOrType.lexeme || (typeof tokenOrType === 'string' ? tokenOrType : '');
      if (['sum', 'median', 'mode', 'average', 'isEven', 'isOdd'].includes(lexeme)) {
          return true;
      }
      const type = tokenOrType.type || tokenOrType;
      return [TOKEN_TYPES.BUILTIN_SUM, TOKEN_TYPES.BUILTIN_MEDIAN, TOKEN_TYPES.BUILTIN_MODE, 
           TOKEN_TYPES.BUILTIN_AVERAGE, TOKEN_TYPES.BUILTIN_ISEVEN, TOKEN_TYPES.BUILTIN_ISODD].includes(type);
  }
}

export const syntaxAnalyzer = (tokens) => {
  const cleanTokens = tokens.filter(t => 
    t.type !== TOKEN_TYPES.COMMENT_SINGLE && 
    t.type !== TOKEN_TYPES.COMMENT_MULTI
  );

  const analyzer = new Analyzer(cleanTokens);
  
  analyzer.analyzeProgram();

  let astResult = { success: false, ast: null };
  if (analyzer.errors.length === 0) {
      astResult = buildAST(cleanTokens);
      if (!astResult) {
          analyzer.error('Internal AST construction failed despite valid syntax.', ERROR_CATEGORIES.GRAMMAR_ERROR);
      } else if (astResult.errors && astResult.errors.length > 0) {
          astResult.errors.forEach(e => analyzer.errors.push(e));
      }
  }

  return {
    errors: analyzer.errors,
    warnings: analyzer.warnings,
    success: analyzer.errors.length === 0,
    ast: astResult?.ast || null,
    astValid: !!astResult?.ast
  };
};

export default syntaxAnalyzer;