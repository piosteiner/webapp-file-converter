// Theme Switcher Module
// Handles theme toggling and persistence

(function() {
    'use strict';
    
    // Constants
    const THEME_KEY = 'preferred-theme';
    const LIGHT_THEME = 'light';
    const DARK_THEME = 'dark';
    const SYSTEM_THEME = 'system';
    
    // Theme state
    let currentTheme = localStorage.getItem(THEME_KEY) || SYSTEM_THEME;
    
    // Initialize theme on page load
    document.addEventListener('DOMContentLoaded', function() {
        initializeTheme();
        createThemeToggle();
        applyTheme(currentTheme);
    });
    
    // Create theme toggle button
    function createThemeToggle() {
        // Create toggle container
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'theme-toggle-container';
        toggleContainer.innerHTML = `
            <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
                <span class="theme-toggle-icon">
                    <span class="sun-icon">☀️</span>
                    <span class="moon-icon">🌙</span>
                    <span class="system-icon">💻</span>
                </span>
                <span class="theme-toggle-label">Theme</span>
            </button>
            <div class="theme-menu" id="themeMenu">
                <button class="theme-option" data-theme="light">
                    <span class="theme-option-icon">☀️</span>
                    <span class="theme-option-label">Light</span>
                    <span class="theme-option-check">✓</span>
                </button>
                <button class="theme-option" data-theme="dark">
                    <span class="theme-option-icon">🌙</span>
                    <span class="theme-option-label">Dark</span>
                    <span class="theme-option-check">✓</span>
                </button>
                <button class="theme-option" data-theme="system">
                    <span class="theme-option-icon">💻</span>
                    <span class="theme-option-label">System</span>
                    <span class="theme-option-check">✓</span>
                </button>
            </div>
        `;
        
        // Insert into page
        document.body.appendChild(toggleContainer);
        
        // Add event listeners
        const toggleButton = document.getElementById('themeToggle');
        const themeMenu = document.getElementById('themeMenu');
        const themeOptions = document.querySelectorAll('.theme-option');
        
        // Toggle menu on button click
        toggleButton.addEventListener('click', function(e) {
            e.stopPropagation();
            themeMenu.classList.toggle('show');
        });
        
        // Handle theme selection
        themeOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                const selectedTheme = this.dataset.theme;
                setTheme(selectedTheme);
                themeMenu.classList.remove('show');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function() {
            themeMenu.classList.remove('show');
        });
        
        // Prevent menu from closing when clicking inside
        themeMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Initialize theme from localStorage or system preference
    function initializeTheme() {
        // Check for saved preference
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme) {
            currentTheme = savedTheme;
        } else {
            // Default to system preference
            currentTheme = SYSTEM_THEME;
        }
    }
    
    // Apply theme to document
    function applyTheme(theme) {
        const root = document.documentElement;
        
        // Remove existing theme classes
        root.classList.remove('theme-light', 'theme-dark', 'theme-system');
        
        // Apply new theme
        if (theme === LIGHT_THEME) {
            root.classList.add('theme-light');
        } else if (theme === DARK_THEME) {
            root.classList.add('theme-dark');
        } else {
            // System theme - let CSS media queries handle it
            root.classList.add('theme-system');
        }
        
        // Update active state in menu
        updateActiveOption(theme);
        
        // Update toggle button icon
        updateToggleIcon(theme);
    }
    
    // Set and save theme
    function setTheme(theme) {
        currentTheme = theme;
        localStorage.setItem(THEME_KEY, theme);
        applyTheme(theme);
    }
    
    // Update active option in menu
    function updateActiveOption(theme) {
        const options = document.querySelectorAll('.theme-option');
        options.forEach(option => {
            if (option.dataset.theme === theme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }
    
    // Update toggle button icon based on current theme
    function updateToggleIcon(theme) {
        const toggle = document.querySelector('.theme-toggle');
        if (!toggle) return;
        
        // Remove all active states
        toggle.classList.remove('light-active', 'dark-active', 'system-active');
        
        // Add current theme state
        if (theme === LIGHT_THEME) {
            toggle.classList.add('light-active');
        } else if (theme === DARK_THEME) {
            toggle.classList.add('dark-active');
        } else {
            toggle.classList.add('system-active');
        }
    }
    
    // Listen for system theme changes when in system mode
    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeQuery.addEventListener('change', function() {
            if (currentTheme === SYSTEM_THEME) {
                // Re-apply system theme to reflect the change
                applyTheme(SYSTEM_THEME);
            }
        });
    }
    
    // Export for use in other scripts if needed
    window.themeManager = {
        setTheme: setTheme,
        getTheme: function() { return currentTheme; },
        toggleTheme: function() {
            // Quick toggle between light and dark
            const newTheme = (currentTheme === DARK_THEME) ? LIGHT_THEME : DARK_THEME;
            setTheme(newTheme);
        }
    };
})();