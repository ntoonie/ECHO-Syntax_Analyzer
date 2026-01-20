

export function parseTokenStream(tokenStream) {

  let rawTokens = tokenStream;

  if (typeof tokenStream === 'string') {
    const trimmed = tokenStream.trim();

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        rawTokens = JSON.parse(trimmed);
      } catch (err) {
        throw new Error('Invalid JSON token stream');
      }
    } else {

      rawTokens = trimmed.split('\n').filter(t => t.trim().length > 0);
    }
  }


  const toType = (tok) => {
    if (tok == null) return undefined;
    if (typeof tok === 'string') return tok.trim();
    if (typeof tok === 'object' && 'type' in tok) return String(tok.type).trim();
    return undefined;
  };

  if (!Array.isArray(rawTokens)) {
    throw new Error('Token stream must be an array of tokens');
  }

  const tokenTypes = rawTokens;

  let i = 0;
  const errors = [];

  const peekToken = () => tokenTypes[i];
  const peek = () => toType(tokenTypes[i]);
  const peekNext = () => toType(tokenTypes[i + 1]);
  
  const eatToken = (expected) => {
    const current = toType(tokenTypes[i]);
    if (current !== expected) {
      const error = `Expected ${expected}, got ${current}`;
      errors.push(error);
      throw new Error(error);
    }
    return tokenTypes[i++];
  };
  
  const eat = (expected) => {
    const current = toType(tokenTypes[i]);
    if (current !== expected) {
      const error = `Expected ${expected}, got ${current}`;
      errors.push(error);
      throw new Error(error);
    }
    i++;
    return current;
  };

  const match = (...types) => {
    if (i >= tokenTypes.length) return false;
    return types.includes(peek());
  };

  const advance = () => {
    return toType(tokenTypes[i++]);
  };
  
  const advanceToken = () => {
    return tokenTypes[i++];
  };


  const parseProgram = () => {
    const decls = [];
    let startToken = null;
    let endToken = null;
    
    try {
      // Parse top-level declarations (functions, etc.) before start block
      while (i < tokenTypes.length && !match('KW_START')) {
        const stmt = parseStatement();
        if (stmt) decls.push(stmt);
      }
      
      // Now expect start keyword
      startToken = eatToken('KW_START');
      
      // Parse statements inside start block
      while (
        i < tokenTypes.length &&
        !(peek() === 'KW_END' && !['KW_C','KW_L','KW_R','KW_P'].includes(peekNext()))
      ) {
        const stmt = parseStatement();
        if (stmt) decls.push(stmt);
      }
      
      // Expect closing end
      endToken = eatToken('KW_END');
      
      return {
        type: 'PROGRAM',
        startToken,
        endToken,
        decls
      };
    } catch (err) {
      errors.push(err.message);
      return {
        type: 'PROGRAM',
        decls,
        error: err.message
      };
    }
  };

  const parseStatement = () => {
    // Skip noise words
    while (match('NW')) advance();
    
    if (i >= tokenTypes.length) return null;
    
    const current = peek();
    const currentToken = peekToken();
    const lex = (typeof currentToken === 'object' && currentToken.lexeme) ? currentToken.lexeme.toLowerCase() : '';

    // Variable declaration: KW_T (data types)
    if (match('KW_T')) {
      return parseDeclaration();
    }
    
    // Assignment (ID followed by assignment operator)
    if (match('ID') && peekNext() === 'OP_ASG') {
      return parseAssignment();
    }
    
    // Echo / Input / Function (KW_P)
    if (match('KW_P')) {
      if (lex === 'input') return parseInput();
      if (lex === 'function') return parseFunctionDef();
      return parseEcho();
    }
    
    // Conditionals (KW_C)
    if (match('KW_C')) {
      if (lex === 'switch') return parseSwitchStatement();
      if (lex === 'if') return parseIfStatement();
      // else/elseif/then/default/case at top-level are unexpected; skip
      advance();
      return null;
    }
    
    // Loops (KW_L)
    if (match('KW_L')) {
      if (lex === 'for') return parseForLoop();
      if (lex === 'while') return parseWhileLoop();
      if (lex === 'do') return parseDoWhileLoop();
      advance();
      return null;
    }
    
    // Reserved (KW_R)
    if (match('KW_R')) {
      if (lex === 'return') return parseReturn();
      if (lex === 'break') { advanceToken(); return { type: 'BREAK_STMT' }; }
      if (lex === 'continue') { advanceToken(); return { type: 'CONTINUE_STMT' }; }
      advanceToken();
      return null;
    }
    
    // Expression statement
    if (match('ID', 'OP_UN', 'NUM_LITERAL', 'DEC_LITERAL', 'STR_LITERAL', 'NUM', 'DEC', 'STR', 'BOOL')) {
      return parseExpressionStatement();
    }
    
    // Unknown token - skip it
    if (current) {
      advance();
      return null;
    }
    
    return null;
  };

  const parseDeclaration = () => {
    const typeToken = advanceToken(); // KW_T
    const type = toType(typeToken);
    
    const declarations = [];
    
    // Parse first variable
    let nameToken = null;
    let name = 'unknown';
    if (match('ID', 'BOOL')) {
      nameToken = advanceToken();
      name = typeof nameToken === 'object' ? nameToken.lexeme : nameToken;
    }
    
    let value = null;
    if (match('OP_ASG')) {
      advance();
      value = parseExpression();
    }
    
    declarations.push({
      nameToken,
      name,
      value
    });
    
    // Parse additional comma-separated variables
    while (match('DEL_COMMA')) {
      advance(); // consume comma
      
      nameToken = null;
      name = 'unknown';
      if (match('ID', 'BOOL')) {
        nameToken = advanceToken();
        name = typeof nameToken === 'object' ? nameToken.lexeme : nameToken;
      }
      
      value = null;
      if (match('OP_ASG')) {
        advance();
        value = parseExpression();
      }
      
      declarations.push({
        nameToken,
        name,
        value
      });
    }
    
    return {
      type: 'DECLARATION',
      typeToken,
      varType: type,
      declarations
    };
  };

  const parseAssignment = () => {
    const nameToken = advanceToken(); // ID
    const name = typeof nameToken === 'object' ? nameToken.lexeme : nameToken;
    
    const opToken = advanceToken(); // OP_ASG or compound assignment
    const op = toType(opToken);
    
    const value = parseExpression();
    
    return {
      type: 'ASSIGNMENT',
      nameToken,
      name,
      opToken,
      op,
      value
    };
  };

  const parseEcho = () => {
    advance(); // KW_P
    
    const args = [];
    
    // Parse expression or list of expressions
    if (!match('KW_END') && i < tokenTypes.length) {
      args.push(parseExpression());
      
      // Handle comma-separated expressions
      while (match('DEL_COMMA')) {
        advance();
        args.push(parseExpression());
      }
    }
    
    return {
      type: 'ECHO_STMT',
      args
    };
  };

  const parseInput = () => {
    const kw = advanceToken(); // KW_P with lexeme 'input'
    const targets = [];
    while (match('ID')) {
      targets.push(advanceToken());
      if (match('DEL_COMMA')) advance();
      else break;
    }
    return {
      type: 'INPUT_STMT',
      kw,
      targets
    };
  };

  const parseIfStatement = () => {
    advance(); // KW_C
    
    if (match('DEL_LPAR')) advance();
    const condition = parseExpression();
    if (match('DEL_RPAR')) advance();
    
    const thenBody = [];
    // Parse until we hit 'else', 'elseif', or 'end if'
    while (i < tokenTypes.length) {
      if (match('KW_C')) {
        // This could be 'else' or 'elseif', check
        const currentToken = peekToken();
        const lex = (typeof currentToken === 'object' && currentToken.lexeme) ? currentToken.lexeme.toLowerCase() : '';
        if (lex === 'else' || lex === 'elseif') {
          break;
        }
      }
      if (match('KW_END')) {
        if (peekNext() === 'KW_C') {
          break;
        }
      }
      
      const stmt = parseStatement();
      if (stmt) thenBody.push(stmt);
    }
    
    const elseIfs = [];
    while (match('KW_C')) {
      const currentToken = peekToken();
      const lex = (typeof currentToken === 'object' && currentToken.lexeme) ? currentToken.lexeme.toLowerCase() : '';
      
      if (lex === 'elseif') {
        advance(); // ELSEIF
        
        if (match('DEL_LPAR')) advance();
        const elifCond = parseExpression();
        if (match('DEL_RPAR')) advance();
        
        const elifBody = [];
        while (i < tokenTypes.length) {
          if (match('KW_C')) {
            const nextToken = peekToken();
            const nextLex = (typeof nextToken === 'object' && nextToken.lexeme) ? nextToken.lexeme.toLowerCase() : '';
            if (nextLex === 'else' || nextLex === 'elseif') {
              break;
            }
          }
          if (match('KW_END')) {
            if (peekNext() === 'KW_C') {
              break;
            }
          }
          
          const stmt = parseStatement();
          if (stmt) elifBody.push(stmt);
        }
        
        elseIfs.push({ condition: elifCond, body: elifBody });
      } else {
        break;
      }
    }
    
    let elseBody = null;
    if (match('KW_C')) {
      const currentToken = peekToken();
      const lex = (typeof currentToken === 'object' && currentToken.lexeme) ? currentToken.lexeme.toLowerCase() : '';
      
      if (lex === 'else') {
        advance(); // ELSE
        
        elseBody = [];
        while (i < tokenTypes.length) {
          if (match('KW_END')) {
            if (peekNext() === 'KW_C') {
              break;
            }
          }
          
          const stmt = parseStatement();
          if (stmt) elseBody.push(stmt);
        }
      }
    }

    // Consume closing 'end if'
    if (match('KW_END')) advance();
    if (match('KW_C')) advance();
    
    return {
      type: 'IF_STMT',
      condition,
      thenBody,
      elseIfs,
      elseBody
    };
  };

  const parseSwitchStatement = () => {
    advance(); // KW_C (switch keyword)
    
    if (match('DEL_LPAR')) advance();
    const expr = parseExpression();
    if (match('DEL_RPAR')) advance();
    
    if (match('DEL_LBRACE')) advance();
    
    const cases = [];
    let defaultBody = null;
    
    // Parse cases and default until 'end switch'
    while (i < tokenTypes.length) {
      // Check for 'case' keyword
      if (match('KW_C')) {
        const currentToken = peekToken();
        const currentLex = (typeof currentToken === 'object' && currentToken.lexeme)
          ? currentToken.lexeme.toLowerCase()
          : '';
        
        if (currentLex === 'case') {
          advance(); // case keyword
          
          const value = parseExpression();
          
          if (match('DEL_COL')) advance();
          
          const body = [];
          // Parse statements until next case, default, or end switch
          while (i < tokenTypes.length) {
            if (match('KW_C')) {
              const nextToken = peekToken();
              const nextLex = (typeof nextToken === 'object' && nextToken.lexeme)
                ? nextToken.lexeme.toLowerCase()
                : '';
              
              if (nextLex === 'case' || nextLex === 'default') {
                break;
              }
            }
            
            if (match('KW_END')) {
              const nextToken = tokenTypes[i + 1];
              const nextType = toType(nextToken);
              const nextLex = (typeof nextToken === 'object' && nextToken.lexeme)
                ? nextToken.lexeme.toLowerCase()
                : '';
              
              if (nextType === 'KW_C' && nextLex === 'switch') {
                break;
              }
            }
            
            if (match('DEL_RBRACE')) {
              break;
            }
            
            const stmt = parseStatement();
            if (stmt) body.push(stmt);
          }
          
          cases.push({ value, body });
        } else if (currentLex === 'default') {
          advance(); // default keyword
          
          if (match('DEL_COL')) advance();
          
          defaultBody = [];
          // Parse statements until end switch or closing brace
          while (i < tokenTypes.length) {
            if (match('KW_END')) {
              const nextToken = tokenTypes[i + 1];
              const nextType = toType(nextToken);
              const nextLex = (typeof nextToken === 'object' && nextToken.lexeme)
                ? nextToken.lexeme.toLowerCase()
                : '';
              
              if (nextType === 'KW_C' && nextLex === 'switch') {
                break;
              }
            }
            
            if (match('DEL_RBRACE')) {
              break;
            }
            
            const stmt = parseStatement();
            if (stmt) defaultBody.push(stmt);
          }
        }
      } else if (match('KW_END')) {
        const nextToken = tokenTypes[i + 1];
        const nextType = toType(nextToken);
        const nextLex = (typeof nextToken === 'object' && nextToken.lexeme)
          ? nextToken.lexeme.toLowerCase()
          : '';
        
        if (nextType === 'KW_C' && nextLex === 'switch') {
          break; // End of switch
        }
      } else if (match('DEL_RBRACE')) {
        break;
      } else {
        // Skip unknown tokens
        advance();
      }
    }
    
    if (match('DEL_RBRACE')) advance();
    
    // Consume closing 'end switch'
    if (match('KW_END')) advance();
    if (match('KW_C')) advance();
    
    return {
      type: 'SWITCH_STMT',
      expr,
      cases,
      defaultBody
    };
  };

  const parseForLoop = () => {
    advance(); // KW_L (for keyword)
    
    // Get iterator variable
    let iteratorToken = null;
    let iterator = 'i';
    if (match('ID')) {
      iteratorToken = advanceToken();
      iterator = typeof iteratorToken === 'object' ? iteratorToken.lexeme : iteratorToken;
    }
    
    // Expect assignment operator (=)
    if (match('OP_ASG')) {
      advance();
    }
    
    // Parse start value
    const start = parseExpression();
    
    // Expect TO keyword (noise word)
    if (match('NW')) advance();
    
    // Parse end value
    const end = parseExpression();
    
    // Parse optional step with BY keyword
    let step = null;
    if (match('NW')) { // BY keyword
      advance();
      step = parseExpression();
    }
    
    // Handle optional opening brace
    if (match('DEL_LBRACE')) advance();
    
    const body = [];
    // Parse body until we hit 'end for'
    while (i < tokenTypes.length) {
      // Check for end of loop
      if (match('KW_END')) {
        const nextToken = tokenTypes[i + 1];
        const nextType = toType(nextToken);
        const nextLex = (typeof nextToken === 'object' && nextToken.lexeme) 
          ? nextToken.lexeme.toLowerCase() 
          : '';
        
        // Only break if next is 'for' keyword
        if (nextType === 'KW_L' && nextLex === 'for') {
          break;
        }
      }
      
      if (match('DEL_RBRACE')) {
        break;
      }
      
      const stmt = parseStatement();
      if (stmt) body.push(stmt);
    }
    
    // Handle closing braces/keywords
    if (match('DEL_RBRACE')) advance();
    if (match('KW_END')) advance();
    if (match('KW_L')) advance();
    
    return {
      type: 'FOR_STMT',
      iteratorToken,
      iterator,
      start,
      end,
      step,
      body
    };
  };

  const parseWhileLoop = () => {
    advance(); // KW_L (while keyword)
    
    if (match('DEL_LPAR')) advance();
    const condition = parseExpression();
    if (match('DEL_RPAR')) advance();
    
    if (match('DEL_LBRACE')) advance();
    
    const body = [];
    // Parse body until we hit 'end while'
    while (i < tokenTypes.length) {
      // Check for end of loop
      if (match('KW_END')) {
        const nextToken = tokenTypes[i + 1];
        const nextType = toType(nextToken);
        const nextLex = (typeof nextToken === 'object' && nextToken.lexeme) 
          ? nextToken.lexeme.toLowerCase() 
          : '';
        
        // Only break if next is 'while' keyword
        if (nextType === 'KW_L' && nextLex === 'while') {
          break;
        }
      }
      
      if (match('DEL_RBRACE')) {
        break;
      }
      
      const stmt = parseStatement();
      if (stmt) body.push(stmt);
    }
    
    if (match('DEL_RBRACE')) advance();
    
    // Consume closing 'end while'
    if (match('KW_END')) advance();
    if (match('KW_L')) advance();
    
    return {
      type: 'WHILE_STMT',
      condition,
      body
    };
  };

  const parseDoWhileLoop = () => {
    advance(); // KW_L (do keyword)
    
    if (match('DEL_LBRACE')) advance();
    
    const body = [];
    // Parse body until we hit 'while'
    while (i < tokenTypes.length) {
      // Check for 'while' keyword that closes the do block
      if (match('KW_L')) {
        const currentToken = peekToken();
        const currentLex = (typeof currentToken === 'object' && currentToken.lexeme) 
          ? currentToken.lexeme.toLowerCase() 
          : '';
        
        if (currentLex === 'while') {
          break; // End of body, now parse while condition
        }
      }
      
      if (match('DEL_RBRACE')) {
        break;
      }
      
      const stmt = parseStatement();
      if (stmt) body.push(stmt);
    }
    
    if (match('DEL_RBRACE')) advance();
    
    // Parse while condition
    if (match('KW_L')) advance(); // WHILE keyword
    
    if (match('DEL_LPAR')) advance();
    const condition = parseExpression();
    if (match('DEL_RPAR')) advance();
    
    // Consume closing 'end do'
    if (match('KW_END')) advance();
    if (match('KW_L')) advance();
    
    return {
      type: 'DO_WHILE_STMT',
      body,
      condition
    };
  };

  const parseFunctionDef = () => {
    const funcToken = advanceToken(); // function keyword (KW_P)
    
    const returnTypeToken = match('KW_T') ? advanceToken() : null;
    const returnType = returnTypeToken || 'VOID';
    
    const nameToken = match('ID') ? advanceToken() : null;
    const name = nameToken || 'unknown';
    
    if (match('DEL_LPAR')) advance();
    
    const params = [];
    while (!match('DEL_RPAR') && i < tokenTypes.length) {
      if (match('KW_T')) {
        const typeToken = advanceToken();
        const pNameToken = match('ID') ? advanceToken() : null;
        params.push({ typeToken, nameToken: pNameToken });
        
        if (match('DEL_COMMA')) {
          advance();
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    if (match('DEL_RPAR')) advance();
    
    if (match('DEL_LBRACE')) advance();
    
    const body = [];
    // Parse body until we hit 'end function'
    while (i < tokenTypes.length) {
      // Check for end of function
      if (match('KW_END')) {
        const nextToken = tokenTypes[i + 1];
        const nextType = toType(nextToken);
        const nextLex = (typeof nextToken === 'object' && nextToken.lexeme)
          ? nextToken.lexeme.toLowerCase()
          : '';
        
        // Only break if next is 'function' keyword
        if (nextType === 'KW_P' && nextLex === 'function') {
          break;
        }
      }
      
      if (match('DEL_RBRACE')) {
        break;
      }
      
      const stmt = parseStatement();
      if (stmt) body.push(stmt);
    }
    
    if (match('DEL_RBRACE')) advance();
    
    // Consume 'end function' terminator
    if (match('KW_END')) advance();
    if (match('KW_P')) advance();
    
    return {
      type: 'FUNCTION_DEF',
      funcToken,
      returnTypeToken,
      returnType,
      nameToken,
      name,
      params,
      body
    };
  };

  const parseReturn = () => {
    advanceToken(); // KW_R (return keyword)
    
    let value = null;
    if (!match('KW_END', 'KW_P', 'KW_C', 'KW_L', 'KW_R') && i < tokenTypes.length) {
      value = parseExpression();
    }
    
    return {
      type: 'RETURN_STMT',
      value
    };
  };

  const parseExpressionStatement = () => {
    const expr = parseExpression();
    return {
      type: 'EXPR_STMT',
      expr
    };
  };

  const parseExpression = () => {
    return parseLogicalOr();
  };

  const parseLogicalOr = () => {
    let left = parseLogicalAnd();
    
    while (match('OP_LOG')) {
      const op = advanceToken();
      const right = parseLogicalAnd();
      left = { type: 'BINARY_EXPR', op, left, right };
    }
    
    return left;
  };

  const parseLogicalAnd = () => {
    let left = parseEquality();
    
    while (match('OP_LOG')) {
      const op = advanceToken();
      const right = parseEquality();
      left = { type: 'BINARY_EXPR', op, left, right };
    }
    
    return left;
  };

  const parseEquality = () => {
    let left = parseRelational();
    
    while (match('OP_REL')) {
      const op = advanceToken();
      const right = parseRelational();
      left = { type: 'BINARY_EXPR', op, left, right };
    }
    
    return left;
  };

  const parseRelational = () => {
    let left = parseAdditive();
    
    while (match('OP_REL')) {
      const op = advanceToken();
      const right = parseAdditive();
      left = { type: 'BINARY_EXPR', op, left, right };
    }
    
    return left;
  };

  const parseAdditive = () => {
    let left = parseMultiplicative();
    
    while (match('OP_AR')) {
      const op = advanceToken();
      const right = parseMultiplicative();
      left = { type: 'BINARY_EXPR', op, left, right };
    }
    
    return left;
  };

  const parseMultiplicative = () => {
    let left = parseExponentiation();
    
    while (match('OP_AR')) {
      const op = advanceToken();
      const right = parseExponentiation();
      left = { type: 'BINARY_EXPR', op, left, right };
    }
    
    return left;
  };

  const parseExponentiation = () => {
    let left = parseUnary();
    
    while (match('OP_AR')) {
      const op = advanceToken();
      const right = parseUnary();
      left = { type: 'BINARY_EXPR', op, left, right };
    }
    
    return left;
  };

  const parseUnary = () => {
    if (match('OP_UN')) {
      const op = advanceToken();
      const expr = parseUnary();
      return { type: 'UNARY_EXPR', op, expr };
    }
    
    return parsePostfix();
  };

  const parsePostfix = () => {
    let expr = parsePrimary();
    
    while (true) {
      if (match('DEL_LBRACK')) {
        advance();
        const index = parseExpression();
        if (match('DEL_RBRACK')) advance();
        expr = { type: 'ARRAY_ACCESS', array: expr, index };
      } else if (match('DEL_LPAR')) {
        advance();
        const args = [];
        while (!match('DEL_RPAR') && i < tokenTypes.length) {
          args.push(parseExpression());
          if (match('DEL_COMMA')) advance();
        }
        if (match('DEL_RPAR')) advance();
        expr = { type: 'FUNCTION_CALL', func: expr, args };
      } else {
        break;
      }
    }
    
    return expr;
  };

  const parsePrimary = () => {
    // Literals
    if (match('NUM', 'NUM_LITERAL')) {
      const value = advanceToken();
      return { type: 'NUMBER_LITERAL', value };
    }
    
    if (match('DEC', 'DEC_LITERAL')) {
      const value = advanceToken();
      return { type: 'DECIMAL_LITERAL', value };
    }
    
    if (match('STR', 'STR_LITERAL')) {
      const value = advanceToken();
      return { type: 'STRING_LITERAL', value };
    }
    
    if (match('BOOL', 'BOOL_LITERAL')) {
      const value = advanceToken();
      return { type: 'BOOLEAN_LITERAL', value };
    }
    
    // Identifier
    if (match('ID')) {
      const name = advanceToken();
      return { type: 'IDENTIFIER', name };
    }
    
    // String Insertion (@var)
    if (match('SIS')) {
      advance();
      const variable = match('ID') ? advance() : 'unknown';
      return { type: 'VAR_REFERENCE', name: variable };
    }
    
    // Array literal
    if (match('DEL_LBRACK')) {
      advance();
      const elements = [];
      while (!match('DEL_RBRACK') && i < tokenTypes.length) {
        elements.push(parseExpression());
        if (match('DEL_COMMA')) advance();
      }
      if (match('DEL_RBRACK')) advance();
      return { type: 'ARRAY_LITERAL', elements };
    }
    
    // Parenthesized expression
    if (match('DEL_LPAR')) {
      advance();
      const expr = parseExpression();
      if (match('DEL_RPAR')) advance();
      return expr;
    }
    
    // Fallback for unknown tokens
    const unknown = advance();
    return { type: 'UNKNOWN', token: unknown };
  };

  try {
    const ast = parseProgram();
    return {
      ast,
      errors,
      tokenCount: tokenTypes.length
    };
  } catch (err) {
    errors.push(err.message);
    return {
      ast: null,
      errors,
      tokenCount: tokenTypes.length
    };
  }
}

// Pretty-print AST
export function indentAst(node) {
  const IND = '\t\t';

  const getTypeCode = (lexeme) => {
    if (!lexeme) return '';
    const lower = String(lexeme).toLowerCase();
    if (lower === 'integer') return 'NUM';
    if (lower === 'decimal') return 'DEC';
    if (lower === 'string') return 'STR';
    if (lower === 'boolean') return 'BOOL';
    return lexeme;
  };

  const getTokenInfo = (token) => {
    if (!token) return '';
    if (typeof token === 'string') return token;
    if (typeof token === 'object') {
      const type = token.type || '';
      const lexeme = token.lexeme || '';
      // Only keep lexeme for identifiers and data types
      if (type === 'ID' || type === 'KW_T') {
        return lexeme ? `${type} ${lexeme}` : type;
      }
      return type;
    }
    return '';
  };

  const getLexeme = (token) => {
    if (!token) return '';
    if (typeof token === 'object') return token.lexeme ?? token.type ?? '';
    return token;
  };

  const formatExpr = (expr) => {
    if (!expr) return '';
    
    switch (expr.type) {
      case 'IDENTIFIER': {
        const nameLex = typeof expr.name === 'object' ? (expr.name.lexeme ?? '') : (expr.name ?? expr.lexeme ?? '');
        return `IDENTIFIER ${nameLex}`;
      }
      case 'NUMBER_LITERAL': 
        return `NUM ${getLexeme(expr.value)}`;
      case 'DECIMAL_LITERAL': 
        return `DEC ${getLexeme(expr.value)}`;
      case 'STRING_LITERAL': 
        return `STR ${getLexeme(expr.value)}`;
      case 'BOOLEAN_LITERAL': 
        return `BOOL ${getLexeme(expr.value)}`;
      case 'FUNCTION_CALL': {
        const funcName = expr.func?.type === 'IDENTIFIER'
          ? formatExpr(expr.func)
          : formatExpr(expr.func);
        const argsStr = (expr.args || []).map(a => formatExpr(a)).join(', ');
        return `FUNCTION_CALL ${funcName.replace('IDENTIFIER ', '')}(${argsStr})`;
      }
      case 'BINARY_EXPR': {
        const left = formatExpr(expr.left);
        const right = formatExpr(expr.right);
        const opStr = getLexeme(expr.op);
        return `${opStr}(${left},${right})`;
      }
      case 'UNARY_EXPR': {
        const right = formatExpr(expr.right);
        const opStr = getLexeme(expr.op);
        return `${opStr}(${right})`;
      }
      default: 
        return expr.type || '';
    }
  };

  const walk = (n, depth) => {
    if (!n) return [];
    const lines = [];
    const pad = IND.repeat(depth);

    switch (n.type) {
      case 'PROGRAM': {
        lines.push('ECHO_PROG');
        lines.push(IND + 'BODY');
        (n.decls || []).forEach(stmt => {
          lines.push(IND.repeat(2) + 'STATEMENTS');
          lines.push(...walk(stmt, 3));
        });
        break;
      }
      case 'FUNCTION_DEF': {
        lines.push(pad + 'FUNCTION_DEF');
        lines.push(IND.repeat(depth + 1) + 'RETURN_TYPE ' + getLexeme(n.returnTypeToken || n.returnType));
        lines.push(IND.repeat(depth + 1) + 'FUNCTION_NAME ' + getLexeme(n.nameToken || n.name));
        lines.push(IND.repeat(depth + 1) + 'PARAMETERS');
        (n.params || []).forEach(p => {
          lines.push(IND.repeat(depth + 2) + 'PARAM');
          lines.push(IND.repeat(depth + 3) + 'DATA_TYPE ' + getLexeme(p.typeToken));
          lines.push(IND.repeat(depth + 3) + 'IDENTIFIER ' + getLexeme(p.nameToken));
        });
        lines.push(IND.repeat(depth + 1) + 'BODY');
        (n.body || []).forEach(stmt => {
          lines.push(IND.repeat(depth + 2) + 'STATEMENTS');
          lines.push(...walk(stmt, depth + 3));
        });
        break;
      }
      case 'DECLARATION': {
        lines.push(pad + 'DEC_STATEMENT');
        if (n.typeToken) {
          const typeCode = getTypeCode(getLexeme(n.typeToken));
          lines.push(IND.repeat(depth + 1) + 'DATA_TYPE ' + typeCode);
        }
        (n.declarations || []).forEach((decl) => {
          const nameLex = typeof decl.nameToken === 'object' ? (decl.nameToken.lexeme || '') : (decl.name || '');
          lines.push(IND.repeat(depth + 1) + 'ID ' + nameLex);
          if (decl.value) {
            lines.push(IND.repeat(depth + 1) + 'ASS_STATEMENT');
            lines.push(IND.repeat(depth + 2) + 'EXPRESSION ' + formatExpr(decl.value));
          }
        });
        break;
      }
      case 'MULTI_DECLARATION': {
        lines.push(pad + 'MULTI_DEC_STATEMENT');
        if (n.typeToken) {
          const typeCode = getTypeCode(getLexeme(n.typeToken));
          lines.push(IND.repeat(depth + 1) + 'DATA_TYPE ' + typeCode);
        }
        (n.declarations || []).forEach((decl, idx) => {
          const nameLex = typeof decl.nameToken === 'object' ? (decl.nameToken.lexeme || '') : (decl.name || '');
          lines.push(IND.repeat(depth + 1) + 'ID ' + nameLex);
          if (decl.value) {
            lines.push(IND.repeat(depth + 1) + 'ASS_STATEMENT');
            lines.push(IND.repeat(depth + 2) + 'EXPRESSION ' + formatExpr(decl.value));
          }
        });
        break;
      }
      case 'ASSIGNMENT': {
        lines.push(pad + 'ASS_STATEMENT');
        if (n.nameToken) {
          const nameLex = typeof n.nameToken === 'object' ? (n.nameToken.lexeme || '') : (n.name || '');
          lines.push(IND.repeat(depth + 1) + 'IDENTIFIER ' + nameLex);
        }
        lines.push(IND.repeat(depth + 1) + 'EXPRESSION ' + formatExpr(n.value));
        break;
      }
      case 'ECHO_STMT': {
        lines.push(pad + 'OUT_STATEMENT');
        lines.push(IND.repeat(depth + 1) + 'OUT');
        (n.args || []).forEach(arg => {
          lines.push(IND.repeat(depth + 2) + 'EXPRESSION ' + formatExpr(arg));
        });
        break;
      }
      case 'INPUT_STMT': {
        lines.push(pad + 'IN_STATEMENT');
        (n.targets || []).forEach(t => {
          const nameLex = typeof t === 'object' ? (t.lexeme || '') : String(t || '');
          lines.push(IND.repeat(depth + 1) + 'IDENTIFIER ' + nameLex);
        });
        break;
      }
      case 'IF_STMT': {
        lines.push(pad + 'CON_STATEMENT');
        lines.push(IND.repeat(depth + 1) + 'IF_STATEMENT');
        lines.push(IND.repeat(depth + 2) + 'EXPRESSION ' + formatExpr(n.condition));
        lines.push(IND.repeat(depth + 2) + 'BODY');
        (n.thenBody || []).forEach(stmt => {
          lines.push(IND.repeat(depth + 3) + 'STATEMENTS');
          lines.push(...walk(stmt, depth + 4));
        });
        if (n.elseIfs && n.elseIfs.length > 0) {
          n.elseIfs.forEach((eif) => {
            lines.push(IND.repeat(depth + 1) + 'ELSEIF_STATEMENT');
            lines.push(IND.repeat(depth + 2) + 'EXPRESSION ' + formatExpr(eif.condition));
            lines.push(IND.repeat(depth + 2) + 'BODY');
            (eif.body || []).forEach(stmt => {
              lines.push(IND.repeat(depth + 3) + 'STATEMENTS');
              lines.push(...walk(stmt, depth + 4));
            });
          });
        }
        if (n.elseBody) {
          lines.push(IND.repeat(depth + 1) + 'ELSE_STATEMENT');
          lines.push(IND.repeat(depth + 2) + 'BODY');
          (n.elseBody || []).forEach(stmt => {
            lines.push(IND.repeat(depth + 3) + 'STATEMENTS');
            lines.push(...walk(stmt, depth + 4));
          });
        }
        break;
      }
      case 'SWITCH_STMT': {
        lines.push(pad + 'CON_STATEMENT');
        lines.push(IND.repeat(depth + 1) + 'SWITCH_STATEMENT');
        lines.push(IND.repeat(depth + 2) + 'EXPRESSION ' + formatExpr(n.expr));
        
        // Format cases
        (n.cases || []).forEach(caseItem => {
          lines.push(IND.repeat(depth + 2) + 'CASE');
          lines.push(IND.repeat(depth + 3) + 'EXPRESSION ' + formatExpr(caseItem.value));
          lines.push(IND.repeat(depth + 3) + 'BODY');
          (caseItem.body || []).forEach(stmt => {
            lines.push(IND.repeat(depth + 4) + 'STATEMENTS');
            lines.push(...walk(stmt, depth + 5));
          });
        });
        
        // Format default
        if (n.defaultBody) {
          lines.push(IND.repeat(depth + 2) + 'DEFAULT');
          lines.push(IND.repeat(depth + 3) + 'BODY');
          (n.defaultBody || []).forEach(stmt => {
            lines.push(IND.repeat(depth + 4) + 'STATEMENTS');
            lines.push(...walk(stmt, depth + 5));
          });
        }
        break;
      }
      case 'WHILE_STMT': {
        lines.push(pad + 'LOOP_STATEMENT');
        lines.push(IND.repeat(depth + 1) + 'WHILE_STATEMENT');
        lines.push(IND.repeat(depth + 2) + 'EXPRESSION ' + formatExpr(n.condition));
        lines.push(IND.repeat(depth + 2) + 'BODY');
        (n.body || []).forEach(stmt => {
          lines.push(IND.repeat(depth + 3) + 'STATEMENTS');
          lines.push(...walk(stmt, depth + 4));
        });
        break;
      }
      case 'DO_WHILE_STMT': {
        lines.push(pad + 'LOOP_STATEMENT');
        lines.push(IND.repeat(depth + 1) + 'DO_WHILE_STATEMENT');
        lines.push(IND.repeat(depth + 2) + 'BODY');
        (n.body || []).forEach(stmt => {
          lines.push(IND.repeat(depth + 3) + 'STATEMENTS');
          lines.push(...walk(stmt, depth + 4));
        });
        lines.push(IND.repeat(depth + 2) + 'EXPRESSION ' + formatExpr(n.condition));
        break;
      }
      case 'FOR_STMT': {
        lines.push(pad + 'LOOP_STATEMENT');
        lines.push(IND.repeat(depth + 1) + 'FOR_STATEMENT');
        
        // Format iterator properly
        const iterLex = typeof n.iterator === 'object' 
          ? (n.iterator.lexeme || n.iterator.type || '')
          : (n.iterator || '');
        lines.push(IND.repeat(depth + 2) + 'ITERATOR ID ' + iterLex);
        
        lines.push(IND.repeat(depth + 2) + 'START ' + formatExpr(n.start));
        lines.push(IND.repeat(depth + 2) + 'END ' + formatExpr(n.end));
        if (n.step) {
          lines.push(IND.repeat(depth + 2) + 'STEP ' + formatExpr(n.step));
        }
        lines.push(IND.repeat(depth + 2) + 'BODY');
        (n.body || []).forEach(stmt => {
          lines.push(IND.repeat(depth + 3) + 'STATEMENTS');
          lines.push(...walk(stmt, depth + 4));
        });
        break;
      }
      case 'RETURN_STMT': {
        lines.push(pad + 'RETURN_STMT');
        if (n.value) {
          lines.push(IND.repeat(depth + 1) + 'EXPRESSION ' + formatExpr(n.value));
        }
        break;
      }
      default: {
        lines.push(pad + (n.type || 'UNKNOWN'));
        break;
      }
    }

    return lines;
  };

  return (walk(node, 0) || []).join('\n');
}