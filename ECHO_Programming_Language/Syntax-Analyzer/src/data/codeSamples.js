/*
Code Samples Library

Provides test cases for the ECHO language syntax analyzer with valid and invalid examples.
*/

export const CODE_SAMPLES = {
  // Valid test cases (grammar compliance)
  VALID_MINIMAL: {
    id: 'valid_minimal',
    label: '✓ 1. Minimal Hello World (Valid)',
    description: 'Demonstrates basic program structure, string literals, and the String Insertion System (SIS).',
    content: `start
    /* Define a string variable */
    string name = "World"
    
    /* Use '@' to insert the variable 'name' directly into the output string */
    echo "Hello, @name!" 
end`
  },

  VALID_MATH_BUILTIN: {
    id: 'valid_math_builtin',
    label: '✓ 2. Math & Built-ins (Valid)',
    description: 'Demonstrates arithmetic operators, precedence, built-in math functions, and integer division.',
    content: `start
    number x = 10
    number y = 3

    /* Standard arithmetic */
    number sumVal = x + y
    
    /* Integer division (//) and Modulo (%) */
    number divResult = x // y  /* Result is 3 */
    number remResult = x % y   /* Result is 1 */
    
    /* Exponential operator (^) */
    number power = x ^ 2       /* 100 */

    /* Using built-in functions on a list */
    list nums = [2, 4, 6, 8, 10]
    decimal avg = average(nums)
    boolean check = isEven(x)

    echo "Average: @avg, Is X Even? @check"
end`
  },

  VALID_ADVANCED_CONDITIONAL: {
    id: 'valid_advanced_conditional',
    label: '✓ 3. Advanced Conditionals (Valid)',
    description: 'Demonstrates complex boolean logic, && (AND), || (OR), and nested conditional blocks.',
    content: `start
    number age = 20
    boolean hasTicket = true
    boolean isVIP = false

    /* Complex condition using AND/OR */
    if hasTicket && (age >= 18 || isVIP)
        echo "Access Granted"
        
        if isVIP
            echo "Welcome to the VIP Lounge."
        else
            echo "Welcome to General Admission."
        end if
    else
        echo "Access Denied"
    end if
end`
  },

  VALID_SWITCH: {
    id: 'valid_switch',
    label: '✓ 4. Switch-Case Structure (Valid)',
    description: 'Demonstrates multi-branch selection using switch, case, and default.',
    content: `start
    number dayCode = 3
    
    switch dayCode
        case 1
            echo "Monday"
        case 2
            echo "Tuesday"
        case 3
            echo "Wednesday"
        default
            echo "Weekend or Invalid"
    end switch
end`
  },

  VALID_LOOPS: {
    id: 'valid_loops',
    label: '✓ 5. For & While Loops (Valid)',
    description: 'Demonstrates while loops and for loops with the optional "by" (step) clause.',
    content: `start
    /* While Loop */
    number counter = 5
    while counter > 0
        echo "Countdown: @counter"
        counter -= 1 /* Decrement operator */
    end while

    echo "Blast off!"

    /* For Loop with a custom step (counting by 2) */
    number i
    for i = 0 to 10 by 2
        echo "Even number: @i"
    end for
end`
  },

  VALID_DO_WHILE_LIST: {
    id: 'valid_do_while_list',
    label: '✓ 6. Do-While & Lists (Valid)',
    description: 'Demonstrates do-while post-test loops and zero-indexed array access.',
    content: `start
    list inventory = ["Apples", "Bananas", "Cherries"]
    number index = 0
    number length = 3

    do
        /* Access list element by index */
        echo "Item @index: @inventory[index]"
        index += 1
    while index < length
    end do
end`
  },

  VALID_FUNCTIONS: {
    id: 'valid_functions',
    label: '✓ 7. Functions & Returns (Valid)',
    description: 'Demonstrates function definition, parameters, return types, and function calls.',
    content: `start
    /* Function definition: takes two numbers, returns a number */
    function number calculateArea(number width, number height)
        number area = width * height
        return area
    end function

    number w = 5
    number h = 10
    
    /* Function call */
    number result = calculateArea(w, h)
    echo "The area is: @result"
end`
  },

  VALID_RECURSION: {
    id: 'valid_recursion',
    label: '✓ 8. Recursion/Factorial (Valid)',
    description: 'Demonstrates self-referential function calls (recursion) and base cases.',
    content: `start
    function number factorial(number n)
        if n <= 1
            return 1
        end if
        /* Recursive call: n * factorial(n-1) */
        return n * factorial(n - 1)
    end function

    number f = factorial(5)
    echo "5! = @f"
end`
  },

  VALID_STRUCTS: {
    id: 'valid_structs',
    label: '✓ 9. Data Structs & Schema Binding (Valid)',
    description: 'Demonstrates defining custom data structures, fields, and schema-based function binding.',
    content: `start
    /* Function to be bound to the struct */
    function number calculateBonus(number points)
        return points * 10
    end function

    /* Define a custom structure for a Player */
    data struct Player {
        string username
        number score = 0
        boolean isActive = true
        /* Schema Binding: fieldName : returnType (boundFunction) */
        bonus: number (calculateBonus)
    }
    
    string pName = "PlayerOne"
    echo "New player created: @pName"
end`
  },

  VALID_MASTER: {
    id: 'valid_master',
    label: '✓ 10. Master "Kitchen Sink" (Valid)',
    description: 'Combines Structs, Schema Binding, Functions, Loops, Conditionals, SIS, Built-ins, and Input.',
    content: `start
    /* 1. Function Definition (defined first for binding) */
    function decimal calculateTax(decimal amount)
        decimal rate = 0.1
        return amount * rate
    end function

    /* 2. Data Structure with Schema Binding */
    data struct Transaction {
        number id
        decimal amount
        /* Schema Binding: taxCalc binds to calculateTax */
        taxCalc: decimal (calculateTax)
    }

    /* 3. Global List */
    list history = [10.50, 20.00, 5.25]

    /* 4. Main Logic */
    echo "Processing Transactions..."
    
    number count = 0
    decimal totalTax = 0.0

    /* 5. Loop (Do-While) */
    do
        decimal current = history[count]
        
        /* 6. Conditional (If-Else) with Built-in (isEven) */
        if current > 15
            echo "High value transaction: @current"
        else
            echo "Standard transaction: @current"
        end if

        /* 7. Accumulate using Function Call */
        totalTax += calculateTax(current)
        count++

    while count < 3
    end do

    /* 8. Switch Case */
    switch count
        case 3
            echo "All items processed."
        default
            echo "Partial processing."
    end switch

    echo "Total Tax: @totalTax"
end`
  },

  // ==========================================
  // PART 2: INVALID TEST CASES (Error Handling)
  // ==========================================

  ERROR_MISSING_BLOCKS: {
    id: 'error_missing_blocks',
    label: '⚠ 1. Missing Start/End (Structural)',
    description: 'Error: The program must be encapsulated within start and end keywords.',
    content: `/* Error: No 'start' keyword at the beginning */
string s = "This will fail"
echo @s
end`
  },

  ERROR_ILLEGAL_SEMICOLON: {
    id: 'error_illegal_semicolon',
    label: '⚠ 2. Illegal Semicolons (Syntax)',
    description: 'Error: ECHO uses whitespace/newlines as delimiters. Semicolons are not allowed.',
    content: `start
    number x = 10; /* Error: Semicolon is forbidden */
    echo @x;
end`
  },

  ERROR_TYPE_MISMATCH: {
    id: 'error_type_mismatch',
    label: '⚠ 3. Type Mismatch (Static Typing)',
    description: 'Error: Trying to assign a string literal to a variable declared as number.',
    content: `start
    number age = "Twenty" /* Error: Cannot assign String to Number */
    echo @age
end`
  },

  ERROR_INVALID_ID: {
    id: 'error_invalid_id',
    label: '⚠ 4. Invalid Identifier (Lexical)',
    description: 'Error: Identifiers cannot start with a digit.',
    content: `start
    string 1stPlace = "Alice" /* Error: Variable starts with a digit */
    echo @1stPlace
end`
  },

  ERROR_BROKEN_CONTROL: {
    id: 'error_broken_control',
    label: '⚠ 5. Broken If-Else (Grammar)',
    description: 'Error: The else block appears before the if block.',
    content: `start
    number n = 5
    /* Error: 'else' cannot exist without a preceding 'if' */
    else 
        echo "This is wrong"
    if n > 0
        echo "Positive"
    end if
end`
  },

  ERROR_MALFORMED_LOOP: {
    id: 'error_malformed_loop',
    label: '⚠ 6. Malformed Loop (Syntax)',
    description: 'Error: Missing the "to" keyword in the for loop syntax.',
    content: `start
    number i
    /* Error: Missing 'to' keyword (expected: for i = 1 to 10) */
    for i = 1 10 
        echo @i
    end for
end`
  },

  ERROR_MISSING_RETURN_TYPE: {
    id: 'error_missing_return_type',
    label: '⚠ 7. Missing Return Type (Semantics)',
    description: 'Error: Functions returning a value must declare the return type.',
    content: `start
    /* Error: Missing return type (e.g., 'function number add...') */
    function add(number a, number b)
        return a + b
    end function
end`
  },

  ERROR_INVALID_SIS: {
    id: 'error_invalid_sis',
    label: '⚠ 8. Invalid SIS Syntax (Lexical)',
    description: 'Error: Space not allowed after @ symbol in string interpolation.',
    content: `start
    string user = "Bob"
    echo "Hello, @ user" /* Error: Space not allowed after @ */
end`
  },

  ERROR_RESERVED_KEYWORD: {
    id: 'error_reserved_keyword',
    label: '⚠ 9. Reserved Keyword (Lexical)',
    description: 'Error: Using a reserved keyword (while) as a variable name.',
    content: `start
    number while = 10 /* Error: 'while' is a reserved word */
    echo @while
end`
  },

  ERROR_UNCLOSED_SCOPE: {
    id: 'error_unclosed_scope',
    label: '⚠ 10. Unclosed Scope (Structural)',
    description: 'Error: The while loop is opened but never closed with end while.',
    content: `start
    number x = 0
    while x < 5
        echo @x
        x++
    /* Error: Missing 'end while' */
end`
  }
};

/**
 * Get sample by ID
 * * Finds a code sample by its unique identifier.
 * * @param {String} id - The unique identifier of the sample
 * @returns {Object|undefined} The sample object or undefined if not found
 */
export const getSampleById = (id) => {
  return Object.values(CODE_SAMPLES).find((sample) => sample.id === id);
};

/**
 * Get all samples
 * * Returns all available code samples as an array.
 * * @returns {Array} Array of all sample objects
 */
export const getAllSamples = () => {
  return Object.values(CODE_SAMPLES);
};