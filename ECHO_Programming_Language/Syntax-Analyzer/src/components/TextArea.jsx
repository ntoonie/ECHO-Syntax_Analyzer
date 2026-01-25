/*
Line-Numbered Textarea – Code Input

Enhanced textarea component with line numbers and error indicators for code input.
Depends on React, lucide-react icons.
*/

import React, { useEffect, useRef, useState, useMemo, memo } from "react";
import { AlertCircle, Copy, Download, X } from "lucide-react";

/*
Line-Numbered Textarea Component

@param {String} value - Textarea content
@param {Function} onChange - Change handler
@param {Object} textareaRef - Textarea ref
@param {String} className - CSS classes
@param {Function} onKeyDown - Key down handler
@param {Array} errors - Array of error objects
@param {Number} highlightedLine - Line to highlight
@param {Function} onCopy - Copy handler
@param {Function} onClear - Clear handler
@param {Function} onExport - Export handler
@param {Boolean} showCopiedTooltip - Show copied tooltip
*/
const LineNumberedTextarea = memo(function LineNumberedTextarea({
  value = "",
  onChange = () => {},
  textareaRef,
  className = "",
  onKeyDown,
  errors = [],
  highlightedLine = null,
  onCopy,
  onClear,
  onExport,
  showCopiedTooltip = false,
}) {
  const internalTextareaRef = useRef(null);
  const gutterRef = useRef(null);
  const highlightOverlayRef = useRef(null);
  const [lines, setLines] = useState(1);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    const count = value === "" ? 1 : value.split("\n").length;
    setLines(count);
  }, [value]);

  // Create error lines map for O(1) lookup
  const errorLinesSet = useMemo(() => {
    const set = new Set();
    errors.forEach(error => set.add(error.line));
    return set;
  }, [errors]);

  // Scroll to highlighted line and trigger flash animation
  useEffect(() => {
    if (highlightedLine !== null && internalTextareaRef.current) {
      const textarea = internalTextareaRef.current;
      const lineHeight = 24; // 1.5rem * 16px
      const targetScrollTop = (highlightedLine - 1) * lineHeight - (textarea.clientHeight / 2) + (lineHeight / 2);
      
      textarea.scrollTop = Math.max(0, targetScrollTop);
      
      // Trigger flash animation
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [highlightedLine]);

/*
Handle scroll synchronization between textarea and line numbers

@param {Event} e - Scroll event
*/
const handleScroll = (e) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
    if (highlightOverlayRef.current) {
      highlightOverlayRef.current.scrollTop = e.target.scrollTop;
    }
  };

  useEffect(() => {
    if (!textareaRef) return;
    if (typeof textareaRef === "function") {
      textareaRef(internalTextareaRef.current);
    } else {
      textareaRef.current = internalTextareaRef.current;
    }
  }, [textareaRef]);

/*
Handle textarea value change

@param {Event} e - Change event
*/
const handleChange = (e) => onChange(e.target.value);
  const lineNumbers = Array.from({ length: lines }, (_, i) => i + 1);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-md border border-slate-700 bg-transparent box-border">
      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Line numbers with error indicators */}
        <div
          ref={gutterRef}
          className="select-none bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-mono text-sm leading-6 py-3 px-2 overflow-hidden box-border relative z-10"
          style={{ width: 60 }}
          aria-hidden
        >
          <div className="flex flex-col">
            {lineNumbers.map((n) => (
              <div 
                key={n} 
                className="h-6 leading-6 flex items-center justify-between px-1 relative"
              >
                {errorLinesSet.has(n) && (
                  <AlertCircle 
                    size={14} 
                    className="text-red-500 dark:text-red-400 absolute left-0" 
                    title={`Error on line ${n}`}
                  />
                )}
                <span className={errorLinesSet.has(n) ? "ml-4" : "ml-auto"}>
                  {n}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Highlight overlay */}
        <div
          ref={highlightOverlayRef}
          className="absolute top-0 left-[60px] right-0 bottom-0 pointer-events-none overflow-hidden z-0"
          aria-hidden
        >
          <div className="relative" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
            {highlightedLine !== null && lineNumbers.map((n) => (
              <div
                key={n}
                className={`h-6 leading-6 transition-all duration-300 ${
                  n === highlightedLine
                    ? isFlashing
                      ? 'bg-yellow-200/70 dark:bg-yellow-500/30'
                      : 'bg-yellow-100/50 dark:bg-yellow-500/20'
                    : ''
                }`}
                style={{
                  animation: n === highlightedLine && isFlashing 
                    ? 'pulse 0.5s ease-in-out 2' 
                    : 'none'
                }}
              />
            ))}
          </div>
        </div>

        <textarea
          ref={internalTextareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          className={
            "flex-1 resize-none bg-transparent text-slate-900 dark:text-white font-mono text-sm leading-6 py-3 px-3 outline-none focus:outline-none box-border relative z-10 " +
            className
          }
          style={{
            minHeight: 0,
            lineHeight: "1.5rem",
            tabSize: 4,
          }}
        />
      </div>

      {/* Developer Utility Toolbar */}
      <div className="border-t border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 flex items-center justify-end gap-2 flex-shrink-0">
        <button
          onClick={onClear}
          disabled={!value.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:dark:bg-slate-700 disabled:cursor-not-allowed text-white transition-colors"
          title="Clear text box"
        >
          <X size={14} />
          <span>Clear</span>
        </button>

        <button
          onClick={onCopy}
          disabled={!value.trim()}
          className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-teal-600 hover:bg-teal-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:bg-slate-300 disabled:dark:bg-slate-700 disabled:cursor-not-allowed text-white transition-colors"
          title="Copy to Clipboard"
        >
          <Copy size={14} />
          <span>Copy</span>
          {showCopiedTooltip && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-green-600 text-white text-xs rounded shadow-lg whitespace-nowrap animate-fade-in">
              Copied!
            </div>
          )}
        </button>

        <button
          onClick={onExport}
          disabled={!value.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:dark:bg-slate-700 disabled:cursor-not-allowed text-white transition-colors"
          title="Export as .echo file"
        >
          <Download size={14} />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
});

export default LineNumberedTextarea;
