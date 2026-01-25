/**
 * =========================================
 * Title: Token Legend – Color Reference Guide
 * =========================================
 */

import React from 'react';
import { getTokenTypeColor } from '../core/TokenTypes';

const LEGEND_ITEMS = [
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
  { type: 'ERR', label: 'Error Tokens (ERR)' },
];

export default function TokenLegend() {
  return (
    <div className="mt-6 w-full bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-lg shadow-md border border-white/30 dark:border-slate-700">
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-200 mb-3 sm:mb-4 text-center">Token Type Legend</h3>
      <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
        {LEGEND_ITEMS.map((item) => (
          <span key={item.type} className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold ${getTokenTypeColor(item.type)}`}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
