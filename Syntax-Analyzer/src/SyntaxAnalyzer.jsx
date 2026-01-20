import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { Trash2, Sun, Moon, Upload } from 'lucide-react';
import logo from "./assets/LOGO.svg";
import { parseTokenStream, indentAst } from './utils/parser';

const SyntaxAnalyzer = () => {
  const [sourceCode, setSourceCode] = useState('');
  const [errors, setErrors] = useState([]);
  const [ast, setAst] = useState('');
  const [uploadedSample, setUploadedSample] = useState('');
  const [activeTab, setActiveTab] = useState('ast');
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const handleThemeToggle = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDarkMode(prev => !prev);
  }, []);

  const handleClear = useCallback(() => {
    setSourceCode('');
    setErrors([]);
    setAst('');
    setUploadedSample(null);
  }, []);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          setSourceCode(content);
          setUploadedSample(content);
          try {
            const result = parseTokenStream(content);
            const parsedErrors = result.errors && result.errors.length > 0 ? result.errors.map(e => ({ message: e })) : [];
            setAst(indentAst(result.ast) || 'No AST generated');
            setErrors(parsedErrors);
            setActiveTab(parsedErrors.length > 0 ? 'errors' : 'ast');
          } catch (err) {
            setErrors([{ message: err.message || 'Unknown error during parsing' }]);
            setAst('');
            setActiveTab('errors');
          }
        }
      };
      reader.readAsText(file);
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newText = sourceCode.substring(0, start) + '\t' + sourceCode.substring(end);
      setSourceCode(newText);
      
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = start + 1;
          textareaRef.current.selectionStart = newPosition;
          textareaRef.current.selectionEnd = newPosition;
        }
      }, 0);
    }
  }, [sourceCode]);

  const getTokenTypeColor = useCallback((type) => {
    const colors = {
      KW_P: 'bg-indigo-100 text-indigo-800',
      KW_T: 'bg-blue-100 text-blue-800',
    };
    return colors[type] || 'text-gray-700 bg-gray-50';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 p-6 flex justify-center items-start">
      <button 
        type="button"
        onClick={handleThemeToggle}
        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        className="fixed right-6 top-6 p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer z-50"
      >
        {isDarkMode ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-slate-700" />
        )}
      </button>
      <div className="w-full max-w-7xl">
         <div className="flex items-center justify-center gap-3 mb-2">
          <img
            src={logo}
            alt="E.C.H.O logo"
            role="img"
            className="w-20 h-20 sm:w-20 sm:h-20 object-contain"
          />
        <h1 className="text-5xl font-black text-cyan-400 dark:text-cyan-300 leading-tight">
          ECHO Syntax Analyzer
        </h1>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-10 text-lg">
          Executable Code, Human Output
        </p>

        <div className="grid grid-cols-1 gap-6 items-stretch">
          <div
            className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/30 dark:border-slate-700 flex flex-col"
          >
            <div className="flex justify-between items-end border-b border-slate-300 dark:border-slate-600">
              <div className="flex gap-1">
                <div
                  onClick={() => setActiveTab('ast')}
                  className={`px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${
                    activeTab === 'ast'
                      ? 'bg-white dark:bg-slate-800 text-cyan-400 border-t-2 border-x border-cyan-400 rounded-t-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 border-t border-x border-slate-300 dark:border-slate-600 rounded-t-md'
                  }`}
                >
                  Abstract Syntax Tree
                </div>
                <div
                  onClick={() => setActiveTab('errors')}
                  className={`px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${
                    activeTab === 'errors'
                      ? 'bg-white dark:bg-slate-800 text-cyan-400 border-t-2 border-x border-cyan-400 rounded-t-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 border-t border-x border-slate-300 dark:border-slate-600 rounded-t-md'
                  }`}
                >
                  Error Console
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current.click()}
                className="px-3 py-2 mb-2 bg-purple-200 hover:bg-purple-300 text-gray-700 rounded-md transition-colors text-xs sm:text-sm font-medium flex items-center gap-1"
              >
                <Upload size={14} />
                Upload File
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".echo"
                style={{ display: 'none' }}
              />
            </div>

            <div className="flex-1">
              <div className="h-[600px] bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-600 p-4 font-mono overflow-auto leading-relaxed text-lg">
                {activeTab === 'errors' && (
                  <div className="text-slate-900 dark:text-slate-50">
                    {errors.length === 0 ? (
                      <span className="text-green-500">No Errors!</span>
                    ) : (
                      errors.map((error, i) => (
                        <div key={i} className="py-1 text-red-500">
                          <span className="font-semibold">Error:</span> {error.message}
                        </div>
                      ))
                    )}
                  </div>
                )}
                {activeTab === 'ast' && (
                 <div className="text-slate-900 dark:text-slate-50 whitespace-pre-wrap">
                    {ast || <span className="text-gray-500"></span>}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleClear}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors text-sm"
              >
                <Trash2 size={16} />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyntaxAnalyzer;