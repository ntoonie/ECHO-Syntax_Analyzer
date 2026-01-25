/**
 * =========================================
 * Title: Dashboard Hook – Editor State Manager
 * =========================================
 */

import { useCallback, useRef, useState } from 'react';
import { lexicalAnalyzer } from '../core/LexicalScanner';

export function useWorkbench() {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const [sourceCode, setSourceCode] = useState('');
  const [tokens, setTokens] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedSample, setUploadedSample] = useState('');
  const [history, setHistory] = useState([{ code: '', timestamp: Date.now() }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const addToHistory = useCallback((code) => {
    // Truncate future history when creating new branch.
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ code, timestamp: Date.now() });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleSourceCodeChange = useCallback((newCode) => {
    setSourceCode(newCode);
    addToHistory(newCode);
  }, [addToHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSourceCode(history[newIndex].code);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSourceCode(history[newIndex].code);
    }
  }, [history, historyIndex]);

  const handleAnalyze = useCallback(() => {
    // Brief delay ensures loading state renders before tokenization.
    setAnalyzing(true);
    setTimeout(() => {
      const result = lexicalAnalyzer(sourceCode);
      setTokens(result);
      setAnalyzing(false);
    }, 300);
  }, [sourceCode]);

  const handleClear = useCallback(() => {
    handleSourceCodeChange('');
    setTokens([]);
    setUploadedSample('');
    setHistory([{ code: '', timestamp: Date.now() }]);
    setHistoryIndex(0);
  }, [handleSourceCodeChange]);

  const handleKeyDown = useCallback((e) => {
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

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    }
  }, [sourceCode, handleSourceCodeChange, handleUndo, handleRedo]);

  const loadSampleCode = useCallback(() => {
    if (uploadedSample) {
      handleSourceCodeChange(uploadedSample);
      return;
    }

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
    handleSourceCodeChange(sample);
  }, [uploadedSample, handleSourceCodeChange]);

  const loadComplexSample = useCallback(() => {
    if (uploadedSample) {
      handleSourceCodeChange(uploadedSample);
      return;
    }

    const complexSample = `START

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
    handleSourceCodeChange(complexSample);
  }, [uploadedSample, handleSourceCodeChange]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        handleSourceCodeChange(content);
        setUploadedSample(content);
      }
    };
    reader.readAsText(file);
  }, [handleSourceCodeChange]);

  return {
    sourceCode,
    tokens,
    analyzing,
    history,
    historyIndex,
    textareaRef,
    fileInputRef,
    handleSourceCodeChange,
    handleAnalyze,
    handleClear,
    handleUndo,
    handleRedo,
    handleKeyDown,
    loadSampleCode,
    loadComplexSample,
    handleFileUpload,
  };
}
