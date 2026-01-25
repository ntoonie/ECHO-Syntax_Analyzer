/**
 * =========================================
 * Title: Text Area – Line-Numbered Editor
 * =========================================
 */

import React, { useEffect, useRef, useState } from "react";

export default function TextArea({
  value = "",
  onChange = () => {},
  textareaRef,
  className = "",
  onKeyDown,
}) {
  const internalTextareaRef = useRef(null);
  const gutterRef = useRef(null);
  const [lines, setLines] = useState(1);

  useEffect(() => {
    const count = value === "" ? 1 : value.split("\n").length;
    setLines(count);
  }, [value]);

  // Synchronize gutter scroll with textarea.
  const handleScroll = (e) => {
    if (gutterRef.current) gutterRef.current.scrollTop = e.target.scrollTop;
  };

  useEffect(() => {
    // Forward internal ref to parent.
    if (!textareaRef) return;
    if (typeof textareaRef === "function") {
      textareaRef(internalTextareaRef.current);
    } else {
      textareaRef.current = internalTextareaRef.current;
    }
  }, [textareaRef]);

  const handleChange = (e) => onChange(e.target.value);
  const lineNumbers = Array.from({ length: lines }, (_, i) => i + 1);

  return (
    <div className="w-full h-full flex overflow-hidden rounded-md border border-slate-700 bg-transparent box-border">
      <div
        ref={gutterRef}
        className="select-none bg-transparent text-slate-400 font-mono text-sm leading-6 py-3 px-3 overflow-hidden box-border"
        style={{ width: 56 }}
        aria-hidden
      >
        <div className="flex flex-col">
          {lineNumbers.map((n) => (
            <div key={n} className="h-6 leading-6 flex items-center justify-end">
              {n}
            </div>
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
          "flex-1 resize-none bg-transparent text-slate-900 dark:text-white font-mono text-sm leading-6 py-3 px-3 outline-none focus:outline-none box-border " +
          className
        }
        style={{
          minHeight: 0,
          lineHeight: "1.5rem",
          tabSize: 4,
        }}
      />
    </div>
  );
}
