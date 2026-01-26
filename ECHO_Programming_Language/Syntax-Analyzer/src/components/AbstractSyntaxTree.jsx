/*
Abstract Syntax Tree – AST Visualization Component

Interactive tree visualization component for displaying and navigating abstract syntax tree structures.
Depends on React, lucide-react icons.
*/

import React, { memo, useState, useCallback} from 'react';
import { 
  FileText, ChevronRight, ChevronDown, Code, Braces, 
  Package, Square, Layers, GitBranch, Terminal, 
  Type, Box, List as ListIcon, Play
} from 'lucide-react';

/* AST Configuration

Maps node types to their visual properties and structural children.
Aligns with ASTBuilder.js output and FORMAL_GRAMMAR.md.
*/
const AST_CONFIG = {
  // Program Structure
  ECHO_PROGRAM: { color: 'text-blue-600 dark:text-blue-400', icon: Package, children: ['statements'] },
  STMT_LIST: { color: 'text-gray-500 dark:text-gray-400', icon: Layers, children: ['statements'] },
  
  // Declarations
  DECLARATION_STMT: { color: 'text-emerald-600 dark:text-emerald-400', icon: Box, children: ['dataType', 'declList'] },
  DECL_LIST: { color: 'text-emerald-500 dark:text-emerald-300', icon: ListIcon, children: ['items'] },
  DECL_ITEM: { color: 'text-emerald-600 dark:text-emerald-400', icon: Square, children: ['identifier', 'assignmentOp', 'value', 'size'] },
  DATA_TYPE: { color: 'text-teal-600 dark:text-teal-400', icon: Type, children: [] },
  
  // Input/Output
  INPUT_STMT: { color: 'text-indigo-600 dark:text-indigo-400', icon: Terminal, children: ['target', 'assignmentOp', 'expression'] },
  OUTPUT_STMT: { color: 'text-cyan-600 dark:text-cyan-400', icon: Terminal, children: ['args'] },
  INPUT_EXPRESSION: { color: 'text-indigo-500 dark:text-indigo-300', icon: Terminal, children: ['dataType', 'prompt'] },
  ASSIGNMENT_STMT: { color: 'text-orange-600 dark:text-orange-400', icon: FileText, children: ['target', 'assignmentOp', 'value'] },
  ASSIGNMENT_OP: { color: 'text-orange-500 dark:text-orange-300', icon: Code, children: [] },

  // Control Flow
  IF_STMT: { color: 'text-rose-600 dark:text-rose-400', icon: GitBranch, children: ['condition', 'thenBody', 'elseIfs', 'elseBody'] },
  SWITCH_STMT: { color: 'text-rose-600 dark:text-rose-400', icon: GitBranch, children: ['expression', 'cases', 'defaultBlock'] },
  CASE_BLOCK: { color: 'text-rose-500 dark:text-rose-300', icon: Square, children: ['value', 'body'] },
  DEFAULT_BLOCK: { color: 'text-rose-400 dark:text-rose-200', icon: Square, children: ['body'] },
  ELSE_IF_BLOCK: { color: 'text-rose-500 dark:text-rose-300', icon: GitBranch, children: ['condition', 'body'] },
  ELSE_BLOCK: { color: 'text-rose-400 dark:text-rose-200', icon: GitBranch, children: ['body'] },
  JUMP_STMT: { color: 'text-yellow-600 dark:text-yellow-400', icon: Play, children: [] },

  // Loops
  FOR_LOOP: { color: 'text-amber-600 dark:text-amber-400', icon: Braces, children: ['iterator', 'start', 'end', 'step', 'body'] },
  WHILE_LOOP: { color: 'text-amber-600 dark:text-amber-400', icon: Braces, children: ['condition', 'body'] },
  DO_WHILE_LOOP: { color: 'text-amber-600 dark:text-amber-400', icon: Braces, children: ['body', 'condition'] },
  STEP_CLAUSE: { color: 'text-amber-500 dark:text-amber-300', icon: Code, children: ['value'] },

  // Functions
  FUNCTION_DEF: { color: 'text-purple-600 dark:text-purple-400', icon: Code, children: ['returnType', 'name', 'parameters', 'body', 'returnStatement'] },
  PARAM_LIST: { color: 'text-purple-500 dark:text-purple-300', icon: ListIcon, children: ['params'] },
  PARAM: { color: 'text-purple-400 dark:text-purple-200', icon: Square, children: ['dataType', 'name'] },
  RETURN_STMT: { color: 'text-purple-600 dark:text-purple-400', icon: Play, children: ['value'] },
  FUNCTION_CALL: { color: 'text-violet-600 dark:text-violet-400', icon: Code, children: ['function', 'arguments'] },
  ARG_LIST: { color: 'text-violet-500 dark:text-violet-300', icon: ListIcon, children: ['args'] },
  RETURN_TYPE: { color: 'text-purple-500 dark:text-purple-300', icon: Type, children: ['dataType'] },
  
  // Built-in Functions
  BUILTIN_FUNCTION_CALL: { color: 'text-fuchsia-600 dark:text-fuchsia-400', icon: Code, children: ['builtin', 'arguments'] },
  BUILTIN_NAME: { color: 'text-fuchsia-500 dark:text-fuchsia-300', icon: Square, children: [] },

  // Expressions & Ops
  EXPRESSION: { color: 'text-blue-500 dark:text-blue-300', icon: Code, children: ['left', 'operator', 'right', 'value'] },
  LOGIC_OR: { color: 'text-blue-600 dark:text-blue-400', icon: Code, children: ['left', 'operator', 'right'] },
  LOGIC_AND: { color: 'text-blue-500 dark:text-blue-300', icon: Code, children: ['left', 'operator', 'right'] },
  EQUALITY: { color: 'text-green-600 dark:text-green-400', icon: Code, children: ['left', 'operator', 'right'] },
  RELATIONAL: { color: 'text-green-500 dark:text-green-300', icon: Code, children: ['left', 'operator', 'right'] },
  ADDITIVE: { color: 'text-yellow-600 dark:text-yellow-400', icon: Code, children: ['left', 'operator', 'right'] },
  MULTIPLICATIVE: { color: 'text-yellow-500 dark:text-yellow-300', icon: Code, children: ['left', 'operator', 'right'] },
  EXPONENTIAL: { color: 'text-orange-600 dark:text-orange-400', icon: Code, children: ['left', 'operator', 'right'] },
  UNARY: { color: 'text-red-600 dark:text-red-400', icon: Code, children: ['operator', 'expression', 'operand'] },
  POSTFIX_EXPR: { color: 'text-red-500 dark:text-red-300', icon: Code, children: ['operand', 'operator'] },
  
  // Lexical & Primitives
  IDENTIFIER: { color: 'text-yellow-600 dark:text-yellow-400', icon: Square, children: [] },
  LITERAL: { color: 'text-blue-500 dark:text-blue-300', icon: Square, children: [] },
  NUMBER_LIT: { color: 'text-blue-500 dark:text-blue-300', icon: Square, children: [] },
  DECIMAL_LIT: { color: 'text-blue-500 dark:text-blue-300', icon: Square, children: [] },
  STRING_LIT: { color: 'text-green-600 dark:text-green-400', icon: Code, children: ['content'] },
  BOOL_LIT: { color: 'text-blue-500 dark:text-blue-300', icon: Square, children: [] },
  NULL_LITERAL: { color: 'text-gray-500 dark:text-gray-400', icon: Square, children: [] },
  LIST_LIT: { color: 'text-indigo-600 dark:text-indigo-400', icon: Braces, children: ['elements'] },
  ARRAY_ELEMENTS: { color: 'text-indigo-500 dark:text-indigo-300', icon: ListIcon, children: ['elements'] },
  LIST_ACCESS: { color: 'text-indigo-600 dark:text-indigo-400', icon: Code, children: ['array', 'index'] },
  STRING_CONTENT: { color: 'text-green-500 dark:text-green-300', icon: FileText, children: [] },
  STRING_INSERTION: { color: 'text-pink-500 dark:text-pink-400', icon: Code, children: ['identifier'] },
  
  // Data Structures
  DATA_STRUCT: { color: 'text-emerald-700 dark:text-emerald-500', icon: Package, children: ['name', 'fields'] },
  FIELD_LIST: { color: 'text-emerald-600 dark:text-emerald-400', icon: ListIcon, children: ['fields'] },
  FIELD_DECL: { color: 'text-emerald-500 dark:text-emerald-300', icon: Square, children: ['dataType', 'identifier', 'defaultValue'] },
  SCHEMA_BINDING: { color: 'text-emerald-600 dark:text-emerald-400', icon: GitBranch, children: ['identifier', 'dataType', 'bindingClause'] },
  BINDING_CLAUSE: { color: 'text-emerald-500 dark:text-emerald-300', icon: Code, children: [] },
  FIELD_ACCESS: { color: 'text-teal-600 dark:text-teal-400', icon: Code, children: ['object', 'field'] },
  MEMBER_ACCESS: { color: 'text-teal-600 dark:text-teal-400', icon: Code, children: ['object', 'member'] },
};

// Default fallback for unknown nodes
const DEFAULT_NODE_CONFIG = { color: 'text-gray-600 dark:text-gray-400', icon: FileText, children: [] };

/*
Helper Functions
*/

/*
Safely convert value to string

@param {any} value - Value to convert
@returns {String} String representation
*/
const safeToString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value.token && value.token.lexeme) return value.token.lexeme;
    if (value.lexeme) return value.lexeme;
    if (value.type) return value.type;
    return '';
  }
  return String(value);
};

/*
Safely convert value to display string with quotes

@param {any} value - Value to convert
@returns {String} Display string with quotes for strings
*/
const safeToDisplayString = (value) => {
  if (typeof value === 'string') return `"${value}"`;
  return safeToString(value);
};

// Generates a unique ID for a node based on its path in the tree
const getNodeId = (node, path) => `${path}_${node.type || 'unknown'}`;

// Intelligently gets a short display name for a node
const getDisplayName = (node) => {
  if (!node) return '';
  
  // Special handling for Declaration Statements to show variables defined
  if (node.type === 'DECLARATION_STMT' && node.declList?.items) {
    const vars = node.declList.items
      .map(item => item.identifier?.name)
      .filter(Boolean);
    if (vars.length > 0) return vars.length === 1 ? vars[0] : `${vars[0]} +${vars.length - 1}`;
  }

  // Handle explicit name property which might be a string or an Identifier node
  if (node.name) {
    if (typeof node.name === 'string') return node.name;
    // Handle Identifier AST nodes stored in name property (e.g., FunctionDef, DataStruct)
    if (typeof node.name === 'object' && node.name.name) return node.name.name;
  }

  // Handle identifier property
  if (node.identifier) {
     if (typeof node.identifier === 'string') return node.identifier;
     if (typeof node.identifier === 'object' && node.identifier.name) return node.identifier.name;
  }
  
  if (node.function) return typeof node.function.name === 'object' ? node.function.name.name : node.function.name;
  if (node.builtin) return node.builtin.name;
  if (node.target) return node.target.name;
  if (node.keyword) return node.keyword.lexeme;
  
  // Value check (skip if object)
  if (node.value && typeof node.value !== 'object') return ''; 

  // Fallback to formatted type
  return node.type.toLowerCase().replace(/_/g, ' ');
};

