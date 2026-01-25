# ECHO Language Formal Grammar

## Grammar Definition

**G = {V, T, P, S}**

Where:

- **V** = Set of non-terminal symbols
- **T** = Set of terminal symbols
- **P** = Production rules defining the syntax of ECHO language
- **S** = Start symbol

---

## V: Non-Terminal Symbols

### Program Structure (3)

- `<ECHO_program>`
- `<statement_list>`
- `<statement>`

### Declarations (4)

- `<declaration_stmt>`
- `<decl_list>`
- `<decl_item>`
- `<data_type>`

### Input/Output & Operations (4)

- `<input_stmt>`
- `<output_stmt>`
- `<assignment_stmt>`
- `<assignment_op>`

### Control Flow (8)

- `<conditional_stmt>`
- `<if_stmt>`
- `<else_if_block>`
- `<else_block>`
- `<switch_stmt>`
- `<case_block>`
- `<default_block>`
- `<jump_stmt>`

### Loops (5)

- `<loop_stmt>`
- `<for_loop>`
- `<while_loop>`
- `<do_while_loop>`
- `<step_clause>`

### Functions (7)

- `<function_def>`
- `<param_list>`
- `<param>`
- `<return_stmt>`
- `<function_call>`
- `<arg_list>`
- `<return_type>`

### Expressions (10)

- `<expression>`
- `<logic_or>`
- `<logic_and>`
- `<equality>`
- `<relational>`
- `<additive>`
- `<multiplicative>`
- `<exponential>`
- `<unary>`
- `<primary>`

### Lexical (20)

- `<identifier>`
- `<literal>`
- `<number_lit>`
- `<decimal_lit>`
- `<string_lit>`
- `<bool_lit>`
- `<list_lit>`
- `<array_elements>`
- `<list_access>`
- `<string_content>`
- `<operator>`
- `<noise_word>`
- `<letter>`
- `<digit>`
- `<data_struct>`
- `<field_list>`
- `<field_decl>`
- `<input_expression>`
- `<builtin_function_call>`
- `<builtin_name>`

---

## T: Terminal Symbols

### Keywords – Program Structure

- `function`
- `start`
- `end`
- `echo`
- `input`

### Keywords – Data Types

- `number`
- `decimal`
- `string`
- `boolean`
- `list`

### Keywords – Loops

- `for`
- `while`
- `do`

### Keywords – Conditionals

- `if`
- `else`
- `switch`
- `case`
- `default`

### Built-in Function Names

- `sum`
- `median`
- `mode`
- `average`
- `isEven`
- `isOdd`

### Reserved Words

- `@`
- `NULL`
- `true`
- `false`
- `continue`
- `break`
- `return`
- `new`
- `this`

### Noise Words

- `with`
- `to`
- `by`

### Operators, Delimiters, & Whitespace

- Assignment: `=`, `+=`, `-=`, `*=`, `/=`, `%=`
- Arithmetic: `+`, `-`, `*`, `/`, `//`, `%`, `^`
- Increment/Decrement: `++`, `--`
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logical: `!`, `&&`, `||`
- Delimiters: `(`, `)`, `[`, `]`, `,`, `"`, `_`, `\`, `.`
- Whitespace: `<space>`, `<tab>`, `<newline>`

### Character Sets

- `A-Z`, `a-z`, `0-9`

---

## P: Production Rules

### A. LEXICAL ELEMENTS

#### Character Sets

```
<letter>        =>  A | B | C | D | E | F | G | H | I | J | K | L
                | M | N | O | P | Q | R | S | T | U | V | W
                | X | Y | Z | a | b | c | d | e | f | g | h | i | j
                | k | l | m | n | o | p | q | r | s | t | u | v | w
                | x | y | z

<digit>         =>  0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

<special_char>  =>  "." | "," | "-" | "+" | "*" | "/" | "%" | "^"
                | "(" | ")" | "[" | "]" | "{" | "}" | "!" | "?"
                | "=" | "<" | ">" | "&" | "|" | "\\"

<operator_char> =>  "+" | "-" | "*" | "/" | "%" | "^"
                | "=" | "<" | ">" | "!" | "&" | "|"
```

#### Identifiers and Noise Words

```
<identifier>    =>  "_" { "_" } | <letter> { <letter> | <digit> | "_" }
                    (* Note: Length constrained to 1-64 characters *)

<noise_word>    =>  with | to | by
```

#### Literals

```
<literal>       =>  <number_lit> | <decimal_lit> | <string_lit>
                | <bool_lit> | <list_lit> | NULL

<number_lit>    =>  <digit> { <digit> }

<decimal_lit>   =>  <digit> { <digit> } "." <digit> { <digit> }

<bool_lit>      =>  true | false
```

#### String Insertion System (SIS)

```
<string_lit>        =>  '"' { <string_content> } '"'

<string_content>    =>  <letter> | <digit> | <operator>
                    | <special_char> | " " | "@" <identifier>
```

#### Lists

```
<list_lit>      =>  "[" [ <array_elements> ] "]"

<array_elements> => <expression> { "," <expression> }

<list_access>   =>  <identifier> "[" <expression> "]"
```

---

### B. PROGRAM STRUCTURE

```
<ECHO_program>  =>  "start" <statement_list> "end"

<statement_list> => { <statement> }

<statement>     =>  <declaration_stmt>
                | <assignment_stmt>
                | <input_stmt>
                | <output_stmt>
                | <conditional_stmt>
                | <loop_stmt>
                | <function_def>
                | <function_call>
                | <builtin_function_call>
                | <jump_stmt>
```

---

### C. EXPRESSION STATEMENTS

```
<expression>    =>  <logic_or>

<logic_or>      =>  <logic_and> { "||" <logic_and> }

<logic_and>     =>  <equality> { "&&" <equality> }

<equality>      =>  <relational> { ( "==" | "!=" ) <relational> }

<relational>    =>  <additive> { ( "<" | ">" | "<=" | ">=" ) <additive> }

<additive>      =>  <multiplicative> { ( "+" | "-" ) <multiplicative> }

<multiplicative> => <exponential> { ( "*" | "/" | "//" | "%" ) <exponential> }

<exponential>   =>  <unary> { "^" <unary> }

<unary>         =>  ( "!" | "+" | "-" | "++" | "--" ) <unary>
                | <primary>

<primary>       =>  <identifier> | <literal>
```

---

### D. DECLARATION STATEMENTS

```
<declaration_stmt> => <data_type> <decl_list>

<decl_list>     =>  <decl_item> { "," <decl_item> }

<decl_item>     =>  <identifier>
                | <identifier> "=" <expression>
                | <identifier> "[" <number_lit> "]"
                | <identifier> "=" <list_lit>

<data_type>     =>  "number"
                | "decimal"
                | "string"
                | "boolean"
                | "list"
```

---

### E. ASSIGNMENT STATEMENTS

```
<assignment_stmt> => <identifier> <assignment_op> <expression>
                | <list_access> <assignment_op> <expression>

<assignment_op> =>  "="
                | "+="
                | "-="
                | "*="
                | "/="
                | "%="
```

---

### F. INPUT STATEMENTS

```
<input_stmt>    =>  <identifier> <assignment_op> <input_expression>

<input_expression> => "input" "(" <data_type> ")"
                | "input" "(" <data_type> "," <expression> ")"

<data_type>     =>  "number"
                | "decimal"
                | "string"
                | "boolean"
                | "list"
```

---

### G. OUTPUT STATEMENTS

```
<output_stmt>   =>  "echo" <expression>
                | "echo" <string_lit>

<string_lit>    =>  '"' { <string_content> } '"'

<string_content> => <letter>
                | <digit>
                | <operator>
                | <special_char>
                | " "
                | "@" <identifier>
```

---

### H. CONDITIONAL STATEMENTS

```
<conditional_stmt> => <if_stmt>
                | <if_else_stmt>
                | <if_elseif_else_stmt>
                | <nested_if_stmt>
                | <switch_stmt>

<if_stmt>       =>  "if" <expression> <statement_list> "end" "if"

<if_else_stmt>  =>  "if" <expression> <statement_list>
                    "else" <statement_list>
                    "end" "if"

<if_elseif_else_stmt> => "if" <expression> <statement_list>
                    { "else" "if" <expression> <statement_list> }
                    [ "else" <statement_list> ]
                    "end" "if"

<nested_if_stmt> => "if" <expression> <statement_list>
                    { <if_stmt> | <if_else_stmt> | <if_elseif_else_stmt> }
                    [ "else" <statement_list> ]
                    "end" "if"

<switch_stmt>   =>  "switch" <expression>
                    { <case_block> }
                    [ <default_block> ]
                    "end" "switch"

<case_block>    =>  "case" <literal> <statement_list>

<default_block> =>  "default" <statement_list>
```

---

### I. LOOP STATEMENTS

```
<loop_stmt>     =>  <for_loop>
                | <while_loop>
                | <do_while_loop>

<for_loop>      =>  "for" <identifier> "=" <expression> "to" <expression>
                    [ <step_clause> ]
                    <statement_list>
                    "end" "for"

<step_clause>   =>  "by" <expression>

<while_loop>    =>  "while" <expression>
                    <statement_list>
                    "end" "while"

<do_while_loop> =>  "do"
                    <statement_list>
                    "while" <expression>
                    "end" "do"

<jump_stmt>     =>  "break"
                | "continue"
```

---

### J. FUNCTION STATEMENTS

```
<function_def>  =>  "function" <return_type> <identifier> "(" [ <param_list> ] ")"
                    <statement_list>
                    <return_stmt>
                    "end" "function"
                | "function" <identifier> "(" [ <param_list> ] ")"
                    <statement_list>
                    "end" "function"

<param_list>    =>  <param> { "," <param> }

<param>         =>  <data_type> <identifier>

<return_stmt>   =>  "return" <expression>

<function_call> =>  <identifier> "(" [ <arg_list> ] ")"

<arg_list>      =>  <expression> { "," <expression> }

<return_type>   =>  <data_type>
```

---

### K. DATA STRUCTURE STATEMENTS

```
<data_struct>   =>  "data" "struct" <identifier>
                    "{" <field_list> "}"

<field_list>    =>  { <field_decl> }

<field_decl>    =>  <data_type> <identifier>
                | <data_type> <identifier> "=" <expression>
                | <schema_binding>

<schema_binding> =>  <identifier> ":" <data_type> [ <binding_clause> ]

<binding_clause> =>  "(" <identifier> ")"
```

---

### L. LIST OPERATIONS AND ACCESS

```
<list_lit>      =>  "[" [ <array_elements> ] "]"

<array_elements> => <expression> { "," <expression> }

<list_access>   =>  <identifier> "[" <expression> "]"
```

---

### M. STRING INSERTION SYSTEM (SIS)

```
<string_lit>    =>  '"' { <string_content> } '"'

<string_content> => <letter>
                | <digit>
                | <operator>
                | <special_char>
                | " "
                | "@" <identifier>
```

---

### N. BUILT-IN FUNCTION CALLS

```
<builtin_function_call> => <builtin_name> "(" [ <arg_list> ] ")"

<builtin_name>      => sum
                    | median
                    | mode
                    | average
                    | isEven
                    | isOdd

<arg_list>          => <expression> { "," <expression> }
```

---

## S: Start Symbol

```
S = { <ECHO_program> }
```

---

## Notation Conventions

- `|` = OR (alternative)
- `{ }` = Zero or more repetitions (Kleene star)
- `[ ]` = Optional (zero or one occurrence)
- `" "` = Terminal symbol (literal string)
- `< >` = Non-terminal symbol
- `=>` = Production rule (derives)

---

## Implementation Notes

1. **Operator Precedence** (from highest to lowest):
   - Unary operators (`!`, `+`, `-`, `++`, `--`)
   - Exponential (`^`)
   - Multiplicative (`*`, `/`, `//`, `%`)
   - Additive (`+`, `-`)
   - Relational (`<`, `>`, `<=`, `>=`)
   - Equality (`==`, `!=`)
   - Logical AND (`&&`)
   - Logical OR (`||`)

2. **Identifier Constraints**:
   - Length: 1-64 characters
   - Can start with underscore or letter
   - Can contain letters, digits, and underscores

3. **String Insertion System (SIS)**:
   - Use `@identifier` within string literals to insert variable values

4. **List Access**:
   - Zero-indexed array access using `identifier[expression]`

5. **Function Definitions**:
   - Functions can have an optional return type
   - Functions without return type are void functions
   - Return statement is required for functions with return type
