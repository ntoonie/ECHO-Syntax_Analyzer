/**
 * =========================================
 * Title: Lexical Scanner – Core Tokenizer
 * =========================================
 */

import { TOKEN_TYPES, KEYWORDS } from './TokenTypes';

const isLetter = (c) => /[A-Za-z]/.test(c);
const isDigit = (c) => /[0-9]/.test(c);

export function lexicalAnalyzer(rawCode) {
  let code = rawCode || '';
  const tokenList = [];
  const delimiterStack = [];
  let line = 1;
  let i = 0;

  // Normalize problematic whitespace characters.
  code = code.replace(/\u00A0/g, ' ');
  code = code.replace(/[\u200B-\u200D\uFEFF]/g, '');

  while (i < code.length) {
    if (code[i] === '\r') {
      i++;
      continue;
    }

    const char = code[i];

    if (char === ' ' || char === '\t' || char === '\u00A0') {
      i++;
      continue;
    }

    if (char === '\n') {
      line++;
      i++;
      continue;
    }

    if (char === '/' && code[i + 1] === '/') {
      // Treat // as comment only when it starts a line segment.
      let prevNonWhitespace = null;
      let j = i - 1;
      while (j >= 0 && (code[j] === ' ' || code[j] === '\t')) {
        j--;
      }
      if (j >= 0 && code[j] !== '\n' && code[j] !== '\r') {
        prevNonWhitespace = code[j];
      }

      const isComment = prevNonWhitespace === null || prevNonWhitespace === '\n' || prevNonWhitespace === '\r';

      if (isComment) {
        let comment = '';
        i += 2;
        while (i < code.length && code[i] !== '\n') {
          comment += code[i];
          i++;
        }
        tokenList.push({ line, type: TOKEN_TYPES.COMMENT_SINGLE, lexeme: '//' + comment });
        continue;
      }
    }

    if (char === '/' && code[i + 1] === '*') {
      // Emit error token for unclosed block comments.
      let comment = '/*';
      const startLine = line;
      i += 2;
      while (i < code.length - 1 && !(code[i] === '*' && code[i + 1] === '/')) {
        if (code[i] === '\n') line++;
        comment += code[i];
        i++;
      }
      if (i < code.length - 1) {
        comment += '*/';
        i += 2;
        tokenList.push({ line: startLine, type: TOKEN_TYPES.COMMENT_MULTI, lexeme: comment });
      } else {
        tokenList.push({
          line: startLine,
          type: TOKEN_TYPES.ERROR,
          lexeme: comment,
          message: "Unterminated block comment: missing closing '*/'",
        });
        i = code.length;
      }
      continue;
    }

    if (char === '"') {
      // Strings can interleave literal text and @insertions.
      let currentSegment = '';
      let startLine = line;
      i++;
      let sawClosingQuote = false;
      let stringErrored = false;

      while (i < code.length && code[i] !== '"') {
        if (code[i] === '@') {
          if (currentSegment.length > 0) {
            tokenList.push({
              line: startLine,
              type: TOKEN_TYPES.STRING_LITERAL,
              lexeme: '"' + currentSegment + '"',
            });
            currentSegment = '';
            startLine = line;
          }

          let lexeme = '@';
          let j = i + 1;

          if (j < code.length && (isLetter(code[j]) || code[j] === '_')) {
            while (j < code.length && (isLetter(code[j]) || isDigit(code[j]) || code[j] === '_')) {
              lexeme += code[j];
              j++;
            }
          }

          tokenList.push({ line, type: TOKEN_TYPES.SIS_MARKER, lexeme });
          i = j;
          continue;
        }

        if (code[i] === '\\' && i + 1 < code.length) {
          currentSegment += code[i] + code[i + 1];
          i += 2;
          continue;
        }

        if (code[i] === '\n') {
          line++;
          tokenList.push({
            line: startLine,
            type: TOKEN_TYPES.ERROR,
            lexeme: currentSegment,
            message: 'Unterminated string literal: newline found before closing quote',
          });
          stringErrored = true;
          i++;
          break;
        }

        currentSegment += code[i];
        i++;
      }

      if (stringErrored) continue;

      if (i < code.length && code[i] === '"') {
        sawClosingQuote = true;
      }

      if (currentSegment.length > 0) {
        tokenList.push({ line: startLine, type: TOKEN_TYPES.STRING_LITERAL, lexeme: '"' + currentSegment + '"' });
      }

      if (sawClosingQuote) {
        i++;
      } else {
        tokenList.push({
          line: startLine,
          type: TOKEN_TYPES.ERROR,
          lexeme: currentSegment,
          message: 'Unterminated string literal: missing closing quote (")',
        });
      }
      continue;
    }

    if (/\d/.test(char) || ((char === '+' || char === '-') && /\d/.test(code[i + 1])) || (char === '.' && /\d/.test(code[i + 1]))) {
      // Supports signs, decimals, and scientific notation.
      let num = '';
      let isDecimal = false;
      let hasExponent = false;
      let invalidNumber = false;
      let digitsAfterDot = 0;
      let exponentDigits = 0;
      let afterDot = false;
      let inExponent = false;

      if (char === '+' || char === '-') {
        num += char;
        i++;
      }

      while (i < code.length) {
        const c = code[i];

        if (/\d/.test(c)) {
          num += c;
          if (inExponent) {
            exponentDigits++;
          } else if (afterDot) {
            digitsAfterDot++;
          }
          i++;
          continue;
        }

        if (c === '.' && !isDecimal && !hasExponent) {
          isDecimal = true;
          num += c;
          i++;
          afterDot = true;
          continue;
        }

        if ((c === 'e' || c === 'E') && !hasExponent) {
          hasExponent = true;
          num += c;
          i++;
          inExponent = true;
          afterDot = false;
          if (code[i] === '+' || code[i] === '-') {
            num += code[i];
            i++;
          }
          if (i >= code.length || !/\d/.test(code[i])) {
            invalidNumber = true;
            break;
          }
          continue;
        }
        break;
      }

      if (invalidNumber || (isDecimal && digitsAfterDot === 0) || (hasExponent && exponentDigits === 0)) {
        let errorMsg = 'Invalid number format';
        if (invalidNumber) {
          errorMsg = 'Invalid number: exponent must be followed by digits';
        } else if (isDecimal && digitsAfterDot === 0) {
          errorMsg = 'Invalid decimal: must have digits after decimal point';
        } else if (hasExponent && exponentDigits === 0) {
          errorMsg = 'Invalid number: exponent must have digits';
        }
        tokenList.push({ line, type: TOKEN_TYPES.ERROR, lexeme: num, message: errorMsg });
      } else {
        tokenList.push({
          line,
          type: isDecimal || hasExponent ? TOKEN_TYPES.DECIMAL_LITERAL : TOKEN_TYPES.NUMBER_LITERAL,
          lexeme: num,
        });
      }
      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      // Keywords are case-insensitive.
      let word = '';
      while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) {
        word += code[i];
        i++;
      }

      const lowerWord = word.toLowerCase();
      if (KEYWORDS[lowerWord]) {
        tokenList.push({ line, type: KEYWORDS[lowerWord], lexeme: word });
      } else {
        tokenList.push({ line, type: TOKEN_TYPES.IDENTIFIER, lexeme: word });
      }
      continue;
    }

    if (char === '@') {
      let lexeme = '@';
      let j = i + 1;
      if (j < code.length && (isLetter(code[j]) || code[j] === '_')) {
        while (j < code.length && (isLetter(code[j]) || isDigit(code[j]) || code[j] === '_')) {
          lexeme += code[j];
          j++;
        }
      }
      tokenList.push({ line, type: TOKEN_TYPES.SIS_MARKER, lexeme });
      i = j;
      continue;
    }

    if (char === '=') {
      // Distinguish assignment from equality and compound assignments
      if (code[i + 1] === '=') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_EQ, lexeme: '==' });
        i += 2;
      } else if (code[i + 1] === '+' && code[i + 2] === '=') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_ADD_ASSIGN, lexeme: '+=' });
        i += 3;
      } else if (code[i + 1] === '-' && code[i + 2] === '=') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_SUB_ASSIGN, lexeme: '-=' });
        i += 3;
      } else if (code[i + 1] === '*' && code[i + 2] === '=') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_MUL_ASSIGN, lexeme: '*=' });
        i += 3;
      } else if (code[i + 1] === '/' && code[i + 2] === '=') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_DIV_ASSIGN, lexeme: '/=' });
        i += 3;
      } else if (code[i + 1] === '%' && code[i + 2] === '=') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_MOD_ASSIGN, lexeme: '%=' });
        i += 3;
      } else {
        tokenList.push({ line, type: TOKEN_TYPES.OP_ASSIGN, lexeme: '=' });
        i++;
      }
      continue;
    }

    if ('+-*/%^'.includes(char)) {
      // Handle compound operators and special cases
      const nextChar = code[i + 1];
      const nextNextChar = code[i + 2];
      
      // Compound assignment operators (handled above, but also catch here)
      if (char === '+' && nextChar === '=' && nextNextChar !== '=') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_ADD_ASSIGN, lexeme: '+=' });
        i += 2;
        continue;
      }
      if (char === '-' && nextChar === '=' && nextNextChar !== '=') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_SUB_ASSIGN, lexeme: '-=' });
        i += 2;
        continue;
      }
      if (char === '*' && nextChar === '=' && nextNextChar !== '=') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_MUL_ASSIGN, lexeme: '*=' });
        i += 2;
        continue;
      }
      if (char === '/' && nextChar === '=' && nextNextChar !== '=') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_DIV_ASSIGN, lexeme: '/=' });
        i += 2;
        continue;
      }
      if (char === '%' && nextChar === '=' && nextNextChar !== '=') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_MOD_ASSIGN, lexeme: '%=' });
        i += 2;
        continue;
      }
      
      // Increment/Decrement operators
      if (char === '+' && nextChar === '+') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_INC, lexeme: '++' });
        i += 2;
        continue;
      }
      if (char === '-' && nextChar === '-') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_DEC, lexeme: '--' });
        i += 2;
        continue;
      }
      
      // Integer division operator
      if (char === '/' && nextChar === '/') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_INT_DIV, lexeme: '//' });
        i += 2;
        continue;
      }
      
      // Exponentiation operator
      if (char === '^') {
        tokenList.push({ line, type: TOKEN_TYPES.OP_EXP, lexeme: '^' });
        i++;
        continue;
      }
      
      // Basic arithmetic operators
      const arithmeticOps = {
        '+': TOKEN_TYPES.OP_ADD,
        '-': TOKEN_TYPES.OP_SUB,
        '*': TOKEN_TYPES.OP_MUL,
        '/': TOKEN_TYPES.OP_DIV,
        '%': TOKEN_TYPES.OP_MOD,
      };
      
      if (arithmeticOps[char]) {
        tokenList.push({ line, type: arithmeticOps[char], lexeme: char });
        i++;
        continue;
      }
    }

    if (char === '!' || char === '>' || char === '<') {
      let op = char;
      if (code[i + 1] === '=') {
        op += '=';
        i += 2;
      } else {
        i++;
      }
      
      // Map to correct token types
      const relationalOps = {
        '==': TOKEN_TYPES.OP_EQ,
        '!=': TOKEN_TYPES.OP_NEQ,
        '<': TOKEN_TYPES.OP_LT,
        '>': TOKEN_TYPES.OP_GT,
        '<=': TOKEN_TYPES.OP_LTE,
        '>=': TOKEN_TYPES.OP_GTE,
        '!': TOKEN_TYPES.OP_NOT,
      };
      
      tokenList.push({ line, type: relationalOps[op], lexeme: op });
      continue;
    }

    if (char === '&' && code[i + 1] === '&') {
      tokenList.push({ line, type: TOKEN_TYPES.OP_AND, lexeme: '&&' });
      i += 2;
      continue;
    }
    if (char === '|' && code[i + 1] === '|') {
      tokenList.push({ line, type: TOKEN_TYPES.OP_OR, lexeme: '||' });
      i += 2;
      continue;
    }

    const delimiterMap = {
      '(': TOKEN_TYPES.DEL_LPAREN,
      ')': TOKEN_TYPES.DEL_RPAREN,
      '[': TOKEN_TYPES.DEL_LBRACK,
      ']': TOKEN_TYPES.DEL_RBRACK,
      '{': TOKEN_TYPES.DEL_LBRACE,
      '}': TOKEN_TYPES.DEL_RBRACE,
      ':': TOKEN_TYPES.DEL_PERIOD, // Using DEL_PERIOD for colon temporarily
      ',': TOKEN_TYPES.DEL_COMMA,
      ';': TOKEN_TYPES.DEL_SEMICOLON,
    };

    if (delimiterMap[char]) {
      // Track opening delimiters for validation.
      const delimiterToken = delimiterMap[char];
      tokenList.push({ line, type: delimiterToken, lexeme: char });

      if (char === '(' || char === '[' || char === '{') {
        delimiterStack.push({ char, line });
      } else if (char === ')' || char === ']' || char === '}') {
        const lastDelimiter = delimiterStack.pop();
        const matchingPairs = { ')': '(', ']': '[', '}': '{' };
        if (!lastDelimiter || lastDelimiter.char !== matchingPairs[char]) {
          tokenList.push({
            line,
            type: TOKEN_TYPES.ERROR,
            lexeme: char,
            message: 'Unmatched delimiter: ' + char,
          });
        }
      }

      i++;
      continue;
    }

    if (char === '.') {
      tokenList.push({ line, type: TOKEN_TYPES.DELIMITER, lexeme: '.' });
      i++;
      continue;
    }

    tokenList.push({
      line,
      type: TOKEN_TYPES.UNKNOWN,
      lexeme: char,
      message: 'Unrecognized character: ' + char,
    });
    i++;
  }

  while (delimiterStack.length > 0) {
    // Unclosed delimiters become error tokens.
    const unclosed = delimiterStack.pop();
    tokenList.push({
      line: unclosed.line,
      type: TOKEN_TYPES.ERROR,
      lexeme: unclosed.char,
      message: 'Unclosed delimiter: ' + unclosed.char,
    });
  }

  return tokenList;
}
