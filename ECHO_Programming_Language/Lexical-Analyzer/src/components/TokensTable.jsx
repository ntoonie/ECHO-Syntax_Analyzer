/**
 * =========================================
 * Title: Tokens Table – Analysis Results Display
 * =========================================
 */

import React from 'react';
import { FileText } from 'lucide-react';
import { getTokenTypeColor } from '../core/TokenTypes';

export default function TokensTable({ tokens }) {
  if (!tokens || tokens.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-gray-400 min-h-[400px]">
        <div className="text-center px-4">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-base text-gray-500 mb-2">No tokens to display</p>
          <p className="text-sm text-gray-400">Enter code and click "Analyze Code"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border border-gray-300 dark:border-gray-700 rounded-lg bg-white/50 dark:bg-slate-900/50 shadow-sm">
      <table className="w-full text-xs sm:text-sm border-collapse">
        <thead className="bg-white/80 dark:bg-slate-900/80 sticky top-0 z-10 backdrop-blur border-b-2 border-gray-300 dark:border-gray-600">
          <tr>
            <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 font-semibold text-slate-800 dark:text-gray-200 text-center border-r border-gray-200 dark:border-gray-700 whitespace-nowrap">Line No.</th>
            <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 font-semibold text-slate-800 dark:text-gray-200 text-center border-r border-gray-200 dark:border-gray-700 whitespace-nowrap">Token Type</th>
            <th className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 font-semibold text-slate-800 dark:text-gray-200 text-center whitespace-nowrap">Lexeme</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token, index) => (
            <tr key={`${token.lexeme}-${index}`} className="border-b border-gray-200 dark:border-gray-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
              <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-center text-slate-800 dark:text-gray-300 font-medium border-r border-gray-200 dark:border-gray-700 whitespace-nowrap">
                {token.line}
              </td>
              <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-center border-r border-gray-200 dark:border-gray-700">
                <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-semibold inline-block ${getTokenTypeColor(token.type)} whitespace-nowrap`}>
                  {token.type}
                </span>
              </td>
              <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-center font-mono text-slate-900 dark:text-gray-200 break-words break-all max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg">
                {token.lexeme}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
