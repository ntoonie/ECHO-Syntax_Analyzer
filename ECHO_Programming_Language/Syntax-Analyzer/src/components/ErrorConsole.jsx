import React, { memo } from 'react';
import { FileText, CheckCircle2, AlertTriangle, Info, XCircle, AlertCircle } from 'lucide-react';

/*
Error Console – Enhanced Syntax Error Display

Provides comprehensive error reporting with grammar-specific messages and error categorization.
Depends on React, lucide-react icons.
*/

/*
Error Console Component

@param {Array} errors - Array of error objects
@param {Array} warnings - Array of warning objects
@param {Function} onErrorClick - Error click handler
@param {Object} metrics - Analysis metrics
@param {Boolean} astValid - AST validity flag
*/
const ErrorConsole = memo(function ErrorConsole({ errors, warnings, onErrorClick, metrics}) {
  const hasMetrics = metrics && (metrics.totalTokens > 0 || metrics.linesOfCode > 0);
  const hasIssues = errors.length > 0 || warnings.length > 0;

  return (
    <div className="w-full p-4 flex justify-center items-start">
      {/* Success State */}
          {!hasIssues ? (
        <div className="w-full flex flex-col items-center justify-center text-gray-400 min-h-[400px]">
          {/* Success Badge */}
          {hasMetrics && (
            <div className="mb-6 px-6 py-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-600 rounded-xl flex items-center gap-3 shadow-lg">
              <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-green-700 dark:text-green-300">
                  Syntax Validated
                </span>
                <span className="text-sm text-green-600 dark:text-green-400">
                  Your code complies with ECHO language grammar rules!
                </span>
              </div>
            </div>
          )}
          
          {/* Empty state when no analysis yet */}
          {!hasMetrics && (
            <div className="text-center px-4">
              <FileText size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-base text-gray-500 dark:text-gray-400 mb-2 font-semibold">
                No analysis performed yet
              </p>
              <p className="text-sm text-gray-400">Click "Analyze Code" to begin</p>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full border border-red-300 dark:border-red-700 rounded-lg bg-white/50 dark:bg-slate-900/50 shadow-sm overflow-hidden">
          {/* Error Header */}
          <div className="bg-red-100 dark:bg-red-900/40 px-4 py-3 border-b-2 border-red-300 dark:border-red-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-red-800 dark:text-red-200">
                Syntax Issues ({errors.length} errors, {warnings.length} warnings)
              </h3>
            </div>
          </div>
          
          {/* Error List */}
          <div className="overflow-x-auto custom-vertical-scrollbar">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-red-50/80 dark:bg-red-900/30 sticky top-0 z-10 backdrop-blur border-b-2 border-red-300 dark:border-red-700">
                <tr>
                  <th className="px-4 py-4 font-semibold text-red-900 dark:text-red-200 text-center border-r border-red-200 dark:border-red-700 whitespace-nowrap w-20">
                    Line
                  </th>
                  <th className="px-4 py-4 font-semibold text-red-900 dark:text-red-200 text-center border-r border-red-200 dark:border-red-700 whitespace-nowrap w-24">
                    Column
                  </th>
                  <th className="px-6 py-4 font-semibold text-red-900 dark:text-red-200 text-left min-w-[300px]">
                    Error Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...errors, ...warnings]
                  .sort((a, b) => {
                    // Sort by line first, then column, then severity
                    if (a.line !== b.line) return a.line - b.line;
                    if (a.column !== b.column) return a.column - b.column;
                    // Errors before warnings
                    if (a.severity === 'error' && b.severity === 'warning') return -1;
                    if (a.severity === 'warning' && b.severity === 'error') return 1;
                    return 0;
                  })
                  .map((error, index) => (
                  <tr
                    key={error.id || `error-${index}`}
                    onClick={() => onErrorClick && onErrorClick(error.line, error.column)}
                    className={`border-b border-red-200 dark:border-red-800 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors cursor-pointer ${
                      error.severity === 'warning' ? 'bg-yellow-50/30 dark:bg-yellow-900/10' : ''
                    }`}
                    title={`Click to navigate to line ${error.line}, column ${error.column}`}
                  >
                    <td className="px-4 py-3 text-center text-red-900 dark:text-red-200 font-bold border-r border-red-200 dark:border-red-800 whitespace-nowrap">
                      {error.line}
                    </td>
                    <td className="px-4 py-3 text-center text-red-900 dark:text-red-200 font-bold border-r border-red-200 dark:border-red-800 whitespace-nowrap">
                      {error.column}
                    </td>
                    <td className="px-6 py-3 text-left font-mono text-sm text-slate-900 dark:text-gray-200 break-words">
                      <span className={`${error.severity === 'warning' ? 'text-yellow-800 dark:text-yellow-200' : ''}`}>
                        {error.message}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Error Footer with Quick Actions */}
          <div className="px-4 py-3 bg-red-50/50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-700">
            <div className="flex items-center justify-between text-xs text-red-700 dark:text-red-300">
              <div className="flex items-center gap-4">
                <span>
                  <strong>{errors.length}</strong> error{errors.length !== 1 ? 's' : ''}
                </span>
                {warnings.length > 0 && (
                  <span>
                    <strong>{warnings.length}</strong> warning{warnings.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Info size={12} />
                <span>Click any error to navigate to the source location</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ErrorConsole;
