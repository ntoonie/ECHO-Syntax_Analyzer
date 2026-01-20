// A tokenizer that implements Python-like NEWLINE + INDENT/DEDENT behavior.
// Usage: tokenizeWithIndent(sourceCode, keywordsMap)
// - keywordsMap: object mapping lowercased keyword -> token type string (e.g. { start: 'KEYWORD_PROGRAM', number: 'KEYWORD_DATATYPE', ... })
// Returns an array of tokens: { line, type, lexeme }
const TAB_SIZE = 8;

function computeIndentColumns(slice) {
  let cols = 0;
  for (let ch of slice) {
    if (ch === '\t') cols += TAB_SIZE;
    else cols += 1;
  }
  return cols;
}

function isDigit(c) { return /[0-9]/.test(c); }
function isAlpha(c) { return /[A-Za-z_]/.test(c); }
function isAlphaNum(c) { return /[A-Za-z0-9_]/.test(c); }

export default function tokenizeWithIndent(input, keywordsMap = {}) {
  const tokens = [];
  const len = input.length;
  let i = 0;
  let line = 1;

  const indentStack = [0];
  let parenDepth = 0;

  const push = (t) => tokens.push({ ...t, line });

  while (i < len) {
    const ch = input[i];

    // Track parentheses depth for implicit line-joining
    if (ch === '(' || ch === '[' || ch === '{') {
      parenDepth++;
      push({ type: 'LPAREN', lexeme: ch });
      i++;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      parenDepth = Math.max(0, parenDepth - 1);
      push({ type: ch === ')' ? 'RPAREN' : ch === ']' ? 'RBRACKET' : 'RBRACE', lexeme: ch });
      i++;
      continue;
    }

    // Strings (double quoted) - keep internal newlines counted in line number
    if (ch === '"') {
      const start = i;
      i++; // skip opening quote
      while (i < len) {
        if (input[i] === '\\') { i += 2; continue; }
        if (input[i] === '"') { i++; break; }
        if (input[i] === '\n') line++;
        i++;
      }
      push({ type: 'STRING_LITERAL', lexeme: input.slice(start, i) });
      continue;
    }

    // Single-line comment //
    if (ch === '/' && input[i + 1] === '/') {
      const start = i;
      i += 2;
      while (i < len && input[i] !== '\n') i++;
      push({ type: 'COMMENT_SINGLE', lexeme: input.slice(start, i) });
      continue;
    }

    // Multi-line comment /* ... */
    if (ch === '/' && input[i + 1] === '*') {
      const startLine = line;
      const start = i;
      i += 2;
      while (i < len && !(input[i] === '*' && input[i + 1] === '/')) {
        if (input[i] === '\n') line++;
        i++;
      }
      if (i < len) i += 2;
      push({ type: 'COMMENT_MULTI', lexeme: input.slice(start, i), line: startLine });
      continue;
    }

    // At physical line start: handle indentation
    const atLineStart = (i === 0) || input[i - 1] === '\n';
    if (atLineStart) {
      let j = i;
      while (j < len && (input[j] === ' ' || input[j] === '\t')) j++;

      // Blank line => consume newline and emit NL (optional) or skip
      if (j < len && input[j] === '\n') {
        i = j + 1;
        line++;
        // emit NL for UI/debugging; parser typically ignores NL
        push({ type: 'NL', lexeme: '\\n' });
        continue;
      }

      // Comment-only line: treat like blank
      if (j < len && input[j] === '/' && input[j + 1] === '/') {
        let k = j;
        while (k < len && input[k] !== '\n') k++;
        const commentLex = input.slice(i, k);
        i = k + (k < len && input[k] === '\n' ? 1 : 0);
        if (k < len && input[k] === '\n') line++;
        push({ type: 'NL', lexeme: commentLex });
        continue;
      }

      const indentSlice = input.slice(i, j);
      const indentCols = computeIndentColumns(indentSlice);

      // Only adjust indent when not inside parentheses
      if (parenDepth === 0) {
        const top = indentStack[indentStack.length - 1];
        if (indentCols > top) {
          indentStack.push(indentCols);
          push({ type: 'INDENT', lexeme: '' });
        } else if (indentCols < top) {
          while (indentStack.length > 1 && indentCols < indentStack[indentStack.length - 1]) {
            indentStack.pop();
            push({ type: 'DEDENT', lexeme: '' });
          }
          if (indentStack[indentStack.length - 1] !== indentCols) {
            // Indentation error; emit an UNKNOWN or throw
            push({ type: 'UNKNOWN', lexeme: '<IndentationError>' });
          }
        }
      }

      i = j; // move to first non-space on line
    }

    // Newline handling: consider implicit continuation rules (parenDepth or backslash)
    if (ch === '\n') {
      // check if previous non-space char on same line is backslash
      let k = i - 1;
      while (k >= 0 && input[k] === ' ') k--;
      const suppressed = (input[k] === '\\') || (parenDepth > 0);
      i++; // consume newline
      if (!suppressed) {
        push({ type: 'NEWLINE', lexeme: '\\n' });
      } else {
        push({ type: 'NL', lexeme: '\\n' });
      }
      line++;
      continue;
    }

    // Spaces and tabs inside a line: skip (or emit DELIMITER if you want)
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      const start = i;
      while (i < len && (input[i] === ' ' || input[i] === '\t' || input[i] === '\r')) i++;
      // optional: push({ type: 'WHITESPACE', lexeme: input.slice(start, i) });
      continue;
    }

    // Numbers
    if (isDigit(ch) || ((ch === '+' || ch === '-') && isDigit(input[i+1])) || (ch === '.' && isDigit(input[i+1]))) {
      let start = i;
      if (ch === '+' || ch === '-') i++;
      while (i < len && isDigit(input[i])) i++;
      let isDecimal = false;
      if (input[i] === '.' && isDigit(input[i+1])) {
        isDecimal = true;
        i++;
        while (i < len && isDigit(input[i])) i++;
      }
      // exponent
      if ((input[i] === 'e' || input[i] === 'E') && isDigit(input[i+1])) {
        i++;
        if (input[i] === '+' || input[i] === '-') i++;
        while (i < len && isDigit(input[i])) i++;
        isDecimal = true;
      }
      push({ type: isDecimal ? 'DECIMAL_LITERAL' : 'NUMBER_LITERAL', lexeme: input.slice(start, i) });
      continue;
    }

    // Identifiers / keywords
    if (isAlpha(ch)) {
      const start = i;
      i++;
      while (i < len && isAlphaNum(input[i])) i++;
      const lex = input.slice(start, i);
      const lower = lex.toLowerCase();
      const kwType = keywordsMap && keywordsMap[lower] ? keywordsMap[lower] : null;
      if (kwType) push({ type: kwType, lexeme: lex });
      else push({ type: 'IDENTIFIER', lexeme: lex });
      continue;
    }

    // String insertion symbol @ (outside of string)
    if (ch === '@') {
      let lex = '@';
      let j = i + 1;
      if (j < len && (isAlpha(input[j]) || input[j] === '_')) {
        while (j < len && (isAlphaNum(input[j]) || input[j] === '_')) { lex += input[j]; j++; }
      }
      push({ type: 'STRING_INSERTION', lexeme: lex });
      i = j;
      continue;
    }

    // Two-char operators
    const two = input.substr(i, 2);
    if (two === '==' || two === '!=' || two === '>=' || two === '<=') {
      push({ type: 'RELATIONAL_OP', lexeme: two });
      i += 2;
      continue;
    }
    if (two === '||' || two === '&&') {
      push({ type: 'LOGICAL_OP', lexeme: two });
      i += 2;
      continue;
    }
    if (two === '++' || two === '--') {
      push({ type: 'UNARY_OP', lexeme: two });
      i += 2;
      continue;
    }
    if ((two === '+=' || two === '-=' || two === '*=' || two === '/=' || two === '%=') ) {
      push({ type: 'ASSIGNMENT_OP', lexeme: two });
      i += 2;
      continue;
    }

    // Single-char tokens
    const singleMap = {
      '+': 'ARITHMETIC_OP', '-': 'ARITHMETIC_OP', '*': 'ARITHMETIC_OP', '/': 'ARITHMETIC_OP',
      '=': 'ASSIGNMENT_OP', ',': 'COMMA', ':': 'COLON', '(': 'LPAREN', ')': 'RPAREN',
      '[': 'LBRACKET', ']': 'RBRACKET', '{': 'LBRACE', '}': 'RBRACE', '@': 'AT',
      '>': 'RELATIONAL_OP', '<': 'RELATIONAL_OP', '!': 'UNARY_OP', ';': 'SEMICOLON'
    };
    if (singleMap[ch]) {
      push({ type: singleMap[ch], lexeme: ch });
      i++;
      continue;
    }

    // Fallback
    push({ type: 'UNKNOWN', lexeme: ch });
    i++;
  }

  // EOF: ensure logical newline and emit dedents
  if (tokens.length === 0 || tokens[tokens.length - 1].type !== 'NEWLINE') {
    push({ type: 'NEWLINE', lexeme: '\\n' });
  }
  while (indentStack.length > 1) {
    indentStack.pop();
    push({ type: 'DEDENT', lexeme: '' });
  }
  push({ type: 'EOF', lexeme: '<EOF>' });
  return tokens;
}

