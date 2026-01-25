/*
Abstract Syntax Tree Builder – ECHO Language Parser

Recursive descent parser that builds AST structures from token streams following ECHO formal grammar.
Depends on TokenTypes module.
*/

import { TOKEN_TYPES, isDataType } from '../../../shared/tokenTypes.js';

/* AST Node Types

Mapped to non-terminal symbols in ECHO formal grammar.
*/
export const AST_NODE_TYPES = {
  // [B] Program Structure
  ECHO_PROGRAM: 'ECHO_PROGRAM',
  STMT_LIST: 'STMT_LIST',
  
  // [D] Declarations
  DECLARATION_STMT: 'DECLARATION_STMT',
  DECL_LIST: 'DECL_LIST',
  DECL_ITEM: 'DECL_ITEM',
  DATA_TYPE: 'DATA_TYPE',
  
  // [F] Input & [G] Output & [E] Assignment
  INPUT_STMT: 'INPUT_STMT',
  OUTPUT_STMT: 'OUTPUT_STMT',
  ASSIGNMENT_STMT: 'ASSIGNMENT_STMT',
  ASSIGNMENT_OP: 'ASSIGNMENT_OP',
  INPUT_EXPRESSION: 'INPUT_EXPRESSION',
  
  // [H] Control Flow
  IF_STMT: 'IF_STMT',
  IF_ELSE_STMT: 'IF_ELSE_STMT',           // Semantic grouping
  IF_ELSEIF_ELSE_STMT: 'IF_ELSEIF_ELSE_STMT', // Semantic grouping
  ELSE_IF_BLOCK: 'ELSE_IF_BLOCK',
  ELSE_BLOCK: 'ELSE_BLOCK',
  SWITCH_STMT: 'SWITCH_STMT',
  CASE_BLOCK: 'CASE_BLOCK',
  DEFAULT_BLOCK: 'DEFAULT_BLOCK',
  JUMP_STMT: 'JUMP_STMT',
  
  // [I] Loops
  FOR_LOOP: 'FOR_LOOP',
  WHILE_LOOP: 'WHILE_LOOP',
  DO_WHILE_LOOP: 'DO_WHILE_LOOP',
  STEP_CLAUSE: 'STEP_CLAUSE',
  
  // [J] Functions
  FUNCTION_DEF: 'FUNCTION_DEF',
  PARAM_LIST: 'PARAM_LIST',
  PARAM: 'PARAM',
  RETURN_STMT: 'RETURN_STMT',
  FUNCTION_CALL: 'FUNCTION_CALL',
  ARG_LIST: 'ARG_LIST',
  RETURN_TYPE: 'RETURN_TYPE',
  
  // [N] Built-in Functions
  BUILTIN_FUNCTION_CALL: 'BUILTIN_FUNCTION_CALL',
  BUILTIN_NAME: 'BUILTIN_NAME',
  
  // [C] Expressions
  EXPRESSION: 'EXPRESSION', // Generic wrapper if needed
  LOGIC_OR: 'LOGIC_OR',
  LOGIC_AND: 'LOGIC_AND',
  EQUALITY: 'EQUALITY',
  RELATIONAL: 'RELATIONAL',
  ADDITIVE: 'ADDITIVE',
  MULTIPLICATIVE: 'MULTIPLICATIVE',
  EXPONENTIAL: 'EXPONENTIAL',
  UNARY: 'UNARY',
  
  // [A] Lexical & [L, M] Operations
  IDENTIFIER: 'IDENTIFIER',
  LITERAL: 'LITERAL',
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
  OPERATOR: 'OPERATOR',
  
  // [K] Data Structures
  DATA_STRUCT: 'DATA_STRUCT',
  FIELD_LIST: 'FIELD_LIST',
  FIELD_DECL: 'FIELD_DECL',
  SCHEMA_BINDING: 'SCHEMA_BINDING',
  BINDING_CLAUSE: 'BINDING_CLAUSE',
  FIELD_ACCESS: 'FIELD_ACCESS', // Access via dot notation
};

/*
Create AST node with type and properties

@param {String} type - Node type from AST_NODE_TYPES
@param {Object} props - Additional node properties
@returns {Object} AST node object
*/
const createNode = (type, props = {}) => ({
  type,
  ...props,
  children: props.children || [],
});

