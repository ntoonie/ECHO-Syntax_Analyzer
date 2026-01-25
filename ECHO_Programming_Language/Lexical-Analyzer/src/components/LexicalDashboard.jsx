/**
 * =========================================
 * Title: Lexical Dashboard – Main Interface
 * =========================================
 */

import React, { useEffect } from 'react';
import { PlayCircle, Trash2, Sun, Moon, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '../assets/LOGO.svg';
import TextArea from './TextArea';
import TokensTable from './TokensTable';
import TokenLegend from './TokenLegend';
import { useWorkbench } from '../hooks/useDashboard';
import { useTheme } from '../hooks/useTheme';

const scrollbarStyleId = 'custom-vertical-scrollbar-styles';
const MotionH1 = motion.h1;
const MotionDiv = motion.div;

export default function ECHOWorkbench() {
  const {
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
  } = useWorkbench();

  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    // Webkit scrollbar pseudo-elements require global CSS injection.
    if (document.getElementById(scrollbarStyleId)) return;
    const style = document.createElement('style');
    style.id = scrollbarStyleId;
    style.textContent = `
      .custom-vertical-scrollbar,
      .custom-vertical-scrollbar textarea {
        overflow-y: auto !important;
      }
      .custom-vertical-scrollbar::-webkit-scrollbar,
      textarea.custom-vertical-scrollbar::-webkit-scrollbar {
        width: 12px;
        -webkit-appearance: none;
      }
      .custom-vertical-scrollbar::-webkit-scrollbar-track,
      textarea.custom-vertical-scrollbar::-webkit-scrollbar-track {
        background: rgba(148, 163, 184, 0.2);
        border-radius: 6px;
        margin: 4px;
      }
      .custom-vertical-scrollbar::-webkit-scrollbar-thumb,
      textarea.custom-vertical-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.5);
        border-radius: 6px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }
      .custom-vertical-scrollbar::-webkit-scrollbar-thumb:hover,
      textarea.custom-vertical-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(148, 163, 184, 0.7);
        background-clip: padding-box;
      }
      .dark .custom-vertical-scrollbar::-webkit-scrollbar-track,
      .dark textarea.custom-vertical-scrollbar::-webkit-scrollbar-track {
        background: rgba(71, 85, 105, 0.5);
        margin: 4px;
      }
      .dark .custom-vertical-scrollbar::-webkit-scrollbar-thumb,
      .dark textarea.custom-vertical-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(100, 116, 139, 0.6);
        border: 2px solid transparent;
        background-clip: padding-box;
      }
      .dark .custom-vertical-scrollbar::-webkit-scrollbar-thumb:hover,
      .dark textarea.custom-vertical-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(100, 116, 139, 0.8);
        background-clip: padding-box;
      }
      /* Firefox fallback for browsers without webkit scrollbar support. */
      .custom-vertical-scrollbar,
      textarea.custom-vertical-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgba(148, 163, 184, 0.5) rgba(148, 163, 184, 0.2);
      }
      .dark .custom-vertical-scrollbar,
      .dark textarea.custom-vertical-scrollbar {
        scrollbar-color: rgba(100, 116, 139, 0.6) rgba(71, 85, 105, 0.5);
      }
    `;
    document.head.appendChild(style);
    return () => {
      const existingStyle = document.getElementById(scrollbarStyleId);
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 p-6">
      <div className="w-full max-w-[1800px] mx-auto">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img src={logo} alt="E.C.H.O logo" role="img" className="w-20 h-20 object-contain" />
          <MotionH1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-black text-cyan-400 dark:text-cyan-300 leading-tight">
            ECHO Lexical Analyzer
          </MotionH1>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-10 text-lg">Executable Code, Human Output</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/30 dark:border-slate-700 flex flex-col h-[850px]"
          >
            <div className="flex justify-between items-center mb-4 flex-shrink-0 gap-1 min-w-0">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-700 dark:text-slate-200 flex-shrink truncate min-w-0">Source Code Editor</h2>
              <div className="flex items-center gap-1 flex-shrink-0 flex-nowrap ml-auto">
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer flex-shrink-0"
                >
                  {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />}
                </button>
                <button
                  onClick={loadSampleCode}
                  className="px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 bg-cyan-200 hover:bg-yellow-300 text-gray-700 rounded-md transition-colors text-[10px] sm:text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0"
                >
                  <span className="hidden sm:inline">Load Sample</span>
                  <span className="sm:hidden">Sample</span>
                </button>
                <button
                  onClick={loadComplexSample}
                  className="px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 bg-cyan-200 hover:bg-green-300 text-gray-700 rounded-md transition-colors text-[10px] sm:text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0"
                >
                  ECHO
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 bg-purple-200 hover:bg-purple-300 text-gray-700 rounded-md transition-colors text-[10px] sm:text-xs md:text-sm font-medium flex items-center gap-0.5 sm:gap-1 whitespace-nowrap flex-shrink-0"
                >
                  <Upload size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                  <span className="hidden md:inline">Upload</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt" style={{ display: 'none' }} />
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col min-w-0">
              <TextArea
                value={sourceCode}
                onChange={handleSourceCodeChange}
                textareaRef={textareaRef}
                onKeyDown={handleKeyDown}
                className="w-full h-full bg-transparent text-slate-900 dark:text-white font-mono text-sm leading-6 py-3 px-3 box-border rounded-md border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none custom-vertical-scrollbar"
              />
            </div>

            <div className="flex justify-between items-center mt-4 flex-shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex === 0}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 text-xs font-medium rounded transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  Undo
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 text-xs font-medium rounded transition-colors"
                  title="Redo (Ctrl+Y)"
                >
                  Redo
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAnalyze}
                  disabled={!sourceCode || analyzing}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors text-sm"
                >
                  <PlayCircle size={18} />
                  <span>{analyzing ? 'Analyzing...' : 'Analyze Code'}</span>
                </button>
                <button
                  onClick={handleClear}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors text-sm"
                >
                  <Trash2 size={18} />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/30 dark:border-slate-700 flex flex-col h-[850px]"
          >
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4 flex-shrink-0">Token Analysis</h2>
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-vertical-scrollbar">
                <div className="w-full">
                  <TokensTable tokens={tokens} />
                </div>
              </div>
            </div>
          </MotionDiv>
        </div>

        <TokenLegend />
      </div>
    </div>
  );
}
