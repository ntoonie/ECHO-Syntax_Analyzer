# 🎯 E.C.H.O Lexical Analyzer

[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Educational](https://img.shields.io/badge/Purpose-Educational-yellow.svg)](LICENSE)

---

Real-time lexical analyzer that transforms E.C.H.O source code into structured tokens for educational programming language development.

---

## 🚀 Features

- **Real-Time Tokenization** – Instant visual feedback as you type E.C.H.O source code
- **Color-Coded Display** – Visual distinction between keywords, identifiers, operators, and literals
- **Interactive Token Table** – Comprehensive view with line numbers, types, and lexemes
- **Sample Code Library** – Pre-loaded examples for immediate testing and learning
- **Responsive Design** – Seamless experience across desktop, tablet, and mobile devices

---

## ⚙️ Getting Started

```bash
# Clone the repository
git clone https://github.com/ntoonie/ECHO_Programming_Language.git
cd ECHO_Programming_Language/Lexical-Analyzer

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
| **JavaScript** | ES6+ | Core Language |
| **ESLint** | Latest | Code Quality |

---

## 📂 Project Structure

```plaintext
Lexical-Analyzer/
├── public/
│   └── vite.svg                 # Vite logo
├── src/
│   ├── components/
│   │   ├── Editor.jsx           # Code input editor component
│   │   ├── TokenTable.jsx       # Token display table
│   │   └── Legend.jsx           # Token category reference
│   ├── core/
│   │   └── tokenizer.js         # Core tokenization logic
│   ├── assets/                  # Static assets
│   ├── App.jsx                  # Main application component
│   ├── index.css                # Global styles
│   └── main.jsx                 # Application entry point
├── .gitignore                   # Git ignore rules
├── README.md                    # This documentation
├── eslint.config.js             # ESLint configuration
├── index.html                   # HTML template
├── package.json                 # Dependencies and scripts
└── vite.config.js               # Vite build configuration
```

---

## 📖 Usage Guide

### Basic Workflow

1. **Write Code** – Type your E.C.H.O source code in the editor
2. **Load Examples** – Use sample code buttons for quick testing
3. **Analyze** – Click "Analyze Code" to tokenize your input
4. **Review Results** – Examine the structured token output

### Example Usage

```echo
start
    number x = 10
    number y = 20
    number sum = x + y
    echo "The sum is: @sum"
end
```

> **Tip:** Use the sample code loader to explore different E.C.H.O language features and see how they're tokenized.

### Token Categories Reference

| Category | Examples | Visual Color |
|----------|----------|--------------|
| **Keywords** | `start`, `end`, `number`, `if` | 🔵 Blue |
| **Identifiers** | `x`, `sum`, `myVariable` | 🟢 Green |
| **Operators** | `+`, `-`, `=`, `>` | 🟠 Orange |
| **Literals** | `42`, `"Hello"`, `true` | 🟣 Purple |
| **Delimiters** | `(`, `)`, `,`, `:` | ⚫ Gray |

---

> This lexical analyzer is designed as an educational tool to help students understand how programming languages parse and tokenize source code. It provides immediate visual feedback to make the abstract concept of lexical analysis concrete and interactive.