/*
Build Abstract Syntax Tree from tokens

@param {Array} tokens - Array of tokens from the lexer
@returns {Object} Object containing ast, errors, and success flag
*/
export const buildAST = (tokens) => {
  if (!tokens || tokens.length === 0) {
    return { ast: null, errors: [{ message: "No tokens provided", line: 0, column: 0 }], success: false };
  }

  let current = 0;
  const errors = [];

  // Parser primitives
  const isAtEnd = () => current >= tokens.length;
  const peek = (offset = 0) => (current + offset >= tokens.length ? null : tokens[current + offset]);
  const previous = () => (current > 0 ? tokens[current - 1] : null);

  const advance = () => {
    if (!isAtEnd()) current++;
    return previous();
  };

  const check = (type) => {
    if (isAtEnd()) return false;
    return peek().type === type;
  };

  const match = (...types) => {
    for (const type of types) {
      if (check(type)) {
        advance();
        return true;
      }
    }
    return false;
  };

  const consume = (type, message) => {
    if (check(type)) return advance();
    
    const token = peek() || previous();
    errors.push({
      line: token?.line || 0,
      column: token?.column || 0,
      message: message || `Expected token type ${type}, got ${token?.type || 'EOF'}`
    });
    return null;
  };

  // --- Grammar Productions ---

  // [B] <ECHO_program> => "start" <statement_list> "end"
  const parseProgram = () => {
    const startToken = consume(TOKEN_TYPES.KEYWORD_START, 'Program must begin with "start"');
    if (!startToken && errors.length > 0) return null; // Critical failure

    const statements = parseStatementList();

    const endToken = consume(TOKEN_TYPES.KEYWORD_END, 'Program must end with "end"');

    return createNode(AST_NODE_TYPES.ECHO_PROGRAM, {
      startToken,
      statements,
      endToken,
      errors: errors.length > 0 ? errors : undefined
    });
  };

  // [B] <statement_list> => { <statement> }
  const parseStatementList = (stopConditions = []) => {
    const statements = [];
    
    while (!isAtEnd()) {
      // Check stop conditions (e.g., 'end', 'else', 'case', 'default')
      if (check(TOKEN_TYPES.KEYWORD_END)) break;
      if (stopConditions.some(cond => check(cond))) break;

      const stmt = parseStatement();
      if (stmt) {
        statements.push(stmt);
      } else {
        // Synchronization / Panic Mode
        // If we fail to parse a statement but haven't hit a stop condition, 
        // advance to avoid infinite loops.
        if (!isAtEnd()) advance();
      }
    }
    return createNode(AST_NODE_TYPES.STMT_LIST, { statements });
  };

  // [B] <statement> Router
  const parseStatement = () => {
    // Skip Noise Words [A]
    while (match(TOKEN_TYPES.NOISE_WITH, TOKEN_TYPES.NOISE_TO, TOKEN_TYPES.NOISE_BY));

    const token = peek();
    if (!token) return null;

    // 1. Declarations [D]
    if (isDataType(token.type)) return parseDeclaration();

    // 2. Output [G]
    if (token.type === TOKEN_TYPES.KEYWORD_ECHO) return parseOutputStatement();

    // 3. Input [F] (Lookahead: ID = input)
    if (token.type === TOKEN_TYPES.IDENTIFIER) {
      const next = peek(1);
      const nextNext = peek(2);
      if (next?.type === TOKEN_TYPES.OP_ASSIGN && nextNext?.type === TOKEN_TYPES.KEYWORD_INPUT) {
        return parseInputStatement();
      }
    }

    // 4. Control Flow [H]
    if (token.type === TOKEN_TYPES.KEYWORD_IF) return parseIfStatement();
    if (token.type === TOKEN_TYPES.KEYWORD_SWITCH) return parseSwitchStatement();

    // 5. Loops [I]
    if (token.type === TOKEN_TYPES.KEYWORD_FOR) return parseForLoop();
    if (token.type === TOKEN_TYPES.KEYWORD_WHILE) return parseWhileLoop();
    if (token.type === TOKEN_TYPES.KEYWORD_DO) return parseDoWhileLoop();

    // 6. Functions [J]
    if (token.type === TOKEN_TYPES.KEYWORD_FUNCTION) return parseFunctionDef();
    if (token.type === TOKEN_TYPES.RESERVED_RETURN) return parseReturnStatement();

    // 7. Data Structures [K]
    if (token.type === TOKEN_TYPES.RESERVED_DATA) return parseDataStruct();

    // 8. Jumps [I]
    if (token.type === TOKEN_TYPES.RESERVED_BREAK || token.type === TOKEN_TYPES.RESERVED_CONTINUE) {
      return parseJumpStatement();
    }

    // 9. Built-in Calls [N]
    if ([TOKEN_TYPES.BUILTIN_SUM, TOKEN_TYPES.BUILTIN_MEDIAN, TOKEN_TYPES.BUILTIN_MODE, 
         TOKEN_TYPES.BUILTIN_AVERAGE, TOKEN_TYPES.BUILTIN_ISEVEN, TOKEN_TYPES.BUILTIN_ISODD].includes(token.type)) {
      return parseBuiltinFunctionCall();
    }

    // 10. Assignment [E] or Expression Statement
    if (token.type === TOKEN_TYPES.IDENTIFIER) return parseAssignmentOrCall();

    return null;
  };

  // [D] <declaration_stmt> => <data_type> <decl_list>
  const parseDeclaration = () => {
    const typeToken = advance(); // Consume type
    const dataType = createNode(AST_NODE_TYPES.DATA_TYPE, { token: typeToken, name: typeToken.lexeme });
    
    const items = [];
    do {
      items.push(parseDeclarationItem());
    } while (match(TOKEN_TYPES.DEL_COMMA));

    return createNode(AST_NODE_TYPES.DECLARATION_STMT, {
      dataType,
      declList: createNode(AST_NODE_TYPES.DECL_LIST, { items })
    });
  };

  // [D] <decl_item>
  const parseDeclarationItem = () => {
    const idToken = consume(TOKEN_TYPES.IDENTIFIER, "Expected identifier");
    if (!idToken) return null;

    const identifier = createNode(AST_NODE_TYPES.IDENTIFIER, { token: idToken, name: idToken.lexeme });

    // Array Decl: id[10]
    if (match(TOKEN_TYPES.DEL_LBRACK)) {
      const sizeToken = consume(TOKEN_TYPES.NUMBER_LITERAL, "Expected array size");
      consume(TOKEN_TYPES.DEL_RBRACK, "Expected ']'");
      return createNode(AST_NODE_TYPES.DECL_ITEM, {
        identifier,
        isArray: true,
        size: sizeToken ? createNode(AST_NODE_TYPES.NUMBER_LIT, { token: sizeToken, value: parseFloat(sizeToken.lexeme) }) : null
      });
    }

    // Assignment: id = expr | id = list_lit
    if (match(TOKEN_TYPES.OP_ASSIGN)) {
      const assignmentOp = createNode(AST_NODE_TYPES.ASSIGNMENT_OP, { value: '=' });
      // Check for List Literal [L]
      if (check(TOKEN_TYPES.DEL_LBRACK)) {
         return createNode(AST_NODE_TYPES.DECL_ITEM, { identifier, assignmentOp, value: parseListLiteral() });
      }
      const expression = parseExpression();
      return createNode(AST_NODE_TYPES.DECL_ITEM, { identifier, assignmentOp, value: expression });
    }

    return createNode(AST_NODE_TYPES.DECL_ITEM, { identifier });
  };

  // [E] <assignment_stmt>
  const parseAssignmentOrCall = () => {
    const idToken = advance();
    let left = createNode(AST_NODE_TYPES.IDENTIFIER, { token: idToken, name: idToken.lexeme });

    // Function Call [J]
    if (match(TOKEN_TYPES.DEL_LPAREN)) return parseFunctionCall(left);

    // List Access [L]
    if (match(TOKEN_TYPES.DEL_LBRACK)) {
      const index = parseExpression();
      consume(TOKEN_TYPES.DEL_RBRACK, "Expected ']'");
      left = createNode(AST_NODE_TYPES.LIST_ACCESS, { array: left, index });
    }

    // Assignment
    if (match(TOKEN_TYPES.OP_ASSIGN, TOKEN_TYPES.OP_ADD_ASSIGN, TOKEN_TYPES.OP_SUB_ASSIGN, 
              TOKEN_TYPES.OP_MUL_ASSIGN, TOKEN_TYPES.OP_DIV_ASSIGN, TOKEN_TYPES.OP_MOD_ASSIGN)) {
      const opToken = previous();
      const assignmentOp = createNode(AST_NODE_TYPES.ASSIGNMENT_OP, { token: opToken, operator: opToken.lexeme });
      const value = parseExpression();
      return createNode(AST_NODE_TYPES.ASSIGNMENT_STMT, { target: left, assignmentOp, value });
    }

    // Fallback: Expression Statement
    return createNode(AST_NODE_TYPES.EXPRESSION, { value: left });
  };

  // [F] <input_stmt>
  const parseInputStatement = () => {
    const idToken = consume(TOKEN_TYPES.IDENTIFIER);
    const identifier = createNode(AST_NODE_TYPES.IDENTIFIER, { token: idToken, name: idToken?.lexeme });

    const opToken = consume(TOKEN_TYPES.OP_ASSIGN, "Expected '='");
    const assignmentOp = createNode(AST_NODE_TYPES.ASSIGNMENT_OP, { token: opToken, operator: '=' });

    consume(TOKEN_TYPES.KEYWORD_INPUT, "Expected 'input'");
    
    // <input_expression>
    if (match(TOKEN_TYPES.DEL_LPAREN)) {
      const typeToken = advance(); // Consume type
      if (!isDataType(typeToken.type)) {
        errors.push({ message: `Expected data type in input, got ${typeToken.lexeme}`, line: typeToken.line, column: typeToken.column });
      }
      
      let prompt = null;
      if (match(TOKEN_TYPES.DEL_COMMA)) {
        prompt = parseExpression();
      }
      consume(TOKEN_TYPES.DEL_RPAREN, "Expected ')'");

      const inputExpr = createNode(AST_NODE_TYPES.INPUT_EXPRESSION, {
        dataType: createNode(AST_NODE_TYPES.DATA_TYPE, { token: typeToken, name: typeToken.lexeme }),
        prompt
      });

      return createNode(AST_NODE_TYPES.INPUT_STMT, { target: identifier, assignmentOp, expression: inputExpr });
    }
    return null;
  };

  // [G] <output_stmt>
  const parseOutputStatement = () => {
    const echoToken = advance();
    let arg = null;
    
    // Check for String Literal (SIS) [M]
    if (check(TOKEN_TYPES.STRING_LITERAL)) {
      arg = parseCompositeStringLiteral();
    } else {
      arg = parseExpression();
    }

    return createNode(AST_NODE_TYPES.OUTPUT_STMT, { keyword: echoToken, args: [arg] });
  };

  // [H] <conditional_stmt>
  const parseIfStatement = () => {
    const ifToken = advance(); // consume if
    const condition = parseExpression();
    
    // Optional 'then' support
    match(TOKEN_TYPES.IDENTIFIER); // Consume 'then' if present (lexer might need adjustment or just consume ID 'then')

    const thenBody = parseStatementList([TOKEN_TYPES.KEYWORD_ELSE]);
    const elseIfs = [];
    let elseBody = null;

    // Handle 'else'
    while (match(TOKEN_TYPES.KEYWORD_ELSE)) {
      // Check for 'if' (Else If)
      if (match(TOKEN_TYPES.KEYWORD_IF)) {
        const elifCondition = parseExpression();
        match(TOKEN_TYPES.IDENTIFIER); // Optional 'then'
        const elifBody = parseStatementList([TOKEN_TYPES.KEYWORD_ELSE]);
        elseIfs.push(createNode(AST_NODE_TYPES.ELSE_IF_BLOCK, { condition: elifCondition, body: elifBody }));
      } else {
        // Pure Else
        elseBody = parseStatementList();
        break; // Else is final
      }
    }

    consume(TOKEN_TYPES.KEYWORD_END, "Expected 'end'");
    consume(TOKEN_TYPES.KEYWORD_IF, "Expected 'if' after 'end'");

    return createNode(AST_NODE_TYPES.IF_STMT, { keyword: ifToken, condition, thenBody, elseIfs, elseBody });
  };

  // [H] <switch_stmt>
  const parseSwitchStatement = () => {
    const switchToken = advance();
    const expression = parseExpression();
    const cases = [];
    let defaultBlock = null;

    while (!check(TOKEN_TYPES.KEYWORD_END) && !isAtEnd()) {
      if (match(TOKEN_TYPES.KEYWORD_CASE)) {
        const val = parsePrimary();
        const body = parseStatementList([TOKEN_TYPES.KEYWORD_CASE, TOKEN_TYPES.KEYWORD_DEFAULT]);
        cases.push(createNode(AST_NODE_TYPES.CASE_BLOCK, { value: val, body }));
      } else if (match(TOKEN_TYPES.KEYWORD_DEFAULT)) {
        defaultBlock = parseStatementList();
      } else {
        break;
      }
    }

    consume(TOKEN_TYPES.KEYWORD_END, "Expected 'end'");
    consume(TOKEN_TYPES.KEYWORD_SWITCH, "Expected 'switch' after 'end'");

    return createNode(AST_NODE_TYPES.SWITCH_STMT, { keyword: switchToken, expression, cases, defaultBlock });
  };

  // [I] <loop_stmt>
  const parseForLoop = () => {
    const forToken = advance();
    const idToken = consume(TOKEN_TYPES.IDENTIFIER, "Expected loop variable");
    consume(TOKEN_TYPES.OP_ASSIGN, "Expected '='");
    const start = parseExpression();
    consume(TOKEN_TYPES.NOISE_TO, "Expected 'to'");
    const end = parseExpression();
    
    let step = null;
    if (match(TOKEN_TYPES.NOISE_BY)) {
      step = createNode(AST_NODE_TYPES.STEP_CLAUSE, { value: parseExpression() });
    }

    const body = parseStatementList();
    consume(TOKEN_TYPES.KEYWORD_END, "Expected 'end'");
    consume(TOKEN_TYPES.KEYWORD_FOR, "Expected 'for'");

    return createNode(AST_NODE_TYPES.FOR_LOOP, {
      keyword: forToken,
      iterator: createNode(AST_NODE_TYPES.IDENTIFIER, { token: idToken, name: idToken?.lexeme }),
      start,
      end,
      step,
      body
    });
  };

  const parseWhileLoop = () => {
    const whileToken = advance();
    const condition = parseExpression();
    const body = parseStatementList();
    consume(TOKEN_TYPES.KEYWORD_END, "Expected 'end'");
    consume(TOKEN_TYPES.KEYWORD_WHILE, "Expected 'while'");

    return createNode(AST_NODE_TYPES.WHILE_LOOP, { keyword: whileToken, condition, body });
  };

  const parseDoWhileLoop = () => {
    const doToken = advance();
    const body = parseStatementList([TOKEN_TYPES.KEYWORD_WHILE]);
    consume(TOKEN_TYPES.KEYWORD_WHILE, "Expected 'while'");
    const condition = parseExpression();
    consume(TOKEN_TYPES.KEYWORD_END, "Expected 'end'");
    consume(TOKEN_TYPES.KEYWORD_DO, "Expected 'do'");

    return createNode(AST_NODE_TYPES.DO_WHILE_LOOP, { keyword: doToken, body, condition });
  };

  // [J] <function_def>
  const parseFunctionDef = () => {
    const funcToken = advance();
    
    // Check for Return Type (implies strict return)
    let returnType = null;
    if (isDataType(peek()?.type)) {
      const typeToken = advance();
      returnType = createNode(AST_NODE_TYPES.RETURN_TYPE, { token: typeToken, name: typeToken.lexeme });
    }

    const nameToken = consume(TOKEN_TYPES.IDENTIFIER, "Expected function name");
    consume(TOKEN_TYPES.DEL_LPAREN, "Expected '('");
    
    const params = [];
    if (!check(TOKEN_TYPES.DEL_RPAREN)) {
      do {
        const pType = advance(); // Validated as Type by grammar expectation? Or check?
        if (!isDataType(pType.type)) errors.push({ message: "Expected parameter type", line: pType.line, column: pType.column });
        const pName = consume(TOKEN_TYPES.IDENTIFIER, "Expected parameter name");
        params.push(createNode(AST_NODE_TYPES.PARAM, {
          dataType: createNode(AST_NODE_TYPES.DATA_TYPE, { token: pType, name: pType.lexeme }),
          name: createNode(AST_NODE_TYPES.IDENTIFIER, { token: pName, name: pName?.lexeme })
        }));
      } while (match(TOKEN_TYPES.DEL_COMMA));
    }
    consume(TOKEN_TYPES.DEL_RPAREN, "Expected ')'");

    // Body & Return strictness
    const body = parseStatementList([TOKEN_TYPES.RESERVED_RETURN]);
    
    let returnStmt = null;
    if (returnType) {
      // Must have return
      if (check(TOKEN_TYPES.RESERVED_RETURN)) {
        returnStmt = parseReturnStatement();
      } else {
        errors.push({ 
          message: `Function '${nameToken?.lexeme}' with return type '${returnType.name}' must have a return statement.`,
          line: funcToken.line, column: funcToken.column 
        });
      }
    } else {
      // Void, optional return
      if (check(TOKEN_TYPES.RESERVED_RETURN)) {
        returnStmt = parseReturnStatement();
      }
    }

    consume(TOKEN_TYPES.KEYWORD_END, "Expected 'end'");
    consume(TOKEN_TYPES.KEYWORD_FUNCTION, "Expected 'function'");

    return createNode(AST_NODE_TYPES.FUNCTION_DEF, {
      keyword: funcToken,
      returnType,
      name: createNode(AST_NODE_TYPES.IDENTIFIER, { token: nameToken, name: nameToken?.lexeme }),
      parameters: createNode(AST_NODE_TYPES.PARAM_LIST, { params }),
      body,
      returnStatement: returnStmt
    });
  };

  const parseReturnStatement = () => {
    const retToken = advance();
    const value = parseExpression();
    return createNode(AST_NODE_TYPES.RETURN_STMT, { keyword: retToken, value });
  };

  // [K] <data_struct>
  const parseDataStruct = () => {
    const dataToken = advance();
    consume(TOKEN_TYPES.RESERVED_STRUCT, "Expected 'struct'");
    const nameToken = consume(TOKEN_TYPES.IDENTIFIER, "Expected struct name");
    consume(TOKEN_TYPES.DEL_LBRACE, "Expected '{'");

    const fields = [];
    while (!check(TOKEN_TYPES.DEL_RBRACE) && !isAtEnd()) {
      fields.push(parseFieldDeclaration());
      match(TOKEN_TYPES.DEL_COMMA); // Optional comma handling
    }
    consume(TOKEN_TYPES.DEL_RBRACE, "Expected '}'");

    return createNode(AST_NODE_TYPES.DATA_STRUCT, {
      keyword: dataToken,
      name: createNode(AST_NODE_TYPES.IDENTIFIER, { token: nameToken, name: nameToken?.lexeme }),
      fields: createNode(AST_NODE_TYPES.FIELD_LIST, { fields })
    });
  };

  // [K] <field_decl> & <schema_binding>
  const parseFieldDeclaration = () => {
    // Lookahead for Schema Binding: <identifier> ":" <data_type>
    // FIX: Ensure we check for DEL_COLON specifically
    if (check(TOKEN_TYPES.IDENTIFIER) && peek(1)?.type === TOKEN_TYPES.DEL_COLON) {
      return parseSchemaBinding();
    }

    // Standard Field: <data_type> <identifier> [ = <expr> ]
    const typeToken = advance();
    if (!isDataType(typeToken.type)) {
      // If we are here, it's not a schema binding and not a valid type -> Error
      errors.push({ message: `Expected field type or schema binding, found ${typeToken.lexeme}`, line: typeToken.line, column: typeToken.column });
      // Synchronization: consume until next likely field start or brace
      return null; 
    }
    
    const idToken = consume(TOKEN_TYPES.IDENTIFIER, "Expected field identifier");
    
    let defaultValue = null;
    if (match(TOKEN_TYPES.OP_ASSIGN)) {
      defaultValue = parseExpression();
    }

    return createNode(AST_NODE_TYPES.FIELD_DECL, {
      dataType: createNode(AST_NODE_TYPES.DATA_TYPE, { token: typeToken, name: typeToken.lexeme }),
      identifier: createNode(AST_NODE_TYPES.IDENTIFIER, { token: idToken, name: idToken?.lexeme }),
      defaultValue
    });
  };

  // <schema_binding> => <identifier> ":" <data_type> [ <binding_clause> ]
  const parseSchemaBinding = () => {
    const idToken = advance(); // Identifier
    consume(TOKEN_TYPES.DEL_COLON, "Expected ':'");
    
    const typeToken = advance();
    if (!isDataType(typeToken.type)) {
      errors.push({ message: "Expected data type for schema binding", line: typeToken.line, column: typeToken.column });
    }

    let bindingClause = null;
    if (match(TOKEN_TYPES.DEL_LPAREN)) {
      const bindId = consume(TOKEN_TYPES.IDENTIFIER, "Expected binding identifier");
      consume(TOKEN_TYPES.DEL_RPAREN, "Expected ')'");
      if (bindId) {
        // Match AST structure expected by downstream tools
        bindingClause = createNode(AST_NODE_TYPES.BINDING_CLAUSE, { 
          value: bindId.lexeme
        });
      }
    }

    return createNode(AST_NODE_TYPES.SCHEMA_BINDING, {
      identifier: createNode(AST_NODE_TYPES.IDENTIFIER, { token: idToken, name: idToken.lexeme }),
      dataType: createNode(AST_NODE_TYPES.DATA_TYPE, { token: typeToken, name: typeToken.lexeme }),
      bindingClause
    });
  };

  // [N] <builtin_function_call>
  const parseBuiltinFunctionCall = () => {
    const token = advance();
    consume(TOKEN_TYPES.DEL_LPAREN, "Expected '('");
    const args = [];
    if (!check(TOKEN_TYPES.DEL_RPAREN)) {
      do {
        args.push(parseExpression());
      } while (match(TOKEN_TYPES.DEL_COMMA));
    }
    consume(TOKEN_TYPES.DEL_RPAREN, "Expected ')'");
    
    return createNode(AST_NODE_TYPES.BUILTIN_FUNCTION_CALL, {
      builtin: createNode(AST_NODE_TYPES.BUILTIN_NAME, { token, name: token.lexeme }),
      arguments: createNode(AST_NODE_TYPES.ARG_LIST, { args })
    });
  };

  const parseJumpStatement = () => {
    const token = advance();
    return createNode(AST_NODE_TYPES.JUMP_STMT, { keyword: token, type: token.lexeme });
  };

  // [J] <function_call> (Helper for postfix)
  const parseFunctionCall = (callee) => {
    const args = [];
    if (!check(TOKEN_TYPES.DEL_RPAREN)) {
      do {
        args.push(parseExpression());
      } while (match(TOKEN_TYPES.DEL_COMMA));
    }
    consume(TOKEN_TYPES.DEL_RPAREN, "Expected ')'");
    
    return createNode(AST_NODE_TYPES.FUNCTION_CALL, {
      function: callee,
      arguments: createNode(AST_NODE_TYPES.ARG_LIST, { args })
    });
  };

  // [L] <list_lit>
  const parseListLiteral = () => {
    const token = consume(TOKEN_TYPES.DEL_LBRACK);
    const elements = [];
    if (!check(TOKEN_TYPES.DEL_RBRACK)) {
      do {
        elements.push(parseExpression());
      } while (match(TOKEN_TYPES.DEL_COMMA));
    }
    consume(TOKEN_TYPES.DEL_RBRACK, "Expected ']'");
    
    return createNode(AST_NODE_TYPES.LIST_LIT, {
      token,
      elements: createNode(AST_NODE_TYPES.ARRAY_ELEMENTS, { elements })
    });
  };

  // [M] String Insertion System (SIS) Helper
  const parseCompositeStringLiteral = () => {
    const parts = [];
    let fullContent = '';
    const firstToken = peek();
    
    while (!isAtEnd()) {
      const token = peek();
      if (token.type === TOKEN_TYPES.STRING_LITERAL) {
        advance();
        const content = token.lexeme.slice(1, -1);
        fullContent += content;
        parts.push(createNode(AST_NODE_TYPES.STRING_CONTENT, { value: content }));
      } else if (token.type === TOKEN_TYPES.SIS_MARKER) {
        advance();
        fullContent += token.lexeme;
        const ident = token.lexeme.startsWith('@') ? token.lexeme.substring(1) : token.lexeme;
        parts.push(createNode(AST_NODE_TYPES.STRING_INSERTION, {
          identifier: createNode(AST_NODE_TYPES.IDENTIFIER, { name: ident })
        }));
      } else {
        break;
      }
    }
    
    return createNode(AST_NODE_TYPES.STRING_LIT, {
      token: firstToken,
      content: parts.length > 0 ? parts : [createNode(AST_NODE_TYPES.STRING_CONTENT, { value: fullContent })]
    });
  };

  // --- Expression Parsing (Precedence Climbing) [C] ---

  const parseExpression = () => parseLogicOr();

  const parseLogicOr = () => {
    let left = parseLogicAnd();
    while (match(TOKEN_TYPES.OP_OR)) {
      const op = previous();
      const right = parseLogicAnd();
      left = createNode(AST_NODE_TYPES.LOGIC_OR, { left, operator: op.lexeme, right });
    }
    return left;
  };

  const parseLogicAnd = () => {
    let left = parseEquality();
    while (match(TOKEN_TYPES.OP_AND)) {
      const op = previous();
      const right = parseEquality();
      left = createNode(AST_NODE_TYPES.LOGIC_AND, { left, operator: op.lexeme, right });
    }
    return left;
  };

  const parseEquality = () => {
    let left = parseRelational();
    while (match(TOKEN_TYPES.OP_EQ, TOKEN_TYPES.OP_NEQ)) {
      const op = previous();
      const right = parseRelational();
      left = createNode(AST_NODE_TYPES.EQUALITY, { left, operator: op.lexeme, right });
    }
    return left;
  };

  const parseRelational = () => {
    let left = parseAdditive();
    while (match(TOKEN_TYPES.OP_LT, TOKEN_TYPES.OP_GT, TOKEN_TYPES.OP_LTE, TOKEN_TYPES.OP_GTE)) {
      const op = previous();
      const right = parseAdditive();
      left = createNode(AST_NODE_TYPES.RELATIONAL, { left, operator: op.lexeme, right });
    }
    return left;
  };

  const parseAdditive = () => {
    let left = parseMultiplicative();
    while (match(TOKEN_TYPES.OP_ADD, TOKEN_TYPES.OP_SUB)) {
      const op = previous();
      const right = parseMultiplicative();
      left = createNode(AST_NODE_TYPES.ADDITIVE, { left, operator: op.lexeme, right });
    }
    return left;
  };

  const parseMultiplicative = () => {
    let left = parseExponential();
    while (match(TOKEN_TYPES.OP_MUL, TOKEN_TYPES.OP_DIV, TOKEN_TYPES.OP_INT_DIV, TOKEN_TYPES.OP_MOD)) {
      const op = previous();
      const right = parseExponential();
      left = createNode(AST_NODE_TYPES.MULTIPLICATIVE, { left, operator: op.lexeme, right });
    }
    return left;
  };

  const parseExponential = () => {
    let left = parseUnary();
    while (match(TOKEN_TYPES.OP_EXP)) {
      const op = previous();
      const right = parseUnary();
      left = createNode(AST_NODE_TYPES.EXPONENTIAL, { left, operator: op.lexeme, right });
    }
    return left;
  };

  const parseUnary = () => {
    if (match(TOKEN_TYPES.OP_NOT, TOKEN_TYPES.OP_ADD, TOKEN_TYPES.OP_SUB, TOKEN_TYPES.OP_INC, TOKEN_TYPES.OP_DEC)) {
      const op = previous();
      const right = parseUnary();
      return createNode(AST_NODE_TYPES.UNARY, { operator: op.lexeme, expression: right });
    }
    return parsePostfix();
  };

  // [J] & [L] Postfix: Calls, Indexing, Member Access
  const parsePostfix = () => {
    let expr = parsePrimary();

    while (true) {
      if (match(TOKEN_TYPES.DEL_LBRACK)) {
        const index = parseExpression();
        consume(TOKEN_TYPES.DEL_RBRACK, "Expected ']'");
        expr = createNode(AST_NODE_TYPES.LIST_ACCESS, { array: expr, index });
      } else if (match(TOKEN_TYPES.DEL_PERIOD)) {
        const fieldToken = consume(TOKEN_TYPES.IDENTIFIER, "Expected field name");
        expr = createNode(AST_NODE_TYPES.FIELD_ACCESS, { 
          object: expr, 
          field: createNode(AST_NODE_TYPES.IDENTIFIER, { token: fieldToken, name: fieldToken?.lexeme })
        });
      } else if (match(TOKEN_TYPES.DEL_LPAREN)) {
        // Function Call via Identifier
        expr = parseFunctionCall(expr);
      } else {
        break;
      }
    }
    return expr;
  };

  const parsePrimary = () => {
    if (match(TOKEN_TYPES.NUMBER_LITERAL)) {
      return createNode(AST_NODE_TYPES.NUMBER_LIT, { token: previous(), value: parseFloat(previous().lexeme) });
    }
    if (match(TOKEN_TYPES.DECIMAL_LITERAL)) {
      return createNode(AST_NODE_TYPES.DECIMAL_LIT, { token: previous(), value: parseFloat(previous().lexeme) });
    }
    if (check(TOKEN_TYPES.STRING_LITERAL) || check(TOKEN_TYPES.SIS_MARKER)) {
      return parseCompositeStringLiteral();
    }
    if (match(TOKEN_TYPES.RESERVED_TRUE)) {
      return createNode(AST_NODE_TYPES.BOOL_LIT, { token: previous(), value: true });
    }
    if (match(TOKEN_TYPES.RESERVED_FALSE)) {
      return createNode(AST_NODE_TYPES.BOOL_LIT, { token: previous(), value: false });
    }
    if (match(TOKEN_TYPES.RESERVED_NULL)) {
      return createNode(AST_NODE_TYPES.NULL_LITERAL, { token: previous(), value: null });
    }
    if (check(TOKEN_TYPES.DEL_LBRACK)) {
      return parseListLiteral();
    }
    if (match(TOKEN_TYPES.IDENTIFIER)) {
      return createNode(AST_NODE_TYPES.IDENTIFIER, { token: previous(), name: previous().lexeme });
    }
    if (match(TOKEN_TYPES.DEL_LPAREN)) {
      const expr = parseExpression();
      consume(TOKEN_TYPES.DEL_RPAREN, "Expected ')'");
      return expr;
    }

    // Error
    const token = peek();
    errors.push({ message: `Unexpected token in expression: ${token?.lexeme}`, line: token?.line, column: token?.column });
    advance(); // Recover
    return null;
  };

  // --- Execution ---
  try {
    const ast = parseProgram();
    return {
      ast: errors.length > 0 ? null : ast,
      errors: errors.length > 0 ? errors : undefined,
      success: errors.length === 0
    };
  } catch (e) {
    return {
      ast: null,
      errors: [{ message: `Internal Parser Error: ${e.message}`, line: 0, column: 0 }],
      success: false
    };
  }
};