/**
 * Abstract Syntax Tree (AST) Builder
 *
 * Responsible for transforming a stream of tokens into a hierarchical Abstract Syntax Tree
 * based on the ECHO language formal grammar. Implements a recursive descent parser with
 * error recovery and modular node construction.
 */

import { TOKEN_TYPES, isDataType } from '../../../shared/tokenTypes.js';

// --- AST Node Definitions ---

export const AST_NODE_TYPES = {
  // Program Structure
  ECHO_PROGRAM: 'ECHO_PROGRAM',
  STMT_LIST: 'STMT_LIST',

  // Declarations
  DECLARATION_STMT: 'DECLARATION_STMT',
  DECL_LIST: 'DECL_LIST',
  DECL_ITEM: 'DECL_ITEM',
  DATA_TYPE: 'DATA_TYPE',

  // Operations
  INPUT_STMT: 'INPUT_STMT',
  OUTPUT_STMT: 'OUTPUT_STMT',
  ASSIGNMENT_STMT: 'ASSIGNMENT_STMT',
  ASSIGNMENT_OP: 'ASSIGNMENT_OP',
  INPUT_EXPRESSION: 'INPUT_EXPRESSION',

  // Control Flow
  IF_STMT: 'IF_STMT',
  ELSE_IF_BLOCK: 'ELSE_IF_BLOCK',
  SWITCH_STMT: 'SWITCH_STMT',
  CASE_BLOCK: 'CASE_BLOCK',
  JUMP_STMT: 'JUMP_STMT',

  // Loops
  FOR_LOOP: 'FOR_LOOP',
  WHILE_LOOP: 'WHILE_LOOP',
  DO_WHILE_LOOP: 'DO_WHILE_LOOP',
  STEP_CLAUSE: 'STEP_CLAUSE',

  // Functions
  FUNCTION_DEF: 'FUNCTION_DEF',
  PARAM_LIST: 'PARAM_LIST',
  PARAM: 'PARAM',
  RETURN_STMT: 'RETURN_STMT',
  FUNCTION_CALL: 'FUNCTION_CALL',
  ARG_LIST: 'ARG_LIST',
  RETURN_TYPE: 'RETURN_TYPE',

  // Built-ins
  BUILTIN_FUNCTION_CALL: 'BUILTIN_FUNCTION_CALL',
  BUILTIN_NAME: 'BUILTIN_NAME',

  // Expressions
  EXPRESSION: 'EXPRESSION',
  LOGIC_OR: 'LOGIC_OR',
  LOGIC_AND: 'LOGIC_AND',
  EQUALITY: 'EQUALITY',
  RELATIONAL: 'RELATIONAL',
  ADDITIVE: 'ADDITIVE',
  MULTIPLICATIVE: 'MULTIPLICATIVE',
  EXPONENTIAL: 'EXPONENTIAL',
  UNARY: 'UNARY',

  // Leaf Nodes
  IDENTIFIER: 'IDENTIFIER',
  NUMBER_LIT: 'NUMBER_LIT',
  DECIMAL_LIT: 'DECIMAL_LIT',
  STRING_LIT: 'STRING_LIT',
  BOOL_LIT: 'BOOL_LIT',
  NULL_LITERAL: 'NULL_LITERAL',
  LIST_LIT: 'LIST_LIT',
  ARRAY_ELEMENTS: 'ARRAY_ELEMENTS',
  LIST_ACCESS: 'LIST_ACCESS',
  STRING_CONTENT: 'STRING_CONTENT',
  STRING_INSERTION: 'STRING_INSERTION',

  // Data Structures
  DATA_STRUCT: 'DATA_STRUCT',
  FIELD_LIST: 'FIELD_LIST',
  FIELD_DECL: 'FIELD_DECL',
  SCHEMA_BINDING: 'SCHEMA_BINDING',
  BINDING_CLAUSE: 'BINDING_CLAUSE',
  FIELD_ACCESS: 'FIELD_ACCESS',
};

// Main parser class handling state management and recursive descent logic.
class ASTParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.current = 0;
    this.errors = [];
  }

  parse() {
    if (!this.tokens || this.tokens.length === 0) {
      this.addError("No tokens provided");
      return null;
    }

    try {
      return this.parseProgram();
    } catch (error) {
      this.addError(`Internal Parser Error: ${error.message}`);
      return null;
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  createNode(type, props = {}) {
    return { type, ...props, children: props.children || [] };
  }

  isAtEnd() {
    return this.current >= this.tokens.length;
  }

  peek(offset = 0) {
    if (this.current + offset >= this.tokens.length) return null;
    return this.tokens[this.current + offset];
  }

  previous() {
    return this.current > 0 ? this.tokens[this.current - 1] : null;
  }

  advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  check(type) {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  consume(type, message) {
    if (this.check(type)) return this.advance();
    
    const token = this.peek() || this.previous();
    this.addError(message || `Expected token type ${type}`, token);
    return null;
  }

  addError(message, token = null) {
    this.errors.push({
      message,
      line: token?.line || 0,
      column: token?.column || 0,
    });
  }

  // ===========================================================================
  // Program Structure
  // ===========================================================================

  parseProgram() {
    const startToken = this.consume(TOKEN_TYPES.KEYWORD_START, 'Program must begin with "start"');
    
    // Abort if start is missing to prevent cascading errors
    if (!startToken && this.errors.length > 0) return null;

    const statements = this.parseStatementList();

    const endToken = this.consume(TOKEN_TYPES.KEYWORD_END, 'Program must end with "end"');

    return this.createNode(AST_NODE_TYPES.ECHO_PROGRAM, {
      startToken,
      statements,
      endToken,
    });
  }

  parseStatementList(stopConditions = []) {
    const statements = [];

    while (!this.isAtEnd()) {
      if (this.check(TOKEN_TYPES.KEYWORD_END)) break;
      if (stopConditions.some(cond => this.check(cond))) break;

      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      } else {
        // Panic mode recovery: skip token to prevent infinite loops
        if (!this.isAtEnd()) this.advance();
      }
    }
    return this.createNode(AST_NODE_TYPES.STMT_LIST, { statements });
  }

  // ===========================================================================
  // Statements
  // ===========================================================================

  parseStatement() {
    // Skip noise words that don't affect logic
    while (this.match(TOKEN_TYPES.NOISE_WITH, TOKEN_TYPES.NOISE_TO, TOKEN_TYPES.NOISE_BY));

    const token = this.peek();
    if (!token) return null;

    if (isDataType(token.type)) return this.parseDeclaration();
    if (token.type === TOKEN_TYPES.KEYWORD_ECHO) return this.parseOutputStatement();
    
    // Lookahead for input syntax: identifier = input
    if (token.type === TOKEN_TYPES.IDENTIFIER && this.isInputStatement()) {
      return this.parseInputStatement();
    }

    // Control Flow
    if (token.type === TOKEN_TYPES.KEYWORD_IF) return this.parseIfStatement();
    if (token.type === TOKEN_TYPES.KEYWORD_SWITCH) return this.parseSwitchStatement();

    // Loops
    if (token.type === TOKEN_TYPES.KEYWORD_FOR) return this.parseForLoop();
    if (token.type === TOKEN_TYPES.KEYWORD_WHILE) return this.parseWhileLoop();
    if (token.type === TOKEN_TYPES.KEYWORD_DO) return this.parseDoWhileLoop();

    // Functions & Structures
    if (token.type === TOKEN_TYPES.KEYWORD_FUNCTION) return this.parseFunctionDef();
    if (token.type === TOKEN_TYPES.RESERVED_RETURN) return this.parseReturnStatement();
    if (token.type === TOKEN_TYPES.RESERVED_DATA) return this.parseDataStruct();

    // Jumps
    if (this.match(TOKEN_TYPES.RESERVED_BREAK, TOKEN_TYPES.RESERVED_CONTINUE)) {
      return this.createNode(AST_NODE_TYPES.JUMP_STMT, { keyword: this.previous(), type: this.previous().lexeme });
    }

    // Built-in Calls
    if (this.isBuiltinToken(token.type)) return this.parseBuiltinFunctionCall();

    // Fallback: Assignment or expression statement
    if (token.type === TOKEN_TYPES.IDENTIFIER) return this.parseAssignmentOrCall();

    return null;
  }

  isInputStatement() {
    const next = this.peek(1);
    const nextNext = this.peek(2);
    return next?.type === TOKEN_TYPES.OP_ASSIGN && nextNext?.type === TOKEN_TYPES.KEYWORD_INPUT;
  }

  isBuiltinToken(type) {
    return [
      TOKEN_TYPES.BUILTIN_SUM, TOKEN_TYPES.BUILTIN_MEDIAN, TOKEN_TYPES.BUILTIN_MODE,
      TOKEN_TYPES.BUILTIN_AVERAGE, TOKEN_TYPES.BUILTIN_ISEVEN, TOKEN_TYPES.BUILTIN_ISODD
    ].includes(type);
  }

  // ===========================================================================
  // Declarations
  // ===========================================================================

  parseDeclaration() {
    const typeToken = this.advance();
    const dataType = this.createNode(AST_NODE_TYPES.DATA_TYPE, { token: typeToken, name: typeToken.lexeme });
    
    const items = [];
    do {
      items.push(this.parseDeclarationItem());
    } while (this.match(TOKEN_TYPES.DEL_COMMA));

    return this.createNode(AST_NODE_TYPES.DECLARATION_STMT, {
      dataType,
      declList: this.createNode(AST_NODE_TYPES.DECL_LIST, { items })
    });
  }

  parseDeclarationItem() {
    const idToken = this.consume(TOKEN_TYPES.IDENTIFIER, "Expected identifier");
    if (!idToken) return null;

    const identifier = this.createNode(AST_NODE_TYPES.IDENTIFIER, { token: idToken, name: idToken.lexeme });

    // Handle array declarations
    if (this.match(TOKEN_TYPES.DEL_LBRACK)) {
      const sizeToken = this.consume(TOKEN_TYPES.NUMBER_LITERAL, "Expected array size");
      this.consume(TOKEN_TYPES.DEL_RBRACK, "Expected ']'");
      return this.createNode(AST_NODE_TYPES.DECL_ITEM, {
        identifier,
        isArray: true,
        size: sizeToken ? this.createNode(AST_NODE_TYPES.NUMBER_LIT, { token: sizeToken, value: parseFloat(sizeToken.lexeme) }) : null
      });
    }

    // Handle initialization assignment
    if (this.match(TOKEN_TYPES.OP_ASSIGN)) {
      const assignmentOp = this.createNode(AST_NODE_TYPES.ASSIGNMENT_OP, { value: '=' });
      const value = this.check(TOKEN_TYPES.DEL_LBRACK) ? this.parseListLiteral() : this.parseExpression();
      return this.createNode(AST_NODE_TYPES.DECL_ITEM, { identifier, assignmentOp, value });
    }

    return this.createNode(AST_NODE_TYPES.DECL_ITEM, { identifier });
  }

  // ===========================================================================
  // Assignment & I/O
  // ===========================================================================

  parseAssignmentOrCall() {
    const idToken = this.advance();
    let left = this.createNode(AST_NODE_TYPES.IDENTIFIER, { token: idToken, name: idToken.lexeme });

    // Function Call
    if (this.match(TOKEN_TYPES.DEL_LPAREN)) return this.parseFunctionCall(left);

    // List Access
    if (this.match(TOKEN_TYPES.DEL_LBRACK)) {
      const index = this.parseExpression();
      this.consume(TOKEN_TYPES.DEL_RBRACK, "Expected ']'");
      left = this.createNode(AST_NODE_TYPES.LIST_ACCESS, { array: left, index });
    }

    // Assignment Operation
    if (this.match(TOKEN_TYPES.OP_ASSIGN, TOKEN_TYPES.OP_ADD_ASSIGN, TOKEN_TYPES.OP_SUB_ASSIGN,
                   TOKEN_TYPES.OP_MUL_ASSIGN, TOKEN_TYPES.OP_DIV_ASSIGN, TOKEN_TYPES.OP_MOD_ASSIGN)) {
      const opToken = this.previous();
      const assignmentOp = this.createNode(AST_NODE_TYPES.ASSIGNMENT_OP, { token: opToken, operator: opToken.lexeme });
      const value = this.parseExpression();
      return this.createNode(AST_NODE_TYPES.ASSIGNMENT_STMT, { target: left, assignmentOp, value });
    }

    // Fallback to simple expression
    return this.createNode(AST_NODE_TYPES.EXPRESSION, { value: left });
  }

  parseInputStatement() {
    const idToken = this.consume(TOKEN_TYPES.IDENTIFIER);
    const identifier = this.createNode(AST_NODE_TYPES.IDENTIFIER, { token: idToken, name: idToken?.lexeme });

    this.consume(TOKEN_TYPES.OP_ASSIGN, "Expected '='");
    const assignmentOp = this.createNode(AST_NODE_TYPES.ASSIGNMENT_OP, { operator: '=' });

    this.consume(TOKEN_TYPES.KEYWORD_INPUT, "Expected 'input'");
    
    if (this.match(TOKEN_TYPES.DEL_LPAREN)) {
      const typeToken = this.advance();
      if (!isDataType(typeToken.type)) {
        this.addError(`Expected data type in input, got ${typeToken.lexeme}`, typeToken);
      }
      
      const prompt = this.match(TOKEN_TYPES.DEL_COMMA) ? this.parseExpression() : null;
      this.consume(TOKEN_TYPES.DEL_RPAREN, "Expected ')'");

      const inputExpr = this.createNode(AST_NODE_TYPES.INPUT_EXPRESSION, {
        dataType: this.createNode(AST_NODE_TYPES.DATA_TYPE, { token: typeToken, name: typeToken.lexeme }),
        prompt
      });

      return this.createNode(AST_NODE_TYPES.INPUT_STMT, { target: identifier, assignmentOp, expression: inputExpr });
    }
    return null;
  }

  parseOutputStatement() {
    const echoToken = this.advance();
    const arg = this.check(TOKEN_TYPES.STRING_LITERAL) 
      ? this.parseCompositeStringLiteral() 
      : this.parseExpression();

    return this.createNode(AST_NODE_TYPES.OUTPUT_STMT, { keyword: echoToken, args: [arg] });
  }

  // ===========================================================================
  // Control Flow
  // ===========================================================================

  parseIfStatement() {
    const ifToken = this.advance();
    const condition = this.parseExpression();
    
    this.match(TOKEN_TYPES.IDENTIFIER); // Consume optional 'then'

    const thenBody = this.parseStatementList([TOKEN_TYPES.KEYWORD_ELSE]);
    const elseIfs = [];
    let elseBody = null;

    while (this.match(TOKEN_TYPES.KEYWORD_ELSE)) {
      if (this.match(TOKEN_TYPES.KEYWORD_IF)) {
        const elifCondition = this.parseExpression();
        this.match(TOKEN_TYPES.IDENTIFIER); // Optional 'then'
        const elifBody = this.parseStatementList([TOKEN_TYPES.KEYWORD_ELSE]);
        elseIfs.push(this.createNode(AST_NODE_TYPES.ELSE_IF_BLOCK, { condition: elifCondition, body: elifBody }));
      } else {
        elseBody = this.parseStatementList();
        break;
      }
    }

    this.consume(TOKEN_TYPES.KEYWORD_END, "Expected 'end'");
    this.consume(TOKEN_TYPES.KEYWORD_IF, "Expected 'if' after 'end'");

    return this.createNode(AST_NODE_TYPES.IF_STMT, { keyword: ifToken, condition, thenBody, elseIfs, elseBody });
  }

  parseSwitchStatement() {
    const switchToken = this.advance();
    const expression = this.parseExpression();
    const cases = [];
    let defaultBlock = null;

    while (!this.check(TOKEN_TYPES.KEYWORD_END) && !this.isAtEnd()) {
      if (this.match(TOKEN_TYPES.KEYWORD_CASE)) {
        const val = this.parsePrimary();
        const body = this.parseStatementList([TOKEN_TYPES.KEYWORD_CASE, TOKEN_TYPES.KEYWORD_DEFAULT]);
        cases.push(this.createNode(AST_NODE_TYPES.CASE_BLOCK, { value: val, body }));
      } else if (this.match(TOKEN_TYPES.KEYWORD_DEFAULT)) {
        defaultBlock = this.parseStatementList();
      } else {
        break;
      }
    }

    this.consume(TOKEN_TYPES.KEYWORD_END, "Expected 'end'");
    this.consume(TOKEN_TYPES.KEYWORD_SWITCH, "Expected 'switch' after 'end'");

    return this.createNode(AST_NODE_TYPES.SWITCH_STMT, { keyword: switchToken, expression, cases, defaultBlock });
  }

  // ===========================================================================
  // Loops
  // ===========================================================================

  parseForLoop() {
    const forToken = this.advance();
    const idToken = this.consume(TOKEN_TYPES.IDENTIFIER, "Expected loop variable");
    
    this.consume(TOKEN_TYPES.OP_ASSIGN, "Expected '='");
    const start = this.parseExpression();
    
    this.consume(TOKEN_TYPES.NOISE_TO, "Expected 'to'");
    const end = this.parseExpression();
    
    let step = null;
    if (this.match(TOKEN_TYPES.NOISE_BY)) {
      step = this.createNode(AST_NODE_TYPES.STEP_CLAUSE, { value: this.parseExpression() });
    }

    const body = this.parseStatementList();
    this.consume(TOKEN_TYPES.KEYWORD_END, "Expected 'end'");
    this.consume(TOKEN_TYPES.KEYWORD_FOR, "Expected 'for'");

    return this.createNode(AST_NODE_TYPES.FOR_LOOP, {
      keyword: forToken,
      iterator: this.createNode(AST_NODE_TYPES.IDENTIFIER, { token: idToken, name: idToken?.lexeme }),
      start,
      end,
      step,
      body
    });
  }

  parseWhileLoop() {
    const whileToken = this.advance();
    const condition = this.parseExpression();
    const body = this.parseStatementList();
    
    this.consume(TOKEN_TYPES.KEYWORD_END, "Expected 'end'");
    this.consume(TOKEN_TYPES.KEYWORD_WHILE, "Expected 'while'");

    return this.createNode(AST_NODE_TYPES.WHILE_LOOP, { keyword: whileToken, condition, body });
  }

  parseDoWhileLoop() {
    const doToken = this.advance();
    const body = this.parseStatementList([TOKEN_TYPES.KEYWORD_WHILE]);
    
    this.consume(TOKEN_TYPES.KEYWORD_WHILE, "Expected 'while'");
    const condition = this.parseExpression();
    
    this.consume(TOKEN_TYPES.KEYWORD_END, "Expected 'end'");
    this.consume(TOKEN_TYPES.KEYWORD_DO, "Expected 'do'");

    return this.createNode(AST_NODE_TYPES.DO_WHILE_LOOP, { keyword: doToken, body, condition });
  }

  // ===========================================================================
  // Functions & Structures
  // ===========================================================================

  parseFunctionDef() {
    const funcToken = this.advance();
    
    let returnType = null;
    if (isDataType(this.peek()?.type)) {
      const typeToken = this.advance();
      returnType = this.createNode(AST_NODE_TYPES.RETURN_TYPE, { token: typeToken, name: typeToken.lexeme });
    }

    const nameToken = this.consume(TOKEN_TYPES.IDENTIFIER, "Expected function name");
    this.consume(TOKEN_TYPES.DEL_LPAREN, "Expected '('");
    
    const params = [];
    if (!this.check(TOKEN_TYPES.DEL_RPAREN)) {
      do {
        const pType = this.advance();
        if (!isDataType(pType.type)) {
            this.addError("Expected parameter type", pType);
        }
        const pName = this.consume(TOKEN_TYPES.IDENTIFIER, "Expected parameter name");
        params.push(this.createNode(AST_NODE_TYPES.PARAM, {
          dataType: this.createNode(AST_NODE_TYPES.DATA_TYPE, { token: pType, name: pType.lexeme }),
          name: this.createNode(AST_NODE_TYPES.IDENTIFIER, { token: pName, name: pName?.lexeme })
        }));
      } while (this.match(TOKEN_TYPES.DEL_COMMA));
    }
    this.consume(TOKEN_TYPES.DEL_RPAREN, "Expected ')'");

    const body = this.parseStatementList([TOKEN_TYPES.RESERVED_RETURN]);
    
    let returnStatement = null;
    if (this.check(TOKEN_TYPES.RESERVED_RETURN)) {
      returnStatement = this.parseReturnStatement();
    } else if (returnType) {
      this.addError(`Function '${nameToken?.lexeme}' declared with return type must return a value.`, funcToken);
    }

    this.consume(TOKEN_TYPES.KEYWORD_END, "Expected 'end'");
    this.consume(TOKEN_TYPES.KEYWORD_FUNCTION, "Expected 'function'");

    return this.createNode(AST_NODE_TYPES.FUNCTION_DEF, {
      keyword: funcToken,
      returnType,
      name: this.createNode(AST_NODE_TYPES.IDENTIFIER, { token: nameToken, name: nameToken?.lexeme }),
      parameters: this.createNode(AST_NODE_TYPES.PARAM_LIST, { params }),
      body,
      returnStatement
    });
  }

  parseReturnStatement() {
    const retToken = this.advance();
    const value = this.parseExpression();
    return this.createNode(AST_NODE_TYPES.RETURN_STMT, { keyword: retToken, value });
  }

  parseDataStruct() {
    const dataToken = this.advance();
    this.consume(TOKEN_TYPES.RESERVED_STRUCT, "Expected 'struct'");
    
    const nameToken = this.consume(TOKEN_TYPES.IDENTIFIER, "Expected struct name");
    this.consume(TOKEN_TYPES.DEL_LBRACE, "Expected '{'");

    const fields = [];
    while (!this.check(TOKEN_TYPES.DEL_RBRACE) && !this.isAtEnd()) {
      const field = this.parseFieldDeclaration();
      if (field) fields.push(field);
      this.match(TOKEN_TYPES.DEL_COMMA); 
    }
    this.consume(TOKEN_TYPES.DEL_RBRACE, "Expected '}'");

    return this.createNode(AST_NODE_TYPES.DATA_STRUCT, {
      keyword: dataToken,
      name: this.createNode(AST_NODE_TYPES.IDENTIFIER, { token: nameToken, name: nameToken?.lexeme }),
      fields: this.createNode(AST_NODE_TYPES.FIELD_LIST, { fields })
    });
  }

  parseFieldDeclaration() {
    // Lookahead for Schema Binding: identifier : data_type
    if (this.check(TOKEN_TYPES.IDENTIFIER) && this.peek(1)?.type === TOKEN_TYPES.DEL_COLON) {
      return this.parseSchemaBinding();
    }

    const typeToken = this.advance();
    if (!isDataType(typeToken.type)) {
      this.addError(`Expected field type, found ${typeToken.lexeme}`, typeToken);
      return null;
    }
    
    const idToken = this.consume(TOKEN_TYPES.IDENTIFIER, "Expected field identifier");
    const defaultValue = this.match(TOKEN_TYPES.OP_ASSIGN) ? this.parseExpression() : null;

    return this.createNode(AST_NODE_TYPES.FIELD_DECL, {
      dataType: this.createNode(AST_NODE_TYPES.DATA_TYPE, { token: typeToken, name: typeToken.lexeme }),
      identifier: this.createNode(AST_NODE_TYPES.IDENTIFIER, { token: idToken, name: idToken?.lexeme }),
      defaultValue
    });
  }

  parseSchemaBinding() {
    const idToken = this.advance();
    this.consume(TOKEN_TYPES.DEL_COLON, "Expected ':'");
    
    const typeToken = this.advance();
    let bindingClause = null;

    if (this.match(TOKEN_TYPES.DEL_LPAREN)) {
      const bindId = this.consume(TOKEN_TYPES.IDENTIFIER, "Expected binding identifier");
      this.consume(TOKEN_TYPES.DEL_RPAREN, "Expected ')'");
      if (bindId) {
        bindingClause = this.createNode(AST_NODE_TYPES.BINDING_CLAUSE, { value: bindId.lexeme });
      }
    }

    return this.createNode(AST_NODE_TYPES.SCHEMA_BINDING, {
      identifier: this.createNode(AST_NODE_TYPES.IDENTIFIER, { token: idToken, name: idToken.lexeme }),
      dataType: this.createNode(AST_NODE_TYPES.DATA_TYPE, { token: typeToken, name: typeToken.lexeme }),
      bindingClause
    });
  }

  // ===========================================================================
  // Expressions (Precedence Climbing)
  // ===========================================================================

  parseExpression() {
    return this.parseLogicOr();
  }

  parseLogicOr() {
    let left = this.parseLogicAnd();
    while (this.match(TOKEN_TYPES.OP_OR)) {
      left = this.createNode(AST_NODE_TYPES.LOGIC_OR, { left, operator: this.previous().lexeme, right: this.parseLogicAnd() });
    }
    return left;
  }

  parseLogicAnd() {
    let left = this.parseEquality();
    while (this.match(TOKEN_TYPES.OP_AND)) {
      left = this.createNode(AST_NODE_TYPES.LOGIC_AND, { left, operator: this.previous().lexeme, right: this.parseEquality() });
    }
    return left;
  }

  parseEquality() {
    let left = this.parseRelational();
    while (this.match(TOKEN_TYPES.OP_EQ, TOKEN_TYPES.OP_NEQ)) {
      left = this.createNode(AST_NODE_TYPES.EQUALITY, { left, operator: this.previous().lexeme, right: this.parseRelational() });
    }
    return left;
  }

  parseRelational() {
    let left = this.parseAdditive();
    while (this.match(TOKEN_TYPES.OP_LT, TOKEN_TYPES.OP_GT, TOKEN_TYPES.OP_LTE, TOKEN_TYPES.OP_GTE)) {
      left = this.createNode(AST_NODE_TYPES.RELATIONAL, { left, operator: this.previous().lexeme, right: this.parseAdditive() });
    }
    return left;
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.match(TOKEN_TYPES.OP_ADD, TOKEN_TYPES.OP_SUB)) {
      left = this.createNode(AST_NODE_TYPES.ADDITIVE, { left, operator: this.previous().lexeme, right: this.parseMultiplicative() });
    }
    return left;
  }

  parseMultiplicative() {
    let left = this.parseExponential();
    while (this.match(TOKEN_TYPES.OP_MUL, TOKEN_TYPES.OP_DIV, TOKEN_TYPES.OP_INT_DIV, TOKEN_TYPES.OP_MOD)) {
      left = this.createNode(AST_NODE_TYPES.MULTIPLICATIVE, { left, operator: this.previous().lexeme, right: this.parseExponential() });
    }
    return left;
  }

  parseExponential() {
    let left = this.parseUnary();
    while (this.match(TOKEN_TYPES.OP_EXP)) {
      left = this.createNode(AST_NODE_TYPES.EXPONENTIAL, { left, operator: this.previous().lexeme, right: this.parseUnary() });
    }
    return left;
  }

  parseUnary() {
    if (this.match(TOKEN_TYPES.OP_NOT, TOKEN_TYPES.OP_ADD, TOKEN_TYPES.OP_SUB, TOKEN_TYPES.OP_INC, TOKEN_TYPES.OP_DEC)) {
      return this.createNode(AST_NODE_TYPES.UNARY, { operator: this.previous().lexeme, expression: this.parseUnary() });
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(TOKEN_TYPES.DEL_LBRACK)) {
        const index = this.parseExpression();
        this.consume(TOKEN_TYPES.DEL_RBRACK, "Expected ']'");
        expr = this.createNode(AST_NODE_TYPES.LIST_ACCESS, { array: expr, index });
      } else if (this.match(TOKEN_TYPES.DEL_PERIOD)) {
        const fieldToken = this.consume(TOKEN_TYPES.IDENTIFIER, "Expected field name");
        expr = this.createNode(AST_NODE_TYPES.FIELD_ACCESS, { 
          object: expr, 
          field: this.createNode(AST_NODE_TYPES.IDENTIFIER, { token: fieldToken, name: fieldToken?.lexeme })
        });
      } else if (this.match(TOKEN_TYPES.DEL_LPAREN)) {
        expr = this.parseFunctionCall(expr);
      } else {
        break;
      }
    }
    return expr;
  }

  parsePrimary() {
    if (this.match(TOKEN_TYPES.NUMBER_LITERAL)) {
      return this.createNode(AST_NODE_TYPES.NUMBER_LIT, { token: this.previous(), value: parseFloat(this.previous().lexeme) });
    }
    if (this.match(TOKEN_TYPES.DECIMAL_LITERAL)) {
      return this.createNode(AST_NODE_TYPES.DECIMAL_LIT, { token: this.previous(), value: parseFloat(this.previous().lexeme) });
    }
    if (this.check(TOKEN_TYPES.STRING_LITERAL) || this.check(TOKEN_TYPES.SIS_MARKER)) {
      return this.parseCompositeStringLiteral();
    }
    if (this.match(TOKEN_TYPES.RESERVED_TRUE)) return this.createNode(AST_NODE_TYPES.BOOL_LIT, { value: true });
    if (this.match(TOKEN_TYPES.RESERVED_FALSE)) return this.createNode(AST_NODE_TYPES.BOOL_LIT, { value: false });
    if (this.match(TOKEN_TYPES.RESERVED_NULL)) return this.createNode(AST_NODE_TYPES.NULL_LITERAL, { value: null });
    
    if (this.check(TOKEN_TYPES.DEL_LBRACK)) return this.parseListLiteral();
    
    if (this.match(TOKEN_TYPES.IDENTIFIER)) {
      return this.createNode(AST_NODE_TYPES.IDENTIFIER, { token: this.previous(), name: this.previous().lexeme });
    }
    
    if (this.match(TOKEN_TYPES.DEL_LPAREN)) {
      const expr = this.parseExpression();
      this.consume(TOKEN_TYPES.DEL_RPAREN, "Expected ')'");
      return expr;
    }

    const token = this.peek();
    this.addError(`Unexpected token in expression: ${token?.lexeme}`, token);
    this.advance(); // Recovery
    return null;
  }

  parseCompositeStringLiteral() {
    const parts = [];
    const firstToken = this.peek();
    let fullContent = '';

    while (!this.isAtEnd()) {
      if (this.match(TOKEN_TYPES.STRING_LITERAL)) {
        const content = this.previous().lexeme.slice(1, -1);
        fullContent += content;
        parts.push(this.createNode(AST_NODE_TYPES.STRING_CONTENT, { value: content }));
      } else if (this.match(TOKEN_TYPES.SIS_MARKER)) {
        const token = this.previous();
        fullContent += token.lexeme;
        const ident = token.lexeme.startsWith('@') ? token.lexeme.substring(1) : token.lexeme;
        parts.push(this.createNode(AST_NODE_TYPES.STRING_INSERTION, {
          identifier: this.createNode(AST_NODE_TYPES.IDENTIFIER, { name: ident })
        }));
      } else {
        break;
      }
    }
    
    return this.createNode(AST_NODE_TYPES.STRING_LIT, {
      token: firstToken,
      content: parts.length > 0 ? parts : [this.createNode(AST_NODE_TYPES.STRING_CONTENT, { value: fullContent })]
    });
  }

  parseListLiteral() {
    const token = this.consume(TOKEN_TYPES.DEL_LBRACK);
    const elements = [];
    if (!this.check(TOKEN_TYPES.DEL_RBRACK)) {
      do {
        elements.push(this.parseExpression());
      } while (this.match(TOKEN_TYPES.DEL_COMMA));
    }
    this.consume(TOKEN_TYPES.DEL_RBRACK, "Expected ']'");
    
    return this.createNode(AST_NODE_TYPES.LIST_LIT, {
      token,
      elements: this.createNode(AST_NODE_TYPES.ARRAY_ELEMENTS, { elements })
    });
  }

  parseFunctionCall(callee) {
    const args = [];
    if (!this.check(TOKEN_TYPES.DEL_RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TOKEN_TYPES.DEL_COMMA));
    }
    this.consume(TOKEN_TYPES.DEL_RPAREN, "Expected ')'");
    
    return this.createNode(AST_NODE_TYPES.FUNCTION_CALL, {
      function: callee,
      arguments: this.createNode(AST_NODE_TYPES.ARG_LIST, { args })
    });
  }

  parseBuiltinFunctionCall() {
    const token = this.advance();
    this.consume(TOKEN_TYPES.DEL_LPAREN, "Expected '('");
    const args = [];
    if (!this.check(TOKEN_TYPES.DEL_RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TOKEN_TYPES.DEL_COMMA));
    }
    this.consume(TOKEN_TYPES.DEL_RPAREN, "Expected ')'");
    
    return this.createNode(AST_NODE_TYPES.BUILTIN_FUNCTION_CALL, {
      builtin: this.createNode(AST_NODE_TYPES.BUILTIN_NAME, { token, name: token.lexeme }),
      arguments: this.createNode(AST_NODE_TYPES.ARG_LIST, { args })
    });
  }
}

// --- Main Export ---

// Public interface for AST generation.
export const buildAST = (tokens) => {
  const parser = new ASTParser(tokens);
  const ast = parser.parse();
  
  return {
    ast: parser.errors.length > 0 ? null : ast,
    errors: parser.errors.length > 0 ? parser.errors : undefined,
    success: parser.errors.length === 0
  };
};