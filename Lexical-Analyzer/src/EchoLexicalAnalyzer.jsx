import React, { useState, useRef, useLayoutEffect } from 'react';
import { PlayCircle, Trash2, FileText, Sun, Moon, Upload, Download } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import logo from "../src/LOGO.svg";
import TextArea from './TextArea';


// ================================================
// E.C.H.O Programming Language Lexical Analyzer
// ================================================

const LexicalAnalyzerTemplate = () => {
  const [sourceCode, setSourceCode] = useState('');         // User's input source code
  const [tokens, setTokens] = useState([]);                 // Tokenized result from analysis
  const [analyzing, setAnalyzing] = useState(false);        // Loading state during analysis
  const [uploadedSample, setUploadedSample] = useState(''); // Uploaded sample code
  const textareaRef = useRef(null);                         // Reference to textarea for cursor control
  const fileInputRef = useRef(null);                        // Reference to file input for uploa

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    const shouldBeDark = savedTheme === 'dark';
    
    const root = window.document.documentElement;
    if (shouldBeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    return shouldBeDark;
  });

  useLayoutEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    void html.offsetHeight;
  }, [isDarkMode]);

  const handleThemeToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newMode = !isDarkMode;
    const html = document.documentElement;
    if (newMode) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      console.log('Dark mode enabled - class added:', html.classList.contains('dark'));
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      console.log('Light mode enabled - class removed:', html.classList.contains('dark'));
    }
    void html.offsetHeight;
    // Update state
    setIsDarkMode(newMode);
  };

  // ========================================
  // Token Types for E.C.H.O Language
  // ========================================

  const TOKEN_TYPES = {
    // Keywords (compact)
    KEYWORD_PROGRAM: 'KW_P',
    KEYWORD_DATATYPE: 'KW_T',
    KEYWORD_LOOP: 'KW_L',
    KEYWORD_CONDITIONAL: 'KW_C',
    KEYWORD_RESERVED: 'KW_R',
    KEYWORD_START: 'KW_START',
    KEYWORD_END: 'KW_END',
    NOISE_WORD: 'NW',
    
    // Identifiers and Literals
    IDENTIFIER: 'ID',
    NUMBER_LITERAL: 'NUM',
    DECIMAL_LITERAL: 'DEC',
    STRING_LITERAL: 'STR',
    BOOLEAN_LITERAL: 'BOOL',
    
    // Operators
    ASSIGNMENT_OP: 'OP_ASG',
    ARITHMETIC_OP: 'OP_AR',
    UNARY_OP: 'OP_UN',
    LOGICAL_OP: 'OP_LOG',
    RELATIONAL_OP: 'OP_REL',
    
    // Delimiters
    DELIMITER_LEFT_PAREN: 'DEL_LPAR',
    DELIMITER_RIGHT_PAREN: 'DEL_RPAR',
    DELIMITER_LEFT_BRACKET: 'DEL_LBRACK',
    DELIMITER_RIGHT_BRACKET: 'DEL_RBRACK',
    DELIMITER_LEFT_BRACE: 'DEL_LBRACE',
    DELIMITER_RIGHT_BRACE: 'DEL_RBRACE',
    DELIMITER_COLON: 'DEL_COL',
    DELIMITER_COMMA: 'DEL_COMMA',
    DELIMITER_SEMICOLON: 'DEL_SEMI',
    DELIMITER: 'DEL', // fallback for any other delimiters
    
    // Special & diagnostics
    STRING_INSERTION: 'SIS',
    COMMENT_SINGLE: 'CMT',
    COMMENT_MULTI: 'CMT',
    UNKNOWN: 'UNK',
    ERROR: 'ERR',
  };

  // ========================================
  // E.C.H.O Language Keywords
  // ========================================

  const KEYWORDS = {
    // Program keywords
    function: TOKEN_TYPES.KEYWORD_PROGRAM,
    start: TOKEN_TYPES.KEYWORD_START,
    end: TOKEN_TYPES.KEYWORD_END,
    echo: TOKEN_TYPES.KEYWORD_PROGRAM,
    input: TOKEN_TYPES.KEYWORD_PROGRAM,
    return: TOKEN_TYPES.KEYWORD_RESERVED,
    struct: TOKEN_TYPES.KEYWORD_RESERVED,
    
    // Data types
    number: TOKEN_TYPES.KEYWORD_DATATYPE,
    decimal: TOKEN_TYPES.KEYWORD_DATATYPE,
    string: TOKEN_TYPES.KEYWORD_DATATYPE,
    boolean: TOKEN_TYPES.KEYWORD_DATATYPE,
    list: TOKEN_TYPES.KEYWORD_DATATYPE,
    
    // Loop keywords
    for: TOKEN_TYPES.KEYWORD_LOOP,
    while: TOKEN_TYPES.KEYWORD_LOOP,
    do: TOKEN_TYPES.KEYWORD_LOOP,
    
    // Conditional keywords
    if: TOKEN_TYPES.KEYWORD_CONDITIONAL,
    else: TOKEN_TYPES.KEYWORD_CONDITIONAL,
    elseif: TOKEN_TYPES.KEYWORD_CONDITIONAL,
    then: TOKEN_TYPES.KEYWORD_CONDITIONAL,
    switch: TOKEN_TYPES.KEYWORD_CONDITIONAL,
    case: TOKEN_TYPES.KEYWORD_CONDITIONAL,
    default: TOKEN_TYPES.KEYWORD_CONDITIONAL,
    
    // Reserved words
    null: TOKEN_TYPES.KEYWORD_RESERVED,
    true: TOKEN_TYPES.BOOLEAN_LITERAL,
    false: TOKEN_TYPES.BOOLEAN_LITERAL,
    continue: TOKEN_TYPES.KEYWORD_RESERVED,
    break: TOKEN_TYPES.KEYWORD_RESERVED,
    new: TOKEN_TYPES.KEYWORD_RESERVED,
    this: TOKEN_TYPES.KEYWORD_RESERVED,
    
    // Noise words
    with: TOKEN_TYPES.NOISE_WORD,
    to: TOKEN_TYPES.NOISE_WORD,
    by: TOKEN_TYPES.NOISE_WORD
  };

  // ========================================
  // E.C.H.O Lexical Analysis Logic
  // ========================================
  const isLetter = (c) => /[A-Za-z]/.test(c);
  const isDigit = (c) => /[0-9]/.test(c);

   const lexicalAnalyzer = (rawCode) => {
    let code = rawCode || '';
    const tokenList = [];  // Accumulator for recognized tokens
    const delimiterStack = []; // Track opening delimiters for mismatch detection
    let line = 1;          // Current line number (starts at 1)
    let i = 0;             // Current position in source code string
    
    code = code.replace(/\u00A0/g, ' ');
    code = code.replace(/[\u200B-\u200D\uFEFF]/g, '');

    while (i < code.length) {
      // Handle Windows line endings (\r\n) - skip the \r
      if (code[i] === '\r') {
        i++;
        continue;
      }

      const char = code[i];

      // Ignore invisible whitespace characters for tokenization (but track lines)
      if (char === ' ' || char === '\t' || char === '\u00A0') {
        i++;
        continue;
      }
      if (char === '\n') {
        line++;
        i++;
        continue;
      }
      // =======================================
      // Single-line comment detection: //
      // =======================================
      // Comments extend until the end of the line

      if (char === '/' && code[i + 1] === '/') {
        let comment = '';
        i += 2;
        while (i < code.length && code[i] !== '\n') {
          comment += code[i];
          i++;
        }
        tokenList.push({ line, type: TOKEN_TYPES.COMMENT_SINGLE, lexeme: '//' + comment });
        continue;
      }

      // =======================================
      // Multi-line comment detection: /* */
      // =======================================
      // Comments can span multiple lines until closing */

      if (char === '/' && code[i + 1] === '*') {
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
            lexeme: 'Unterminated block comment'
          });
          i = code.length;
        }
        continue;
      }

      // ========================================
      // String literal detection: "text"
      // ========================================
      // Strings can contain escape sequences and embedded variable references

      if (char === '"') {
        let currentSegment = '';
        let startLine = line;
        i++;
        let sawClosingQuote = false;
        let stringErrored = false;
        
        // Process string contents until closing quote is found
        while (i < code.length && code[i] !== '"') {
          // When @ is encountered, split the string into segments
          if (code[i] === '@') {
            // If we have accumulated text before the @, save it as a string literal
            if (currentSegment.length > 0) {
              tokenList.push({ 
                line: startLine, 
                type: TOKEN_TYPES.STRING_LITERAL, 
                lexeme: '"' + currentSegment + '"' 
              });
              currentSegment = '';
              startLine = line;
            }
            
            // Build the string insertion token (e.g., @variableName)
            let lexeme = '@';
            let j = i + 1;
            
            // Collect identifier characters following the @ symbol
            if (j < code.length && (isLetter(code[j]) || code[j] === '_')) {
              while (
                j < code.length &&
                (isLetter(code[j]) || isDigit(code[j]) || code[j] === '_')
              ) {
                lexeme += code[j];
                j++;
              }
            }
            
            // Create token for the string insertion
            tokenList.push({
              line: line,
              type: TOKEN_TYPES.STRING_INSERTION,
              lexeme: lexeme
            });
            
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
              lexeme: 'Unterminated string literal'
            });
            stringErrored = true;
            i++; // consume newline to avoid infinite loop
            break;
          }

          currentSegment += code[i];
          i++;
        }
        
        if (stringErrored) {
          continue;
        }

        if (i < code.length && code[i] === '"') {
          sawClosingQuote = true;
        }

        // Save any remaining string segment after the last @ or if no @ was found
        if (currentSegment.length > 0) {
          tokenList.push({ 
            line: startLine, 
            type: TOKEN_TYPES.STRING_LITERAL, 
            lexeme: '"' + currentSegment + '"' 
          });
        }
        
        // Skip the closing quote if present; otherwise mark an unterminated string error
        if (sawClosingQuote) {
          i++;
        } else {
          tokenList.push({
            line: startLine,
            type: TOKEN_TYPES.ERROR,
            lexeme: 'Unterminated string literal'
          });
        }
        continue;
      }

      // ====================================================
      // Number literal detection: integers and decimals
      // ====================================================
      // Supports: 123, -45, +67, 3.14, -2.5

      if (
        /\d/.test(char) ||                                              // Starts with digit
        ((char === '+' || char === '-') && /\d/.test(code[i + 1])) ||   // Signed number
        (char === '.' && /\d/.test(code[i + 1]))                        // Decimal starting with .
      ) {
        let num = '';
        let isDecimal = false;
        let hasExponent = false;
        let invalidNumber = false;
        let digitsAfterDot = 0;
        let exponentDigits = 0;
        let afterDot = false;
        let inExponent = false;

        // Handle optional sign prefix (+ or -)
        if (char === '+' || char === '-') {
          num += char;
          i++;
        }

        // Collect number digits, decimal point, and exponent
        while (i < code.length) {
          const c = code[i];

          // Accumulate digits
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

          // Handle decimal point (only one allowed, before exponent)
          if (c === '.' && !isDecimal && !hasExponent) {
            isDecimal = true;
            num += c;
            i++;
            afterDot = true;
            continue;
          }

          // Handle scientific notation (e or E)
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

        if (
          invalidNumber ||
          (isDecimal && digitsAfterDot === 0) ||              // trailing dot like 123.
          (hasExponent && exponentDigits === 0)               // no digits after e/E
        ) {
          tokenList.push({
            line,
            type: TOKEN_TYPES.ERROR,
            lexeme: num
          });
        } else {
          // Determine token type: decimal if it has . or e/E, otherwise integer
          tokenList.push({
            line,
            type: (isDecimal || hasExponent) ? TOKEN_TYPES.DECIMAL_LITERAL : TOKEN_TYPES.NUMBER_LITERAL,
            lexeme: num
          });
        }
        continue;
      }

      // ===================================
      // Identifier and keyword detection
      // ===================================
      // Identifiers start with letter or underscore, followed by letters, digits, or underscores

      if (/[a-zA-Z_]/.test(char)) {
        let word = '';
        // Collect all valid identifier characters
        while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) {
          word += code[i];
          i++;
        }
        // Check if word is a keyword (case-insensitive matching)
        const lowerWord = word.toLowerCase();
        const tokenType = KEYWORDS[lowerWord] || TOKEN_TYPES.IDENTIFIER;
        
        tokenList.push({ line, type: tokenType, lexeme: word });
        continue;
      }

      // ================================================
      // String insertion symbol (@)
      // ================================================
      // Handles cases like: @variable outside of string literals
      if (char === '@') {
        let lexeme = '@';
        let j = i + 1;

        // Collect identifier characters following @
        if (isLetter(code[j]) || code[j] === '_') {
          while (
            j < code.length &&
            (isLetter(code[j]) || isDigit(code[j]) || code[j] === '_')
          ) {
            lexeme += code[j];
            j++;
          }
        }

        tokenList.push({
          line,
          type: TOKEN_TYPES.STRING_INSERTION,
          lexeme
        });

        i = j;
        continue;
      }
      
      // ======================
      // Operator detection (whitespace-delimited). Any contiguous operator run must be a known operator; otherwise it's a single ERR.
      const operatorChars = "<>!=&|+-*/%^";
      if (operatorChars.includes(char)) {
        let j = i;
        while (j < code.length && operatorChars.includes(code[j])) {
          j++;
        }
        const run = code.slice(i, j);

        const singleOps = new Set(["<", ">", "=", "+", "-", "*", "/", "%", "^", "!"]);
        const doubleOps = new Set([
          "<=", ">=", "==", "!=",
          "++", "--",
          "+=", "-=", "*=", "/=", "%=", "^=",
          "&&", "||"
        ]);

        if (run.length === 1 && singleOps.has(run)) {
          const type =
            run === "=" ? TOKEN_TYPES.ASSIGNMENT_OP :
            (run === "<" || run === ">") ? TOKEN_TYPES.RELATIONAL_OP :
            run === "!" ? TOKEN_TYPES.LOGICAL_OP :
            TOKEN_TYPES.ARITHMETIC_OP;
          tokenList.push({ line, type, lexeme: run });
        } else if (run.length === 2 && doubleOps.has(run)) {
          const type =
            ["<=", ">=", "==", "!="].includes(run) ? TOKEN_TYPES.RELATIONAL_OP :
            ["++", "--"].includes(run) ? TOKEN_TYPES.UNARY_OP :
            ["&&", "||"].includes(run) ? TOKEN_TYPES.LOGICAL_OP :
            TOKEN_TYPES.ASSIGNMENT_OP;
          tokenList.push({ line, type, lexeme: run });
        } else {
          tokenList.push({ line, type: TOKEN_TYPES.ERROR, lexeme: run });
        }

        i = j;
        continue;
      }

      // Delimiters
      const openerDelimiters = {
        '(': TOKEN_TYPES.DELIMITER_LEFT_PAREN,
        '[': TOKEN_TYPES.DELIMITER_LEFT_BRACKET,
        '{': TOKEN_TYPES.DELIMITER_LEFT_BRACE,
      };
      const closerDelimiters = {
        ')': { token: TOKEN_TYPES.DELIMITER_RIGHT_PAREN, match: '(' },
        ']': { token: TOKEN_TYPES.DELIMITER_RIGHT_BRACKET, match: '[' },
        '}': { token: TOKEN_TYPES.DELIMITER_RIGHT_BRACE, match: '{' },
      };
      const simpleDelimiters = {
        ',': TOKEN_TYPES.DELIMITER_COMMA,
        ':': TOKEN_TYPES.DELIMITER_COLON,
        ';': TOKEN_TYPES.DELIMITER_SEMICOLON,
      };

      if (openerDelimiters[char]) {
        tokenList.push({ line, type: openerDelimiters[char], lexeme: char });
        delimiterStack.push({ char, line });
        i++;
        continue;
      }

      if (closerDelimiters[char]) {
        tokenList.push({ line, type: closerDelimiters[char].token, lexeme: char });
        const expected = closerDelimiters[char].match;
        const last = delimiterStack.pop();
        if (!last || last.char !== expected) {
          tokenList.push({
            line,
            type: TOKEN_TYPES.ERROR,
            lexeme: `Unmatched ${char}`
          });
        }
        i++;
        continue;
      }

      if (simpleDelimiters[char]) {
        tokenList.push({ line, type: simpleDelimiters[char], lexeme: char });
        i++;
        continue;
      }

      // If we reach here, it's an unknown/unrecognized character
      tokenList.push({ line, type: TOKEN_TYPES.UNKNOWN, lexeme: char });
      i++;
    }
    // Any remaining unclosed delimiters -> errors
    while (delimiterStack.length > 0) {
      const unmatched = delimiterStack.pop();
      tokenList.push({
        line: unmatched.line,
        type: TOKEN_TYPES.ERROR,
        lexeme: `Unmatched ${unmatched.char}`
      });
    }

    return tokenList;
  };

  // ========================================
  // Helper Functions
  // ========================================
  
  // Loads a sample E.C.H.O program into the source code textarea
  const loadSampleCode = () => {
    if (uploadedSample) {
      setSourceCode(uploadedSample);
    } else {
      const sample = `start
number x = 10
decimal y = 20.5
string name = "Alice"
boolean flag = true

if x > 5
\techo "x is greater than 5"
end if

for i = 1 to 10
\techo "Count: @i"
end for

function number add(number a, number b)
\treturn a + b
end function

echo "Result: @x"
end`;
      setSourceCode(sample);
    }
  };

const loadComplexSample = () => {
    if (uploadedSample) {
      setSourceCode(uploadedSample);
    } else {
      const complexSample = 
`START

struct CustomerRecord :
 Name: string (capitalizeName),
 Age: integer (validateAge),
 ZipCode: string (validateZipCode)

// Bound Functions

function validateAge(value)
\tif value >= 18 then
\t\treturn true
\telse
\t\terror("Age must be 18 or older.") 
\t\treturn false 
\tend if
end function

function capitalizeName(value)
\treturn capitalizeEachWord(value) 
end function

function validateZipCode(value)
\tif length(value) == 5 then
\t\treturn true
\telse
\t\terror("ZipCode must be 5 digits.") 
\t\treturn false
\tend if
end function

// Scenario 1: Successful creation and transformation

// Input Name is lowercase ("jane doe")
myCustomer = CustomerRecord new:
\tName: "jane doe",
\tAge: 25,
\tZipCode: "90210"

echo "Transformed Name in Object: @myCustomer.Name" // Output: Jane Doe
echo "Age: @myCustomer.Age"
echo "ZipCode: @myCustomer.ZipCode"

// Scenario 2: Failed validation (Age < 18)

// This operation would typically trigger a runtime error in ECHO

youngCustomer = CustomerRecord new:
\tName: "Billy",
\tAge: 16,  // Fails validateAge
\tZipCode: "12345"

echo "Object creation status: FAILED"

END`;
      setSourceCode(complexSample);
    }
  };

  // Token type to color mapping for UI display
  const getTokenTypeColor = (type) => {
    const colors = {
      KW_P: 'bg-indigo-100 text-indigo-800',
      KW_T: 'bg-blue-100 text-blue-800',
      KW_L: 'bg-indigo-200 text-indigo-800',
      KW_C: 'bg-indigo-300 text-indigo-900',
      KW_R: 'bg-indigo-50 text-indigo-700',
      KW_START: 'bg-indigo-500 text-indigo-50',
      KW_END: 'bg-indigo-500 text-indigo-50',
      NW: 'bg-lime-50 text-lime-700',
      ID: 'bg-green-100 text-green-800',
      NUM: 'bg-amber-100 text-amber-800',
      DEC: 'bg-amber-200 text-amber-900',
      STR: 'bg-amber-300 text-amber-900',
      BOOL: 'bg-amber-50 text-amber-700',
      OP_ASG: 'bg-teal-600 text-teal-50',
      OP_AR: 'bg-teal-100 text-teal-800',
      OP_UN: 'bg-teal-200 text-teal-800',
      OP_LOG: 'bg-teal-300 text-teal-900',
      OP_REL: 'bg-teal-400 text-teal-900',
      CMT: 'bg-emerald-50 text-emerald-700',
      SIS: 'text-yellow-700 bg-yellow-50',
      DEL: 'bg-slate-100 text-slate-700',
      DEL_LPAR: 'bg-slate-100 text-slate-700',
      DEL_RPAR: 'bg-slate-100 text-slate-700',
      DEL_LBRACK: 'bg-slate-100 text-slate-700',
      DEL_RBRACK: 'bg-slate-100 text-slate-700',
      DEL_LBRACE: 'bg-slate-100 text-slate-700',
      DEL_RBRACE: 'bg-slate-100 text-slate-700',
      DEL_COL: 'bg-slate-100 text-slate-700',
      DEL_COMMA: 'bg-slate-100 text-slate-700',
      DEL_SEMI: 'bg-slate-100 text-slate-700',
      UNK: 'bg-red-100 text-red-800',
      ERR: 'bg-red-600 text-red-50',
    };
    return colors[type] || 'text-gray-700 bg-gray-50';
  };

  // ========================================
  // Event Handlers
  // ========================================

  // Initiates lexical analysis on the current source code
  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const result = lexicalAnalyzer(sourceCode);
      setTokens(result);
      setAnalyzing(false);
    }, 300);
  };

  // Clears the source code input and token results
  const handleClear = () => {
    setSourceCode('');
    setTokens([]);
    setUploadedSample(null);
  };

  // Exports tokens as a .echo file with token stream format
  const handleExportTokens = () => {
    if (tokens.length === 0) return;

    // Generate JSON array with type + lexeme (and line for completeness)
    const payload = tokens.map(({ type, lexeme, line }) => ({ type, lexeme, line }));
    const content = JSON.stringify(payload, null, 2);

    // Create blob and download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'token_stream_with_lexemes.echo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handles file upload and loads the file content into source code
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          setSourceCode(content);
          setUploadedSample(content);
        }
      };
      reader.readAsText(file);
    }
  };

  // Handles Tab key press in textarea to insert tab character
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();  // Prevent default tab behavior (focus change)
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Insert tab character at cursor position
      const newText = sourceCode.substring(0, start) + '\t' + sourceCode.substring(end);
      setSourceCode(newText);
      
      // Restore cursor position after state update
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = start + 1;
          textareaRef.current.selectionStart = newPosition;
          textareaRef.current.selectionEnd = newPosition;
        }
      }, 0);
    }
  };

  // ========================================
  // UI Components
  // ========================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 p-6 flex justify-center items-start">
      <div className="w-full max-w-7xl">
         <div className="flex items-center justify-center gap-3 mb-2">
          <img
            src={logo}
            alt="E.C.H.O logo"
            role="img"
            className="w-20 h-20 sm:w-20 sm:h-20 object-contain"
          />
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
         className="text-5xl font-black text-cyan-400 dark:text-cyan-300 leading-tight"
        >
          ECHO Lexical Analyzer
        </motion.h1>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-10 text-lg">
          Executable Code, Human Output
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/30 dark:border-slate-700 flex flex-col"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
                Source Code Input
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={handleThemeToggle}
                  aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-slate-700" />
                  )}
                </button>
                <button
                  onClick={loadSampleCode}
                  className="px-3 py-2 sm:px-4 bg-cyan-200 hover:bg-yellow-300 text-gray-700 rounded-md transition-colors text-xs sm:text-sm font-medium"
                >
                  Load Sample
                </button>
                <button
                  onClick={loadComplexSample}
                  className="px-3 py-2 sm:px-4 bg-cyan-200 hover:bg-green-300 text-gray-700 rounded-md transition-colors text-xs sm:text-sm font-medium"
                >
                  ECHO Code
                </button>
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="px-3 py-2 sm:px-4 bg-purple-200 hover:bg-purple-300 text-gray-700 rounded-md transition-colors text-xs sm:text-sm font-medium flex items-center gap-1"
                >
                  <Upload size={14} />
                  Upload File
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt"
                  style={{ display: 'none' }}
                />
              </div>
            </div>

              <div className="mb-4 h-[510px] min-w-0">
            <TextArea
              value={sourceCode}
              onChange={setSourceCode}
              textareaRef={textareaRef}
              onKeyDown={handleKeyDown}
              className={"w-full h-full bg-transparent text-slate-900 dark:text-white font-mono text-sm leading-6 " +
                            "py-3 px-3 box-border rounded-md border border-blue-300 " +
                              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
             }
           />
        </div>

            <div className="flex justify-between mt-4">
              <button
                onClick={handleAnalyze}
                disabled={!sourceCode || analyzing}
                className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors text-sm sm:text-base"
              >
                <PlayCircle size={18} className="sm:w-5 sm:h-5" />
                <span>{analyzing ? "Analyzing..." : "Analyze Code"}</span>
              </button>

              <button
                onClick={handleClear}
                className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors text-sm sm:text-base"
              >
                <Trash2 size={18} className="sm:w-5 sm:h-5" />
                <span>Clear</span>
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/30 dark:border-slate-700 flex flex-col"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
                Token Analysis Results
              </h2>
              <button
                onClick={handleExportTokens}
                disabled={tokens.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors text-sm"
              >
                <Download size={16} />
                <span>Export</span>
              </button>
            </div>

             <div className="h-[500px] sm:h-[520px] overflow-auto rounded-xl bg-transparent text-slate-900 dark:text-slate-50 p-4 font-mono text-sm border border-slate-700 shadow-inner">
              {tokens.length === 0 ? (
                <div className="min-h-[200px] flex items-center justify-center text-gray-400">
                  <div className="text-center px-4">
                    <FileText size={48} className="sm:w-16 sm:h-16 md:w-16 md:h-16 mx-auto mb-3 sm:mb-4 opacity-30" />
                    <p className="text-base sm:text-lg text-gray-500 mb-2">No tokens to display</p>
                    <p className="text-xs sm:text-sm text-gray-400">Enter code and click "Analyze Code"</p>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-md bg-transparent h-full overflow-auto">
                  <table className="w-full text-xs sm:text-sm min-w-[600px] text-left">
                    <thead className="bg-white/60 dark:bg-slate-900/70 sticky top-0 z-10 backdrop-blur">
                      <tr>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 font-semibold text-slate-800 dark:text-gray-200 border-b border-slate-300 dark:border-gray-700 whitespace-nowrap">Line No.</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 font-semibold text-slate-800 dark:text-gray-200 border-b border-slate-300 dark:border-gray-700 whitespace-nowrap">Token Type</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 font-semibold text-slate-800 dark:text-gray-200 border-b border-slate-300 dark:border-gray-700">Lexeme</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.map((token, index) => (
                        <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <td className="px-2 sm:px-3 md:px-4 py-2 text-slate-800 dark:text-gray-300 font-mono whitespace-nowrap">{token.line}</td>
                          <td className="px-2 sm:px-3 md:px-4 py-2">
                            <span className={`px-2 py-1 sm:px-3 rounded-md text-xs font-semibold inline-block ${getTokenTypeColor(token.type)}`}>
                              {token.type}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 font-mono text-slate-900 dark:text-gray-200 break-words break-all">{token.lexeme}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>

          <div className="col-span-2 flex justify-center">
            <div className="mt-6 w-full max-w-full bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-lg shadow-md border border-white/30 dark:border-slate-700">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-200 mb-3 sm:mb-4 text-center">Token Type Legend</h3>
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                {[
                  { type: 'KW_START', label: 'Start Keyword (KW_START)' },
                  { type: 'KW_END', label: 'End Keyword (KW_END)' },
                  { type: 'KW_P', label: 'Program Keywords (KW_P)' },
                  { type: 'KW_L', label: 'Loop Keywords (KW_L)' },
                  { type: 'KW_C', label: 'Conditionals (KW_C)' },
                  { type: 'KW_R', label: 'Reserved Words (KW_R)' },
                  { type: 'KW_T', label: 'Data Types (KW_T)' },
                  { type: 'ID', label: 'Identifiers (ID)' },
                  { type: 'NUM', label: 'Numbers (NUM)' },
                  { type: 'DEC', label: 'Decimals (DEC)' },
                  { type: 'STR', label: 'Strings (STR)' },
                  { type: 'BOOL', label: 'Booleans (BOOL)' },
                  { type: 'OP_AR', label: 'Arithmetic Operators (OP_AR)' },
                  { type: 'OP_ASG', label: 'Assignment Operators (OP_ASG)' },
                  { type: 'OP_LOG', label: 'Logical Operators (OP_LOG)' },
                  { type: 'OP_REL', label: 'Relational Operators (OP_REL)' },
                  { type: 'OP_UN', label: 'Unary Operators (OP_UN)' },
                  { type: 'DEL_COMMA', label: 'Delimiter Comma , (DEL_COMMA)' },
                  { type: 'DEL_COL', label: 'Delimiter Colon : (DEL_COL)' },
                  { type: 'DEL_LPAR', label: 'Delimiter Left Parenthesis (DEL_LPAR)' },
                  { type: 'DEL_RPAR', label: 'Delimiter Right Parenthesis (DEL_RPAR)' },
                  { type: 'DEL_LBRACK', label: 'Delimiter Left Bracket [ (DEL_LBRACK)' },
                  { type: 'DEL_RBRACK', label: 'Delimiter Right Bracket ] (DEL_RBRACK)' },
                  { type: 'DEL_LBRACE', label: 'Delimiter Left Brace { (DEL_LBRACE)' },
                  { type: 'DEL_RBRACE', label: 'Delimiter Right Brace } (DEL_RBRACE)' },
                  { type: 'DEL_SEMI', label: 'Delimiter Semicolon ; (DEL_SEMI)' },
                  { type: 'DEL', label: 'Other Delimiters (DEL)' },
                  { type: 'CMT', label: 'Comments //, /* */ (CMT)' },
                  { type: 'SIS', label: 'String Insertion (@) (SIS)' },
                  { type: 'NW', label: 'Noise Words (NW)' },
                  { type: 'UNK', label: 'Unknown (UNK)' },
                  { type: 'ERR', label: 'Error Tokens (ERR)' }
                ].map((item) => (
                  <span
                    key={item.type}
                    className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold ${getTokenTypeColor(item.type)}`}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LexicalAnalyzerTemplate;