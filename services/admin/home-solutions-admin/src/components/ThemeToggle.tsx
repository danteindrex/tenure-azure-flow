'use client'
import React, { useEffect, useState } from 'react'

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    // Get initial theme from localStorage or default to dark
    const savedTheme = localStorage.getItem('admin-theme') as 'dark' | 'light' || 'dark'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('admin-theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  useEffect(() => {
    // Inject the theme toggle button into the DOM
    const injectToggleButton = () => {
      if (!document.querySelector('.theme-toggle')) {
        const button = document.createElement('button')
        button.className = 'theme-toggle'
        button.innerHTML = theme === 'dark' ? '☀️ Light' : '🌙 Dark'
        button.onclick = toggleTheme
        
        document.body.appendChild(button)
      } else {
        // Update existing button
        const existingButton = document.querySelector('.theme-toggle')
        if (existingButton) {
          existingButton.innerHTML = theme === 'dark' ? '☀️ Light' : '🌙 Dark'
        }
      }
    }

    // Initial injection
    setTimeout(injectToggleButton, 100)
    
    // Re-inject on navigation changes
    const observer = new MutationObserver(() => {
      if (!document.querySelector('.theme-toggle')) {
        setTimeout(injectToggleButton, 100)
      }
    })
    
    observer.observe(document.body, { childList: true, subtree: true })
    
    return () => observer.disconnect()
  }, [theme])

  return null // This component doesn't render anything visible
}

export default ThemeToggle