// Intelligently gets the value to display next to the node name
const getDisplayValue = (node) => {
  if (!node) return undefined;
  
  // Primitives stored directly in node.value
  if (['NUMBER_LIT', 'DECIMAL_LIT', 'BOOL_LIT', 'STRING_LIT', 'STRING_CONTENT'].includes(node.type)) {
    return node.value;
  }
  
  // Declarations
  if (node.type === 'DECL_ITEM' && node.value && typeof node.value !== 'object') return node.value;
  
  // Operators
  if (node.operator && typeof node.operator !== 'object') return node.operator;
  if (node.type === 'ASSIGNMENT_OP') return node.operator || '=';
  
  return undefined;
};

// Maps AST Node Types to Grammar Rules from FORMAL_GRAMMAR.md
const getGrammarRule = (nodeType) => {
  const rules = {
    // B. Program Structure
    'ECHO_PROGRAM': '"start" <statement_list> "end"',
    'STMT_LIST': '{ <statement> }',
    'STMT': '<declaration_stmt> | <assignment_stmt> | <input_stmt> | <output_stmt> | <conditional_stmt> | <loop_stmt> | <function_def> | <function_call> | <builtin_function_call> | <jump_stmt>',
    
    // D. Declaration Statements
    'DECLARATION_STMT': '<data_type> <decl_list>',
    'DECL_LIST': '<decl_item> { "," <decl_item> }',
    'DECL_ITEM': '<identifier> | <identifier> "=" <expression> | <identifier> "[" <number_lit> "]" | <identifier> "=" <list_lit>',
    'DATA_TYPE': '"number" | "decimal" | "string" | "boolean" | "list"',
    
    // E. Assignment Statements
    'ASSIGNMENT_STMT': '<identifier> <assignment_op> <expression> | <list_access> <assignment_op> <expression>',
    'ASSIGNMENT_OP': '"=" | "+=" | "-=" | "*=" | "/=" | "%="',
    
    // F. Input Statements
    'INPUT_STMT': '<identifier> <assignment_op> <input_expression>',
    'INPUT_EXPRESSION': '"input" "(" <data_type> ")" | "input" "(" <data_type> "," <expression> ")"',
    
    // G. Output Statements
    'OUTPUT_STMT': '"echo" <expression> | "echo" <string_lit>',
    
    // H. Conditional Statements
    'CONDITIONAL_STMT': '<if_stmt> | <if_else_stmt> | <if_elseif_else_stmt> | <nested_if_stmt> | <switch_stmt>',
    'IF_STMT': '"if" <expression> <statement_list> "end" "if"',
    'IF_ELSE_STMT': '"if" <expression> <statement_list> "else" <statement_list> "end" "if"',
    'IF_ELSEIF_ELSE_STMT': '"if" <expression> <statement_list> { "else" "if" <expression> <statement_list> } [ "else" <statement_list> ] "end" "if"',
    'SWITCH_STMT': '"switch" <expression> { <case_block> } [ <default_block> ] "end" "switch"',
    'CASE_BLOCK': '"case" <literal> <statement_list>',
    'DEFAULT_BLOCK': '"default" <statement_list>',
    
    // I. Loop Statements
    'LOOP_STMT': '<for_loop> | <while_loop> | <do_while_loop>',
    'FOR_LOOP': '"for" <identifier> "=" <expression> "to" <expression> [ <step_clause> ] <statement_list> "end" "for"',
    'STEP_CLAUSE': '"by" <expression>',
    'WHILE_LOOP': '"while" <expression> <statement_list> "end" "while"',
    'DO_WHILE_LOOP': '"do" <statement_list> "while" <expression> "end" "do"',
    'JUMP_STMT': '"break" | "continue"',
    
    // J. Function Statements
    'FUNCTION_DEF': '"function" <return_type> <identifier> "(" [ <param_list> ] ")" <statement_list> <return_stmt> "end" "function" | ...',
    'PARAM_LIST': '<param> { "," <param> }',
    'PARAM': '<data_type> <identifier>',
    'RETURN_STMT': '"return" <expression>',
    'FUNCTION_CALL': '<identifier> "(" [ <arg_list> ] ")"',
    'ARG_LIST': '<expression> { "," <expression> }',
    'RETURN_TYPE': '<data_type>',
    
    // K. Data Structure Statements
    'DATA_STRUCT': '"data" "struct" <identifier> "{" <field_list> "}"',
    'FIELD_LIST': '{ <field_decl> }',
    'FIELD_DECL': '<data_type> <identifier> | <data_type> <identifier> "=" <expression> | <schema_binding>',
    'SCHEMA_BINDING': '<identifier> ":" <data_type> [ <binding_clause> ]',
    'BINDING_CLAUSE': '"(" <identifier> ")"',
    
    // L. List Operations
    'LIST_LIT': '"[" [ <array_elements> ] "]"',
    'ARRAY_ELEMENTS': '<expression> { "," <expression> }',
    'LIST_ACCESS': '<identifier> "[" <expression> "]"',
    
    // M. String Insertion System
    'STRING_LIT': '"\\"" { <string_content> } "\\""',
    'STRING_CONTENT': '<letter> | <digit> | <operator> | <special_char> | " " | "@" <identifier>',
    
    // N. Built-in Function Calls
    'BUILTIN_FUNCTION_CALL': '<builtin_name> "(" [ <arg_list> ] ")"',
    'BUILTIN_NAME': 'sum | median | mode | average | isEven | isOdd',
    
    // Expressions
    'EXPRESSION': '<logic_or>',
    'LOGIC_OR': '<logic_and> { "||" <logic_and> }',
    'LOGIC_AND': '<equality> { "&&" <equality> }',
    'EQUALITY': '<relational> { ( "==" | "!=" ) <relational> }',
    'RELATIONAL': '<additive> { ( "<" | ">" | "<=" | ">=" ) <additive> }',
    'ADDITIVE': '<multiplicative> { ( "+" | "-" ) <multiplicative> }',
    'MULTIPLICATIVE': '<exponential> { ( "*" | "/" | "//" | "%" ) <exponential> }',
    'EXPONENTIAL': '<unary> { "^" <unary> }',
    'UNARY': '( "!" | "+" | "-" | "++" | "--" ) <unary> | <primary>',
    'PRIMARY': '<identifier> | <literal>',
  };
  return rules[nodeType] || '';
};

