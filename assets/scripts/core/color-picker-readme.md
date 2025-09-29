/**
 * Modern Color Picker Integration Guide
 * 
 * The ModernColorPicker component replaces the default HTML color input
 * with a sleek, embedded color picker that matches the app's design.
 * 
 * Features:
 * - Interactive HSL color area with saturation/lightness control
 * - Hue strip for color selection
 * - HEX and RGB input fields
 * - Color presets for quick selection
 * - Responsive design that works on mobile
 * - Seamless integration with existing CSS variables
 * 
 * Usage:
 * 
 * 1. Include the CSS and JS files:
 *    - assets/styles/components/color-picker.css
 *    - assets/scripts/core/color-picker.js
 * 
 * 2. Create a container element in your HTML:
 *    <div id="myColorPicker"></div>
 * 
 * 3. Initialize the color picker in JavaScript:
 *    const picker = new ModernColorPicker(document.getElementById('myColorPicker'), {
 *        initialColor: '#ff0000',
 *        showPresets: true,
 *        onChange: (color) => {
 *            console.log('Color changed:', color);
 *        }
 *    });
 * 
 * Options:
 * - initialColor: Starting color (hex format)
 * - showPresets: Show quick color presets (default: true)
 * - showAlpha: Show alpha/opacity control (default: false)
 * - onChange: Callback function when color changes
 * 
 * The color picker automatically:
 * - Positions itself below the trigger button
 * - Closes when clicking outside
 * - Supports keyboard navigation
 * - Works with touch devices
 * - Matches the app's theme (dark/light)
 */