/*
Theme Hook – Dark Mode State Management

Manages dark mode state and DOM theme synchronization.
Dependencies: React hooks (useState, useLayoutEffect)
*/

import { useState, useLayoutEffect } from 'react';

/*
Theme hook for dark mode management

@returns {Object} Theme state and toggle function
*/
export const useTheme = () => {
  // Initialize theme from localStorage and apply to DOM immediately
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    const shouldBeDark = savedTheme === 'dark';
    const root = window.document.documentElement;
    if (shouldBeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    return shouldBeDark;
  });

  // Synchronously update DOM class to prevent flash of wrong theme
  useLayoutEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    void html.offsetHeight;  // Force reflow
  }, [isDarkMode]);

  /*
  Handle theme toggle with DOM synchronization
  
  @param {Event} e - Click event
  */
  const handleThemeToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newMode = !isDarkMode;
    const html = document.documentElement;
    if (newMode) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    void html.offsetHeight;  // Force reflow  // Two spaces after code
    setIsDarkMode(newMode);
  };

  return { isDarkMode, handleThemeToggle };
};
