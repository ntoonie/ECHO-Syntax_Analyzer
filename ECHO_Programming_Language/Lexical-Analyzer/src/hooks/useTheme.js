/**
 * =========================================
 * Title: Theme Hook – Dark Mode Manager
 * =========================================
 */

import { useEffect, useState } from 'react';

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Hydrate from localStorage to prevent theme flicker.
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

  useEffect(() => {
    // Sync theme changes to DOM and localStorage.
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    void html.offsetHeight;
  }, [isDarkMode]);

  const toggleTheme = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setIsDarkMode((prev) => !prev);
  };

  return { isDarkMode, toggleTheme };
}
