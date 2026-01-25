import { TOKEN_TYPES, KEYWORDS } from '../../../shared/tokenTypes.js';

/*
Lexical Scanner – Token Analysis

Performs lexical analysis on ECHO language source code to generate tokens.
Handles string interpolation, numbers, identifiers, operators, and comments.
Depends on TokenTypes module.
*/

/*
Check if character is a letter

@param {String} c - Character to check
@returns {Boolean} True if character is a letter
*/
const isLetter = (c) => /[A-Za-z]/.test(c);

/*
Check if character is a digit

@param {String} c - Character to check
@returns {Boolean} True if character is a digit
*/
const isDigit = (c) => /[0-9]/.test(c);

/*
Main lexical analyzer function

@param {String} rawCode - Raw source code to analyze
@returns {Array} Array of tokens with line/column information
*/
export const lexicalAnalyzer = (rawCode) => {
  let code = rawCode || '';
  const tokenList = [];
  let line = 1;
  let column = 1;
  let i = 0;
  
  // Normalize whitespace to prevent invisible character issues
  code = code.replace(/\u00A0/g, ' ');
  code = code.replace(/[\u200B-\u200D\uFEFF]/g, '');

  while (i < code.length) {
    if (code[i] === '\r') {
      i++;
      continue;
    }

    const char = code[i];

    if (char === ' ' || char === '\u00A0') {
      column++;
      i++;
      continue;
    }
    if (char === '\t') {
      column += 4; // Standard tab width
      i++;
      continue;
    }
    if (char === '\n') {
      line++;
      column = 1; // Reset column on new line
      i++;
      continue;
    }

    // Comments: // ...
    if (char === '/' && code[i + 1] === '/') {
      let prevNonWhitespace = null;
      let j = i - 1;
      while (j >= 0 && (code[j] === ' ' || code[j] === '\t')) {
        j--;
      }
      if (j >= 0 && code[j] !== '\n' && code[j] !== '\r') {
        prevNonWhitespace = code[j];
      }
      
      const isComment = prevNonWhitespace === null || 
                       prevNonWhitespace === '\n' || 
                       prevNonWhitespace === '\r';
      
      if (isComment) {
        const startColumn = column;
        let comment = '';
        column += 2;
        i += 2;
        while (i < code.length && code[i] !== '\n') {
          comment += code[i];
          column++;
          i++;
        }
        tokenList.push({ line, column: startColumn, type: TOKEN_TYPES.COMMENT_SINGLE, lexeme: '//' + comment });
        continue;
      }
    }

    // Comments: /* ... */
    if (char === '/' && code[i + 1] === '*') {
      let comment = '/*';
      const startLine = line;
      const startColumn = column;
      column += 2;
      i += 2;
      while (i < code.length - 1 && !(code[i] === '*' && code[i + 1] === '/')) {
        if (code[i] === '\n') {
          line++;
          column = 1;
        } else {
          column++;
        }
        comment += code[i];
        i++;
      }
      if (i < code.length - 1) {
        comment += '*/';
        column += 2;
        i += 2;
      }
      tokenList.push({ line: startLine, column: startColumn, type: TOKEN_TYPES.COMMENT_MULTI, lexeme: comment });
      continue;
    }

    // Strings
    if (char === '"') {
      let currentSegment = '';
      let startLine = line;
      let startColumn = column;
      column++;
      i++;
      
      while (i < code.length && code[i] !== '"') {
        // Handle string interpolation (@variable)
        if (code[i] === '@') {
          // Check for invalid space after @
          if (i + 1 < code.length && code[i+1] === ' ') {
             // Emit error token for space after @
             if (currentSegment.length > 0) {
                tokenList.push({ 
                  line: startLine,
                  column: startColumn,
                  type: TOKEN_TYPES.STRING_LITERAL, 
                  lexeme: '"' + currentSegment + '"' 
                });
                currentSegment = '';
             }

             tokenList.push({
                line,
                column: column,
                type: TOKEN_TYPES.UNKNOWN,
                lexeme: '@ '
             });
             
             column += 2;
             i += 2;
             startLine = line;
             startColumn = column;
             continue;
          }

          if (currentSegment.length > 0) {
            tokenList.push({ 
              line: startLine,
              column: startColumn,
              type: TOKEN_TYPES.STRING_LITERAL, 
              lexeme: '"' + currentSegment + '"' 
            });
            currentSegment = '';
          }
          
          const interpolationColumn = column;
          let lexeme = '@';
          column++;
          let j = i + 1;
          
          if (j < code.length && (isLetter(code[j]) || code[j] === '_')) {
            while (
              j < code.length &&
              (isLetter(code[j]) || isDigit(code[j]) || code[j] === '_')
            ) {
              lexeme += code[j];
              column++;
              j++;
            }
          }
          
          tokenList.push({
            line,
            column: interpolationColumn,
            type: TOKEN_TYPES.SIS_MARKER,
            lexeme: lexeme
          });
          
          i = j;
          startLine = line;
          startColumn = column;
          continue;
        }

        if (code[i] === '\\' && i + 1 < code.length) {
          currentSegment += code[i] + code[i + 1];
          column += 2;
          i += 2;
          continue;
        }

        if (code[i] === '\n') {
          line++;
          column = 1;
        } else {
          column++;
        }

        currentSegment += code[i];
        i++;
      }

      if (currentSegment.length > 0) {
        tokenList.push({ 
          line: startLine,
          column: startColumn,
          type: TOKEN_TYPES.STRING_LITERAL, 
          lexeme: '"' + currentSegment + '"' 
        });
      } else {
         if (tokenList.length > 0 && tokenList[tokenList.length - 1].type === TOKEN_TYPES.SIS_MARKER) {
             tokenList.push({ 
                line: startLine,
                column: startColumn,
                type: TOKEN_TYPES.STRING_LITERAL, 
                lexeme: '""' 
             });
         } 
         else if (tokenList.length === 0 || (tokenList.length > 0 && tokenList[tokenList.length-1].lexeme !== '"' + currentSegment + '"')) {
             tokenList.push({ 
                line: startLine,
                column: startColumn,
                type: TOKEN_TYPES.STRING_LITERAL, 
                lexeme: '""' 
             });
         }
      }
      
      if (i < code.length && code[i] === '"') {
        column++;
        i++;
      }
      continue;
    }

    // Numbers (Integers & Decimals)
    // FIX: Strictly ensure that things starting with digits are numbers.
    if (
      /\d/.test(char) ||
      ((char === '+' || char === '-') && /\d/.test(code[i + 1])) ||
      (char === '.' && /\d/.test(code[i + 1]))
    ) {
      const startColumn = column;
      let num = '';
      let isDecimal = false;
      let hasExponent = false;

      if (char === '+' || char === '-') {
        num += char;
        column++;
        i++;
      }

      while (i < code.length) {
        const c = code[i];

        if (/\d/.test(c)) {
          num += c;
          column++;
          i++;
          continue;
        }

        if (c === '.' && !isDecimal && !hasExponent) {
          isDecimal = true;
          num += c;
          column++;
          i++;
          continue;
        }

        if ((c === 'e' || c === 'E') && !hasExponent) {
          hasExponent = true;
          num += c;
          column++;
          i++;
          if (code[i] === '+' || code[i] === '-') {
            num += code[i];
            column++;
            i++;
          }
          continue;
        }
        
        // FIX: Identifiers cannot start with digits.
        // If we hit a letter immediately after a number without space/op, 
        // it's an invalid token (e.g., "1stPlace").
        if (/[a-zA-Z_]/.test(c)) {
            // Consume the invalid characters to prevent them being parsed as a separate identifier
            while(i < code.length && /[a-zA-Z0-9_]/.test(code[i])) {
                num += code[i];
                column++;
                i++;
            }
            tokenList.push({
                line,
                column: startColumn,
                type: TOKEN_TYPES.UNKNOWN, // Or specific INVALID_IDENTIFIER type
                lexeme: num
            });
            // Break loop to continue main loop
            break; 
        }

        break;
      }

      // If we broke because of invalid identifier chars, we already pushed a token.
      if (tokenList.length > 0 && tokenList[tokenList.length-1].column === startColumn && tokenList[tokenList.length-1].type === TOKEN_TYPES.UNKNOWN) {
          continue;
      }

      tokenList.push({
        line,
        column: startColumn,
        type: (isDecimal || hasExponent) ? TOKEN_TYPES.DECIMAL_LITERAL : TOKEN_TYPES.NUMBER_LITERAL,
        lexeme: num
      });
      continue;
    }

    // Identifiers and Keywords
    if (/[a-zA-Z_]/.test(char)) {
      const startColumn = column;
      let word = '';
      while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) {
        word += code[i];
        column++;
        i++;
      }
      
      const lowerWord = word.toLowerCase();
      // Use existing map, default to IDENTIFIER
      let tokenType = KEYWORDS[lowerWord] || TOKEN_TYPES.IDENTIFIER;

      // FIX: Force built-in functions to be treated as Identifiers.
      if (['sum', 'median', 'mode', 'average', 'isEven', 'isOdd'].includes(lowerWord)) {
        tokenType = TOKEN_TYPES.IDENTIFIER;
      }
      
      tokenList.push({ line, column: startColumn, type: tokenType, lexeme: word });
      continue;
    }

    if (char === '@') {
      const startColumn = column;
      let lexeme = '@';
      column++;
      let j = i + 1;

      if (isLetter(code[j]) || code[j] === '_') {
        while (
          j < code.length &&
          (isLetter(code[j]) || isDigit(code[j]) || code[j] === '_')
        ) {
          lexeme += code[j];
          column++;
          j++;
        }
      }

      tokenList.push({
        line,
        column: startColumn,
        type: TOKEN_TYPES.SIS_MARKER,
        lexeme
      });

      i = j;
      continue;
    }
    
    // Group consecutive operator characters
    const operatorChars = "<>!=&|+-*/%^?";
    if (operatorChars.includes(char)) {
      const startColumn = column;
      let j = i;
      while (j < code.length && operatorChars.includes(code[j])) {
        column++;
        j++;
      }
      const run = code.slice(i, j);

      const singleOps = new Set(["<", ">", "=", "+", "-", "*", "/", "%", "^", "!", "?"]);
      const doubleOps = new Set([
        "<=", ">=", "==", "!=",
        "++", "--",
        "+=", "-=", "*=", "/=", "%=", "^=",
        "&&", "||",
        "//"
      ]);

      if (run.length === 1 && singleOps.has(run)) {
        const type =
          run === "=" ? TOKEN_TYPES.OP_ASSIGN :
          run === "<" ? TOKEN_TYPES.OP_LT :
          run === ">" ? TOKEN_TYPES.OP_GT :
          run === "!" ? TOKEN_TYPES.OP_NOT :
          run === "?" ? TOKEN_TYPES.UNKNOWN :
          TOKEN_TYPES.OP_ADD;
        tokenList.push({ line, column: startColumn, type, lexeme: run });
      } else if (run.length === 2 && doubleOps.has(run)) {
        const type =
          run === "<=" ? TOKEN_TYPES.OP_LTE :
          run === ">=" ? TOKEN_TYPES.OP_GTE :
          run === "==" ? TOKEN_TYPES.OP_EQ :
          run === "!=" ? TOKEN_TYPES.OP_NEQ :
          ["++", "--"].includes(run) ? TOKEN_TYPES.OP_INC :
          ["&&", "||"].includes(run) ? TOKEN_TYPES.OP_AND :
          run === "//" ? TOKEN_TYPES.OP_INT_DIV :
          TOKEN_TYPES.OP_ASSIGN;
        tokenList.push({ line, column: startColumn, type, lexeme: run });
      } else {
        tokenList.push({ 
          line,
          column: startColumn,
          type: TOKEN_TYPES.UNKNOWN, 
          lexeme: run
        });
      }

      i = j;
      continue;
    }

    const delimiters = {
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

    if (delimiters[char]) {
      tokenList.push({ line, column, type: delimiters[char], lexeme: char });
      column++;
      i++;
      continue;
    }

    // Explicitly handle Semicolon as UNKNOWN or SEMICOLON (if added to types)
    // To fix duplication, we can mark it as UNKNOWN here, parser will catch it.
    // Ideally, parser checks for ';'.
    if (char === ';') {
      tokenList.push({ 
        line,
        column,
        type: TOKEN_TYPES.UNKNOWN, 
        lexeme: char
      });
      column++;
      i++;
      continue;
    }

    if (char === '\\') {
      tokenList.push({ 
        line,
        column,
        type: TOKEN_TYPES.UNKNOWN, 
        lexeme: char
      });
      column++;
      i++;
      continue;
    }

    tokenList.push({ 
      line,
      column,
      type: TOKEN_TYPES.UNKNOWN, 
      lexeme: char
    });
    column++;
    i++;
  }

  return tokenList;
};