/*
Recursive Tree Node Component

@param {Object} node - AST node data
@param {Number} depth - Current depth in tree
@param {String} path - Node path in tree
@param {Set} expandedNodes - Set of expanded node IDs
@param {String} selectedNode - Currently selected node ID
@param {Function} onToggle - Toggle node expansion
@param {Function} onSelect - Select node callback
*/
const ASTNode = memo(({ node, depth = 0, path, expandedNodes, selectedNode, onToggle, onSelect }) => {
  if (!node || typeof node !== 'object') return null;
  
  const nodeId = getNodeId(node, path);
  const isExpanded = expandedNodes.has(nodeId);
  const isSelected = selectedNode === nodeId;
  
  const config = AST_CONFIG[node.type] || DEFAULT_NODE_CONFIG;
  const Icon = config.icon;
  
  // Determine if node has children based on config to avoid expensive checks
  const childKeys = config.children || [];
  const hasChildren = childKeys.some(key => {
    const val = node[key];
    return Array.isArray(val) ? val.length > 0 : (val && typeof val === 'object');
  });

  const displayValue = getDisplayValue(node);
  const displayName = getDisplayName(node);

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect(node, path);
    if (hasChildren) {
      onToggle(nodeId);
    }
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded transition-colors ${
          isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={handleClick}
      >
        <span className="text-gray-400 dark:text-gray-500 w-4 flex justify-center">
          {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
        </span>
        
        <Icon size={16} className={config.color} />
        
        <span className={`font-mono text-sm font-medium ${config.color}`}>
          {node.type}
        </span>
        
        {displayName && (
          <span className="text-gray-600 dark:text-gray-400 text-sm italic">
            "{displayName}"
          </span>
        )}
        
        {node.operator && typeof node.operator === 'string' && (
          <span className="text-gray-600 dark:text-gray-400 text-sm font-bold">
            {node.operator}
          </span>
        )}
        
        {displayValue !== undefined && (
          <span className="text-gray-600 dark:text-gray-400 text-sm">
            = {safeToDisplayString(displayValue)}
          </span>
        )}
        
        {node.token && (
          <span className="text-xs text-gray-400 dark:text-gray-600 ml-auto font-mono">
            {node.token.line}:{node.token.column}
          </span>
        )}
      </div>
      
      {isExpanded && hasChildren && (
        <div className="border-l border-gray-100 dark:border-gray-800 ml-2">
          {childKeys.map(key => {
            const childData = node[key];
            
            if (!childData) return null;
            
            if (Array.isArray(childData)) {
              return childData.map((child, index) => (
                <ASTNode 
                  key={`${nodeId}_${key}_${index}`}
                  node={child}
                  depth={depth + 1}
                  path={`${path}.${key}.${index}`}
                  expandedNodes={expandedNodes}
                  selectedNode={selectedNode}
                  onToggle={onToggle}
                  onSelect={onSelect}
                />
              ));
            } else if (typeof childData === 'object') {
              return (
                <ASTNode 
                  key={`${nodeId}_${key}`}
                  node={childData}
                  depth={depth + 1}
                  path={`${path}.${key}`}
                  expandedNodes={expandedNodes}
                  selectedNode={selectedNode}
                  onToggle={onToggle}
                  onSelect={onSelect}
                />
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
});

/*
Main AST Display Component

@param {Object} ast - Abstract syntax tree data
*/
const AbstractSyntaxTree = ({ ast }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedNodeData, setSelectedNodeData] = useState(null);

  const handleToggle = useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const handleSelect = useCallback((node, path) => {
    setSelectedNodeId(getNodeId(node, path));
    setSelectedNodeData(node);
  }, []);

  const handleExpandAll = () => {
    if (!ast) return;
    const allIds = new Set();
    const traverse = (node, path) => {
      if (!node || typeof node !== 'object') return;
      const id = getNodeId(node, path);
      allIds.add(id);
      
      const config = AST_CONFIG[node.type];
      const keys = config ? (config.children || []) : [];
      
      keys.forEach(key => {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach((c, i) => traverse(c, `${path}.${key}.${i}`));
        } else if (child) {
          traverse(child, `${path}.${key}`);
        }
      });
    };
    traverse(ast, 'root');
    setExpandedNodes(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  if (!ast) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 min-h-[400px]">
        <FileText size={48} className="mb-3 opacity-30" />
        <p className="text-base font-semibold">No AST Available</p>
        <p className="text-sm">Parse source code to generate structure</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-0">
        
        {/* Tree Visualization Panel */}
        <div className="lg:col-span-2 flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Layers size={18} /> Abstract Syntax Tree
            </h3>
            <div className="flex gap-2">
              <button onClick={handleCollapseAll} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:opacity-80 transition-opacity">
                Collapse All
              </button>
              <button onClick={handleExpandAll} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded hover:opacity-80 transition-opacity">
                Expand All
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2 custom-vertical-scrollbar">
            <ASTNode 
              node={ast}
              path="root"
              expandedNodes={expandedNodes}
              selectedNode={selectedNodeId}
              onToggle={handleToggle}
              onSelect={handleSelect}
            />
          </div>
        </div>

        {/* Node Details Panel */}
        <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <FileText size={18} /> Node Details
            </h3>
          </div>
          <div className="flex-1 overflow-auto p-4 custom-vertical-scrollbar">
            {selectedNodeData ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type</label>
                  <div className="flex items-center gap-2 mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    {(() => {
                      const Icon = (AST_CONFIG[selectedNodeData.type] || DEFAULT_NODE_CONFIG).icon;
                      const color = (AST_CONFIG[selectedNodeData.type] || DEFAULT_NODE_CONFIG).color;
                      return <Icon size={20} className={color} />;
                    })()}
                    <span className="font-mono font-medium">{selectedNodeData.type}</span>
                  </div>
                </div>

                {getDisplayName(selectedNodeData) && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Name</label>
                    <div className="mt-1 font-mono text-sm border-b border-gray-200 dark:border-gray-700 pb-1">
                      {safeToString(getDisplayName(selectedNodeData))}
                    </div>
                  </div>
                )}

                {getDisplayValue(selectedNodeData) !== undefined && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Value</label>
                    <div className="mt-1 font-mono text-sm border-b border-gray-200 dark:border-gray-700 pb-1">
                      {safeToDisplayString(getDisplayValue(selectedNodeData))}
                    </div>
                  </div>
                )}

                {selectedNodeData.token && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Source Position</label>
                    <div className="mt-1 flex gap-4 text-sm font-mono text-gray-600 dark:text-gray-400">
                      <span>Line: {selectedNodeData.token.line}</span>
                      <span>Column: {selectedNodeData.token.column}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Grammar Rule</label>
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                    {getGrammarRule(selectedNodeData.type) || 'No specific grammar rule defined for this node.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Box size={40} className="mb-2 opacity-20" />
                <p className="text-sm">Select a node to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbstractSyntaxTree;