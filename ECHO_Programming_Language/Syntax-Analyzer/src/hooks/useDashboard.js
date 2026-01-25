import { useState, useRef, useCallback } from 'react';
import { lexicalAnalyzer } from '../core/LexicalScanner';
import { syntaxAnalyzer } from '../core/SyntaxAnalysis';
import { TOKEN_TYPES } from '../../../shared/tokenTypes';
import { getSampleById } from '../data/codeSamples';

/*
Dashboard Hook

Manages state and event logic for the syntax analyzer dashboard.
Dependencies: React hooks, LexicalScanner, SyntaxAnalysis, tokenTypes, codeSamples
*/

/*
Dashboard hook for syntax analyzer state management

@returns {Object} Dashboard state and handler functions
*/
export const useDashboard = () => {
  const [sourceCode, setSourceCode] = useState('');
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [ast, setAst] = useState(null);
  const [astValid, setAstValid] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [history, setHistory] = useState([{ code: '', timestamp: Date.now() }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedErrorLine, setSelectedErrorLine] = useState(null);
  const [analysisMetrics, setAnalysisMetrics] = useState({
    totalTokens: 0,
    linesOfCode: 0,
    performanceTime: 0
  });
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
  
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  /*
  Add code to history for undo/redo functionality
  
  @param {String} code - Code to add to history
  */
  const addToHistory = useCallback((code) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ code, timestamp: Date.now() });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  /*
  Undo to previous code state
  */
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSourceCode(history[newIndex].code);
    }
  }, [history, historyIndex]);

  /*
  Redo to next code state
  */
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSourceCode(history[newIndex].code);
    }
  }, [history, historyIndex]);

  /*
  Handle source code changes with history tracking
  
  @param {String} newCode - New source code content
  */
  const handleSourceCodeChange = useCallback((newCode) => {
    setSourceCode(newCode);
    addToHistory(newCode);
  }, [addToHistory]);

  /*
  Handle error row click to navigate to error location
  
  @param {Number} line - Line number to highlight
  */
  const handleErrorClick = useCallback((line) => {
    setSelectedErrorLine(line);
  }, []);

  /*
  Copy code to clipboard with tooltip feedback
  */
  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sourceCode);
      setShowCopiedTooltip(true);
      setTimeout(() => setShowCopiedTooltip(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [sourceCode]);

  // Format code based on token indentation - True Pretty Printer
  const handleFormatCode = useCallback(() => {
    if (!sourceCode.trim()) return;
    
    const tokens = lexicalAnalyzer(sourceCode);
    let formattedCode = '';
    let depth = 0;
    const INDENT = '    ';  // 4 spaces per indent level
    
    let currentLine = [];
    let lastWasDeclaration = false;
    let lastWasBlockStarter = false;
    
    // Helper to get indentation
    const getIndent = (level) => INDENT.repeat(Math.max(0, level));
    
    // Helper to flush current line
    const flushLine = () => {
      if (currentLine.length > 0) {
        formattedCode += getIndent(depth) + currentLine.join('').trim() + '\n';
        currentLine = [];
      }
    };
    
    // Helper to add empty line
    const addEmptyLine = () => {
      formattedCode += '\n';
    };
    
    // Helper to determine if token is an operator
    const isOperator = (token) => {
      return token.type === 'OP_ARITH' || 
             token.type === 'OP_REL' || 
             token.type === 'OP_LOG' || 
             token.type === 'OP_ASGN' ||
             ['=', '==', '!=', '<', '>', '<=', '>=', '+', '-', '*', '/', '%', '&&', '||'].includes(token.lexeme);
    };
    
    // Helper to add token with proper spacing
    const addToken = (token, prevToken) => {
      let needsSpaceBefore = false;
      
      if (prevToken && currentLine.length > 0) {
        // Space before operators
        if (isOperator(token)) {
          needsSpaceBefore = true;
        }
        // Space after operators
        else if (isOperator(prevToken)) {
          needsSpaceBefore = true;
        }
        // Space after comma
        else if (prevToken.lexeme === ',') {
          needsSpaceBefore = true;
        }
        // Space between words/identifiers
        else if (!token.lexeme.match(/^[,;:)\]}]$/) && !prevToken.lexeme.match(/^[([{]$/)) {
          needsSpaceBefore = true;
        }
      }
      
      if (needsSpaceBefore) {
        currentLine.push(' ');
      }
      currentLine.push(token.lexeme);
    };
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const prevToken = i > 0 ? tokens[i - 1] : null;
      const nextToken = i < tokens.length - 1 ? tokens[i + 1] : null;
      const tokenLower = token.lexeme ? token.lexeme.toLowerCase() : '';
      
      // Skip comments for now (can be enhanced later)
      if (token.type === 'CMT_S' || token.type === 'CMT_M') {
        flushLine();
        formattedCode += getIndent(depth) + token.lexeme + '\n';
        continue;
      }
      
      // Handle 'end' keyword - check if it's compound (end if, end for, etc.)
      if (tokenLower === 'end') {
        const nextLower = nextToken ? nextToken.lexeme?.toLowerCase() : '';
        
        // Add empty line before 'end' if it closes main block
        if (!nextLower || !['if', 'for', 'while', 'function'].includes(nextLower)) {
          if (formattedCode.trim().length > 0 && !formattedCode.endsWith('\n\n')) {
            addEmptyLine();
          }
        }
        
        // Flush current line and decrease indent
        flushLine();
        depth = Math.max(0, depth - 1);
        
        // Add 'end' keyword
        currentLine.push(token.lexeme);
        
        // Check for compound end keyword (end if, end for, etc.)
        if (nextLower && ['if', 'for', 'while', 'function'].includes(nextLower)) {
          currentLine.push(' ');
          currentLine.push(nextToken.lexeme);
          i++;  // Skip next token
        }
        
        flushLine();
        lastWasBlockStarter = false;
        continue;
      }
      
      // Handle 'else' keyword
      if (tokenLower === 'else') {
        flushLine();
        depth = Math.max(0, depth - 1);
        currentLine.push(token.lexeme);
        flushLine();
        depth++;
        lastWasBlockStarter = true;
        continue;
      }
      
      // Handle 'start' keyword
      if (tokenLower === 'start') {
        addToken(token, prevToken);
        flushLine();
        depth++;
        lastWasBlockStarter = true;
        continue;
      }
      
      // Handle 'function' keyword - add empty line before
      if (tokenLower === 'function') {
        flushLine();
        if (formattedCode.trim().length > 0) {
          addEmptyLine();
        }
        addToken(token, prevToken);
        lastWasBlockStarter = true;
        continue;
      }
      
      // Handle 'for' keyword - add empty line before main loop
      if (tokenLower === 'for') {
        flushLine();
        // Check if this is a main for loop (not nested deeply)
        if (depth === 1 && formattedCode.trim().length > 0) {
          addEmptyLine();
        }
        addToken(token, prevToken);
        lastWasBlockStarter = true;
        continue;
      }
      
      // Handle 'if' and 'while' keywords
      if (tokenLower === 'if' || tokenLower === 'while') {
        flushLine();
        addToken(token, prevToken);
        lastWasBlockStarter = true;
        continue;
      }
      
      // Handle 'then' keyword - increase indent after
      if (tokenLower === 'then') {
        addToken(token, prevToken);
        flushLine();
        depth++;
        lastWasBlockStarter = false;
        continue;
      }
      
      // Handle data type keywords (declarations)
      if (['string', 'number', 'boolean', 'decimal'].includes(tokenLower)) {
        flushLine();
        addToken(token, prevToken);
        lastWasDeclaration = true;
        continue;
      }
      
      // Check if current line is a complete declaration (has assignment)
      if (lastWasDeclaration && token.type === 'OP_ASGN' && token.lexeme === '=') {
        addToken(token, prevToken);
        
        // Continue adding tokens until end of declaration
        let j = i + 1;
        while (j < tokens.length) {
          const nextTok = tokens[j];
          if (nextTok.type === 'CMT_S' || nextTok.type === 'CMT_M') break;
          
          // Check if we hit a new statement
          const nextLower = nextTok.lexeme?.toLowerCase();
          if (['string', 'number', 'boolean', 'decimal', 'echo', 'input', 'if', 'for', 'while', 'function', 'return'].includes(nextLower)) {
            break;
          }
          
          addToken(nextTok, tokens[j - 1]);
          j++;
        }
        
        flushLine();
        lastWasDeclaration = false;
        i = j - 1;  // Update main loop counter
        continue;
      }
      
      // Handle statement keywords (echo, return, input, etc.)
      if (['echo', 'return', 'input'].includes(tokenLower)) {
        flushLine();
        addToken(token, prevToken);
        
        // Continue adding rest of statement
        let j = i + 1;
        while (j < tokens.length) {
          const nextTok = tokens[j];
          if (nextTok.type === 'CMT_S' || nextTok.type === 'CMT_M') break;
          
          const nextLower = nextTok.lexeme?.toLowerCase();
          if (['string', 'number', 'boolean', 'decimal', 'echo', 'input', 'if', 'for', 'while', 'function', 'return', 'end'].includes(nextLower)) {
            break;
          }
          
          addToken(nextTok, tokens[j - 1]);
          j++;
        }
        
        flushLine();
        i = j - 1;
        continue;
      }
      
      // Handle block starters that increase indent
      if (lastWasBlockStarter && (tokenLower === 'function' || tokenLower === 'for' || tokenLower === 'while')) {
        // Already handled above
      } else {
        // Default: add token to current line
        addToken(token, prevToken);
      }
    }
    
    // Flush any remaining tokens
    flushLine();
    
    // Ensure file ends with newline
    if (!formattedCode.endsWith('\n')) {
      formattedCode += '\n';
    }
    
    handleSourceCodeChange(formattedCode);
  }, [sourceCode, handleSourceCodeChange]);

  // Export code as .echo file
  const handleExportFile = useCallback(() => {
    if (!sourceCode.trim()) return;
    
    const blob = new Blob([sourceCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'source.echo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [sourceCode]);

  // Perform lexical and syntax analysis on source code
  const handleAnalyze = useCallback(() => {
    setAnalyzing(true);
    setTimeout(() => {
      // Start performance measurement
      const startTime = performance.now();
      
      const tokens = lexicalAnalyzer(sourceCode);
      
      // Scanner now only tokenizes - all validation happens in syntax analyzer
      // Check for UNKNOWN tokens and report them
      const unknownTokenErrors = tokens
        .filter(token => token.type === TOKEN_TYPES.UNKNOWN)
        .map((token, index) => ({
          id: `lex-${index}`,
          line: token.line,
          column: token.column || 1,
          message: `Unknown or invalid token: '${token.lexeme}'`,
          category: 'General',
          severity: 'error'
        }));
      
      // Run syntax analyzer on all tokens (including unknown ones)
      const syntaxResult = syntaxAnalyzer(tokens);
      
      // End performance measurement
      const endTime = performance.now();
      const performanceTime = (endTime - startTime).toFixed(2);
      
      // Calculate metrics
      const totalTokens = tokens.length;
      const linesOfCode = tokens.length > 0 
        ? Math.max(...tokens.map(t => t.line || 0))
        : 0;
      
      // Update analysis metrics
      setAnalysisMetrics({
        totalTokens,
        linesOfCode,
        performanceTime: parseFloat(performanceTime)
      });
      
      // Combine all errors and sort by line number
      const allErrors = [...unknownTokenErrors, ...(syntaxResult.errors || [])];
      allErrors.sort((a, b) => a.line - b.line);
      
      setErrors(allErrors);
      setWarnings(syntaxResult.warnings || []);
      setAst(syntaxResult.ast);
      setAstValid(syntaxResult.astValid || false);
      setAnalyzing(false);
    }, 300);
  }, [sourceCode]);

  const handleClear = () => {
    handleSourceCodeChange('');
    setErrors([]);
    setWarnings([]);
    setAst(null);
    setAstValid(false);
    setHistory([{ code: '', timestamp: Date.now() }]);
    setHistoryIndex(0);
    setAnalysisMetrics({
      totalTokens: 0,
      linesOfCode: 0,
      performanceTime: 0
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          handleSourceCodeChange(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleKeyDown = (e) => {
    // Insert tab character instead of changing focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newText = sourceCode.substring(0, start) + '\t' + sourceCode.substring(end);
      handleSourceCodeChange(newText);
      
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = start + 1;
          textareaRef.current.selectionStart = newPosition;
          textareaRef.current.selectionEnd = newPosition;
        }
      }, 0);
      return;
    }
    
    // Handle Ctrl+Z (undo) and Ctrl+Y/Ctrl+Shift+Z (redo)
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
        return;
      }
    }
  };

  // Load a sample by ID and automatically trigger analysis
  const loadSample = useCallback((sampleId) => {
    const sample = getSampleById(sampleId);
    if (!sample) {
      console.error(`Sample with id "${sampleId}" not found`);
      return;
    }
    
    // Load the sample content
    handleSourceCodeChange(sample.content);
    
    // Automatically trigger analysis after a brief delay to ensure state updates
    setTimeout(() => {
      handleAnalyze();
    }, 100);
  }, [handleSourceCodeChange, handleAnalyze]);

  return {
    sourceCode,
    errors,
    warnings,
    ast,
    astValid,
    analyzing,
    history,
    historyIndex,
    textareaRef,
    fileInputRef,
    selectedErrorLine,
    analysisMetrics,
    showCopiedTooltip,
    handleSourceCodeChange,
    handleAnalyze,
    handleClear,
    handleFileUpload,
    handleKeyDown,
    handleUndo,
    handleRedo,
    handleErrorClick,
    handleCopyToClipboard,
    handleFormatCode,
    handleExportFile,
    loadSample
  };
};
