/*
ECHO Language Syntax Analyzer

Implements a recursive descent parser to validate ECHO language syntax, grammar, and basic semantics (types, scoping).
It operates with O(N) performance and recovers from errors using panic mode synchronization.
Dependencies: TokenTypes, ASTBuilder.
*/

import { TOKEN_TYPES, isDataType } from '../../../shared/tokenTypes.js';
import { buildAST } from './ASTBuilder.js';

// --- Constants & Configuration ---

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

// --- Analyzer Class ---

// Main syntax analyzer handling parsing state, error recovery, and symbol table management.
class Analyzer {
  constructor(tokens) {
    // Filter out comments during initialization
    this.tokens = tokens.filter(t => 
      t.type !== TOKEN_TYPES.COMMENT_SINGLE && 
      t.type !== TOKEN_TYPES.COMMENT_MULTI
    );
    this.pos = 0;
    
    this.errors = [];
    this.warnings = [];
    this.symbolTable = new Map();
    
    this.loopDepth = 0;
    this.functionDepth = 0;
    
    this.panicMode = false;
  }

  // =========================================================================
  // Lexical Helpers
  // =========================================================================

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

  // =========================================================================
  // Error Handling & Recovery
  // =========================================================================

  error(message, category = ERROR_CATEGORIES.SYNTAX_ERROR, context = {}) {
    // Suppress secondary errors during panic mode
    if (this.panicMode && category !== ERROR_CATEGORIES.STRUCTURAL_ERROR) return;

    const token = context.token || this.current() || this.tokens[this.tokens.length - 1];
    const line = token ? token.line : 1;
    const column = token ? (token.column || 1) : 1;

    const duplicate = this.errors.find(e => 
      e.line === line && e.column === column && e.message === message
    );

    if (!duplicate) {
      this.errors.push({
        id: `err_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        line,
        column,
        message,
        category,
        severity: 'error',
        timestamp: new Date().toISOString(),
        context
      });
    }

    this.panicMode = true;
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

  // Discards tokens until a statement boundary is found to recover from errors.
  synchronize() {
    this.panicMode = false;

    while (!this.isAtEnd()) {
      if (this.tokens[this.pos - 1].type === TOKEN_TYPES.DEL_SEMICOLON) return;

      const type = this.current().type;
      
      if ([
        TOKEN_TYPES.KEYWORD_IF,
        TOKEN_TYPES.KEYWORD_FOR,
        TOKEN_TYPES.KEYWORD_WHILE,
        TOKEN_TYPES.KEYWORD_DO,
        TOKEN_TYPES.KEYWORD_ECHO,
        TOKEN_TYPES.KEYWORD_SWITCH,
        TOKEN_TYPES.KEYWORD_FUNCTION,
        TOKEN_TYPES.RESERVED_RETURN,
        TOKEN_TYPES.KEYWORD_END
      ].includes(type) || isDataType(type)) {
        return;
      }

      this.advance();
    }
  }

  // =========================================================================
  // Symbol Table & Semantics
  // =========================================================================

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
    if (this.panicMode) return;

    const name = token.lexeme;
    
    // Allow forward reference for functions (hoisting-like behavior)
    if (!this.symbolTable.has(name)) {
       if (this.peek()?.type === TOKEN_TYPES.DEL_LPAREN) return; 
       this.error(`Variable '${name}' is used but not declared.`, ERROR_CATEGORIES.REFERENCE_ERROR, { token });
       return;
    }

    const entry = this.symbolTable.get(name);
    if (!entry.initialized) {
        this.error(`Variable '${name}' is used but has not been initialized.`, ERROR_CATEGORIES.REFERENCE_ERROR, { token });
    }
  }

  validateIdentifierLength(tokenOrLexeme) {
    const lexeme = typeof tokenOrLexeme === 'string' ? tokenOrLexeme : tokenOrLexeme.lexeme;
    // Strip SIS marker '@' if present
    const identifier = lexeme.startsWith('@') ? lexeme.substring(1) : lexeme;
    
    if (identifier.length > 64) {
      this.error(`Identifier '${identifier}' exceeds maximum length of 64 characters`, ERROR_CATEGORIES.SYNTAX_ERROR);
    }
  }

  validateTypeAssignment(expected, actual) {
    if (this.panicMode || !actual || actual === 'unknown') return;
    if (expected === actual) return;
    
    // Implicit conversion: Number -> Decimal is usually allowed
    if (expected === 'decimal' && actual === 'number') return;
    
    this.error(`Type Error: Cannot assign '${actual}' to variable of type '${expected}'`, ERROR_CATEGORIES.TYPE_ERROR);
  }

  // =========================================================================
  // Core Parsing Logic
  // =========================================================================

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
       const unexpected = this.current();
       if (unexpected) {
          this.error(`Unexpected token '${unexpected.lexeme}'. Expected statement or 'end'.`, ERROR_CATEGORIES.SYNTAX_ERROR);
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
          if (this.isDoWhileTerminator()) break;
      }

      this.parseStatement();

      if (this.panicMode) this.synchronize();
    }
  }

  // Lookahead to distinguish between a new "while" loop and the "while" at the end of a "do...while".
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

  // =========================================================================
  // Statement Parsers
  // =========================================================================

  parseStatement() {
    const token = this.current();

    if (isDataType(token.type)) {
      this.parseDeclaration();
      return;
    }

    if (token.type === TOKEN_TYPES.IDENTIFIER) {
      this.parseIdentifierStart();
      return;
    }

    switch (token.type) {
      case TOKEN_TYPES.KEYWORD_ECHO:      this.parseEcho(); return;
      case TOKEN_TYPES.KEYWORD_IF:        this.parseIf(); return;
      case TOKEN_TYPES.KEYWORD_SWITCH:    this.parseSwitch(); return;
      case TOKEN_TYPES.KEYWORD_FOR:       this.parseFor(); return;
      case TOKEN_TYPES.KEYWORD_WHILE:     this.parseWhile(); return;
      case TOKEN_TYPES.KEYWORD_DO:        this.parseDoWhile(); return;
      case TOKEN_TYPES.KEYWORD_FUNCTION:  this.parseFunctionDef(); return;
      case TOKEN_TYPES.RESERVED_DATA:     this.parseDataStruct(); return;
      
      case TOKEN_TYPES.RESERVED_BREAK:
      case TOKEN_TYPES.RESERVED_CONTINUE:
      case TOKEN_TYPES.RESERVED_RETURN:
        this.parseJump(); 
        return;
      
      case TOKEN_TYPES.UNKNOWN:
        if (token.lexeme === ';') {
            this.error('Semicolons are not used in ECHO. Use newlines.', ERROR_CATEGORIES.SYNTAX_ERROR);
        } else {
            this.error(`Unknown token: ${token.lexeme}`, ERROR_CATEGORIES.SYNTAX_ERROR);
        }
        this.advance();
        return;
    }

    if (this.isBuiltin(token)) {
      this.parseBuiltinStatement();
      return;
    }

    this.error(`Unexpected token starting statement: '${token.lexeme}'`, ERROR_CATEGORIES.SYNTAX_ERROR);
    this.advance();
  }

  parseDeclaration() {
    const typeToken = this.advance();
    const declaredType = typeToken.lexeme;
    
    do {
      const idToken = this.match(TOKEN_TYPES.IDENTIFIER);
      if (!idToken) {
        this.error('Expected identifier in declaration', ERROR_CATEGORIES.SYNTAX_ERROR);
        return; 
      }
      
      this.validateIdentifierLength(idToken);
      
      let initialized = false;

      // 1. Assignment
      if (this.match(TOKEN_TYPES.OP_ASSIGN)) {
        const inferredType = this.parseExpression();
        this.validateTypeAssignment(declaredType, inferredType);
        initialized = true;
      } 
      // 2. Array Size
      else if (this.match(TOKEN_TYPES.DEL_LBRACK)) {
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

  parseIdentifierStart() {
    const idToken = this.advance();
    this.validateIdentifierLength(idToken);

    // List Access: arr[index] = val
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

    // Function Call
    if (this.check(TOKEN_TYPES.DEL_LPAREN)) {
      this.parseFunctionCall();
      return;
    }

    // Increment/Decrement
    if (this.match(TOKEN_TYPES.OP_INC) || this.match(TOKEN_TYPES.OP_DEC)) {
      this.checkVariableUsage(idToken);
      return; 
    }

    // Standard Assignment
    if (this.isAssignmentOp(this.current())) {
      this.advance();
      
      if (this.check(TOKEN_TYPES.KEYWORD_INPUT)) {
        this.parseInputExpression();
      } else {
        this.parseExpression();
      }
      this.markInitialized(idToken.lexeme);
      return;
    }

    this.error(`Unexpected token '${this.current()?.lexeme}' after identifier '${idToken.lexeme}'`, ERROR_CATEGORIES.SYNTAX_ERROR);
    this.advance();
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
  }

  parseEcho() {
    this.advance();
    const nextToken = this.current();
    if (!nextToken || !this.isValidExpressionStart(nextToken)) {
        this.error(`Expected expression after 'echo'`, ERROR_CATEGORIES.SYNTAX_ERROR);
        return; 
    }
    this.parseExpression();
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

  // --- Loops ---

  parseFor() {
    this.loopDepth++;
    this.advance();
    
    const idToken = this.match(TOKEN_TYPES.IDENTIFIER);
    if (!idToken) {
      this.error('Expected identifier after "for"', ERROR_CATEGORIES.SYNTAX_ERROR, { grammar: GRAMMAR_RULES.FOR });
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
    // Pass 'true' to indicate do-block context
    this.parseStatementList(true); 
    
    if (!this.match(TOKEN_TYPES.KEYWORD_WHILE)) {
      this.error('Expected "while" after do block statements', ERROR_CATEGORIES.SYNTAX_ERROR, { grammar: GRAMMAR_RULES.DO_WHILE });
    }
    this.parseExpression();
    this.consumeEndKeyword('do', GRAMMAR_RULES.DO_WHILE);
    this.loopDepth--;
  }

  // --- Functions & Structures ---

  parseFunctionDef() {
    this.functionDepth++;
    this.advance();
    
    // Optional return type
    if (isDataType(this.current()?.type)) {
      this.advance();
    }
    
    const idToken = this.match(TOKEN_TYPES.IDENTIFIER);
    if (!idToken) {
      this.error('Expected function name', ERROR_CATEGORIES.SYNTAX_ERROR, { grammar: GRAMMAR_RULES.FUNCTION });
    } else {
      this.validateIdentifierLength(idToken);
      this.declareVariable(idToken.lexeme, 'function', true);
    }

    if (!this.match(TOKEN_TYPES.DEL_LPAREN)) this.error('Expected "(" after function name', ERROR_CATEGORIES.SYNTAX_ERROR);

    // Params
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

    if (!this.match(TOKEN_TYPES.DEL_RPAREN)) this.error('Expected ")" after parameters', ERROR_CATEGORIES.SYNTAX_ERROR);

    this.parseStatementList();
    this.consumeEndKeyword('function', GRAMMAR_RULES.FUNCTION);
    this.functionDepth--;
  }

  parseDataStruct() {
    this.advance();
    if (!this.match(TOKEN_TYPES.RESERVED_STRUCT)) {
      this.error('Expected "struct" after "data"', ERROR_CATEGORIES.SYNTAX_ERROR, { grammar: GRAMMAR_RULES.DATA_STRUCT });
      return;
    }
    
    const idToken = this.match(TOKEN_TYPES.IDENTIFIER);
    if (!idToken) {
      this.error('Expected struct name', ERROR_CATEGORIES.SYNTAX_ERROR);
    } else {
      this.validateIdentifierLength(idToken);
      this.declareVariable(idToken.lexeme, 'struct', true);
    }

    if (!this.match(TOKEN_TYPES.DEL_LBRACE)) this.error('Expected "{" start struct body', ERROR_CATEGORIES.SYNTAX_ERROR);

    // Field Definitions
    while (!this.check(TOKEN_TYPES.DEL_RBRACE) && !this.isAtEnd()) {
      const currentType = this.current().type;
      const nextType = this.peek()?.type;

      // Schema Binding: id : type (func)
      if (currentType === TOKEN_TYPES.IDENTIFIER && nextType === TOKEN_TYPES.DEL_COLON) {
          const bindId = this.advance(); 
          this.validateIdentifierLength(bindId);
          this.advance();
          
          if (!isDataType(this.current()?.type)) {
              this.error(`Expected data type in binding, found '${this.current()?.lexeme}'`, ERROR_CATEGORIES.SYNTAX_ERROR);
          } else {
              this.advance(); 
          }
          
          if (this.check(TOKEN_TYPES.DEL_LPAREN)) {
             this.advance(); 
             const funcId = this.match(TOKEN_TYPES.IDENTIFIER);
             if (!funcId) this.error('Expected function identifier in binding clause', ERROR_CATEGORIES.SYNTAX_ERROR);
             if (!this.match(TOKEN_TYPES.DEL_RPAREN)) this.error('Expected closing ")" in binding clause', ERROR_CATEGORIES.SYNTAX_ERROR);
          }
      } 
      // Field Declaration: type id = val
      else if (isDataType(currentType)) {
          const fieldType = this.advance().lexeme;
          const fieldId = this.match(TOKEN_TYPES.IDENTIFIER);
          if (!fieldId) {
              this.error('Expected field name', ERROR_CATEGORIES.SYNTAX_ERROR);
          } else {
              this.validateIdentifierLength(fieldId);
              if (this.match(TOKEN_TYPES.OP_ASSIGN)) {
                  const inferred = this.parseExpression();
                  this.validateTypeAssignment(fieldType, inferred);
              }
          }
      } else {
          if (this.match(TOKEN_TYPES.DEL_COMMA)) continue;
          this.error(`Unexpected token in struct definition: '${this.current()?.lexeme}'`, ERROR_CATEGORIES.SYNTAX_ERROR);
          this.advance();
      }
    }

    if (!this.match(TOKEN_TYPES.DEL_RBRACE)) this.error('Expected "}" to close struct', ERROR_CATEGORIES.SYNTAX_ERROR);
  }

  parseJump() {
    const type = this.advance().type;
    
    if (type === TOKEN_TYPES.RESERVED_RETURN) {
      if (this.functionDepth === 0) {
        this.error('Return statements are only allowed inside functions', ERROR_CATEGORIES.SEMANTIC_ERROR);
      }
      if (this.current() && this.isValidExpressionStart(this.current())) {
        this.parseExpression();
      }
    } else {
      if (this.loopDepth === 0) {
         this.error(`${type} statement must be inside a loop`, ERROR_CATEGORIES.SEMANTIC_ERROR);
      }
    }
  }

  // =========================================================================
  // Expression Parsing (Precedence Climbing)
  // =========================================================================

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
    while (this.check(TOKEN_TYPES.OP_MUL) || this.check(TOKEN_TYPES.OP_DIV) || 
           this.check(TOKEN_TYPES.OP_MOD) || this.check(TOKEN_TYPES.OP_INT_DIV)) {
      
      const op = this.advance(); // Consumes the operator
      const opType = op.type;
      
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
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.current();
    if (!token) return 'unknown';

    // 1. Literals
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

    // 2. Identifiers & Calls
    if (token.type === TOKEN_TYPES.IDENTIFIER) {
      this.validateIdentifierLength(token);
      this.advance();
      
      // Function Call
      if (this.check(TOKEN_TYPES.DEL_LPAREN)) {
        this.parseFunctionCall();
        return 'unknown'; // Runtime return type unknown at static analysis
      }
      // List Access
      else if (this.check(TOKEN_TYPES.DEL_LBRACK)) {
        this.checkVariableUsage(token);
        this.advance();
        this.parseExpression();
        if (!this.match(TOKEN_TYPES.DEL_RBRACK)) this.error('Expected "]" in list access', ERROR_CATEGORIES.SYNTAX_ERROR);
        return 'unknown';
      }
      
      this.checkVariableUsage(token);
      return this.symbolTable.has(token.lexeme) ? this.symbolTable.get(token.lexeme).type : 'unknown';
    }

    // 3. Grouping
    if (this.match(TOKEN_TYPES.DEL_LPAREN)) {
      const type = this.parseExpression();
      if (!this.match(TOKEN_TYPES.DEL_RPAREN)) {
        this.error('Expected ")" after expression', ERROR_CATEGORIES.SYNTAX_ERROR);
      }
      return type;
    }

    // 4. List Literal
    if (this.match(TOKEN_TYPES.DEL_LBRACK)) {
        if (!this.check(TOKEN_TYPES.DEL_RBRACK)) {
            do { this.parseExpression(); } while (this.match(TOKEN_TYPES.DEL_COMMA));
        }
        if (!this.match(TOKEN_TYPES.DEL_RBRACK)) {
            this.error('Expected "]" to close list literal', ERROR_CATEGORIES.SYNTAX_ERROR);
            if (this.check(TOKEN_TYPES.DEL_RPAREN)) this.advance();
        }
        return 'list';
    }

    // 5. Built-ins
    if (this.isBuiltin(token)) {
        this.advance();
        this.parseFunctionArgs();
        return 'number'; // Most built-ins return numbers (sum, avg, etc)
    }

    this.error(`Unexpected token in expression: ${token.lexeme}`, ERROR_CATEGORIES.SYNTAX_ERROR);
    this.advance();
    return 'unknown';
  }

  // --- Helpers for Primary ---

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
    this.parseFunctionArgs();
  }

  parseFunctionArgs() {
    if (!this.match(TOKEN_TYPES.DEL_LPAREN)) {
        this.error('Expected "(" after function name', ERROR_CATEGORIES.SYNTAX_ERROR);
    }
    if (!this.check(TOKEN_TYPES.DEL_RPAREN)) {
      do {
        this.parseExpression();
      } while (this.match(TOKEN_TYPES.DEL_COMMA));
    }
    if (!this.match(TOKEN_TYPES.DEL_RPAREN)) {
      this.error('Expected ")" after arguments', ERROR_CATEGORIES.SYNTAX_ERROR);
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

  // =========================================================================
  // Utilities
  // =========================================================================

  consumeEndKeyword(blockType, grammarContext) {
    if (this.check(TOKEN_TYPES.KEYWORD_END)) {
        // Check for specific block ends like 'end if', 'end for'
        const typeMap = {
          'if': TOKEN_TYPES.KEYWORD_IF,
          'for': TOKEN_TYPES.KEYWORD_FOR,
          'while': TOKEN_TYPES.KEYWORD_WHILE,
          'do': TOKEN_TYPES.KEYWORD_DO,
          'switch': TOKEN_TYPES.KEYWORD_SWITCH,
          'function': TOKEN_TYPES.KEYWORD_FUNCTION
        };

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

// --- Main Export ---

// Runs the syntax analysis process on a list of tokens.
export const syntaxAnalyzer = (tokens) => {
  const analyzer = new Analyzer(tokens);
  
  // 1. Run Syntax Analysis
  analyzer.analyzeProgram();

  // 2. Build AST if syntax is valid
  // This separation allows for lightweight syntax checks without full tree construction
  let astResult = { success: false, ast: null };
  
  if (analyzer.errors.length === 0) {
      const cleanTokens = tokens.filter(t => 
        t.type !== TOKEN_TYPES.COMMENT_SINGLE && 
        t.type !== TOKEN_TYPES.COMMENT_MULTI
      );
      
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