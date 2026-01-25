# 🔍 E.C.H.O Syntax Analyzer

[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Educational](https://img.shields.io/badge/Purpose-Educational-yellow.svg)](LICENSE)

---

Real-time syntax analyzer that validates E.C.H.O source code against formal grammar rules with comprehensive error reporting.

---

## 🚀 Features

- **Syntax Validation** – Enforces ECHO grammar rules with precise error detection
- **Error Reporting** – Line/column precision with actionable error messages
- **Interactive Navigation** – Click-to-jump to error locations in code
- **AST Generation** – Abstract Syntax Tree visualization for code structure
- **Real-time Analysis** – Instant feedback as you type E.C.H.O code

---

## ⚙️ Getting Started

```bash
# Clone the repository
git clone https://github.com/ntoonie/ECHO_Programming_Language.git
cd ECHO_Programming_Language/Syntax-Analyzer

# Install dependencies
npm install

# Start development server
npm run dev
```

> **Note:** The development server will automatically open at `http://localhost:5173`

---

## 🛠️ Tech Stack

| Language/Framework | Version | Purpose |
|-------------------|---------|---------|
| **React** | 19.2.0 | UI Framework |
| **Vite** | 7.2.2 | Build Tool & Dev Server |
| **Tailwind CSS** | 4.1.17 | Styling Framework |
| **Framer Motion** | 12.23.25 | Animation Library |
| **Lucide React** | 0.553.0 | Icon Components |
| **JavaScript** | ES6+ | Core Language |
| **ESLint** | 9.39.1 | Code Quality |

---

## 📂 Project Structure

```plaintext
Syntax-Analyzer/
├── public/
│   └── LOGO.svg              # Logo asset
├── src/
│   ├── components/           # React UI components
│   │   ├── AbstractSyntaxTree.jsx
│   │   ├── SyntaxDashboard.jsx
│   │   ├── TextArea.jsx
│   │   └── ErrorConsole.jsx
│   ├── core/                 # Language processing
│   │   ├── ASTBuilder.js
│   │   ├── LexicalScanner.js
│   │   └── SyntaxAnalyzer.js
│   ├── hooks/                # State management
│   │   ├── useDashboard.js
│   │   └── useTheme.js
│   ├── data/                 # Test cases
│   │   └── codeSamples.js
│   ├── App.jsx               # Main application component
│   ├── index.css             # Global styles
│   └── main.jsx              # Application entry point
├── .gitignore               # Git ignore rules
├── README.md                # This documentation
├── eslint.config.js         # ESLint configuration
├── index.html               # HTML template
├── package.json             # Dependencies and scripts
├── postcss.config.cjs       # PostCSS configuration
├── tailwind.config.cjs      # Tailwind CSS configuration
└── vite.config.js           # Vite build configuration
```

---

## 📖 Usage Guide

### Basic Workflow

1. **Enter Code** – Type your E.C.H.O source code in the editor
2. **Load Samples** – Use pre-loaded test cases for quick testing
3. **Analyze** – Click "Analyze Code" to run syntax validation
4. **Review Errors** – Click any error to jump to its location

### Example Usage

```echo
start
  string message = "Hello, ECHO!"
  number counter = 5
  
  for counter from 1 to 5
    echo "Count: @counter"
  end for
end
```

> **Tip:** Use the AST viewer to understand the hierarchical structure of your E.C.H.O code.

---

> This syntax analyzer is designed as an educational tool to help students understand programming language parsing, grammar validation, and abstract syntax tree construction through interactive visualization.
