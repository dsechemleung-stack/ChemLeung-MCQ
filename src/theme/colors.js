// Premium Academic Color Scheme for ChemLeung HKDSE MCQ Platform

export const colors = {
  // Primary Academic Colors
  primary: {
    charcoal: '#2C3E50',      // Deep charcoal for headers
    slate: '#34495E',          // Slate for backgrounds
    lightSlate: '#5D6D7E',     // Light slate for secondary text
    paleSlate: '#ECF0F1',      // Very light slate for cards
  },
  
  // Academic Gold Accent
  gold: {
    main: '#D4AF37',           // Classic academic gold
    light: '#F4E4C1',          // Light gold for highlights
    dark: '#B8941F',           // Dark gold for active states
  },
  
  // Semantic Colors
  success: '#27AE60',          // Green for correct answers
  error: '#E74C3C',            // Red for incorrect
  warning: '#F39C12',          // Orange for flagged
  info: '#3498DB',             // Blue for information
  
  // Neutral Palette
  neutral: {
    white: '#FFFFFF',
    lightGray: '#F8F9FA',
    gray: '#BDC3C7',
    darkGray: '#7F8C8D',
    black: '#2C3E50',
  },
  
  // Text Colors (ensuring contrast)
  text: {
    primary: '#2C3E50',        // Dark charcoal - excellent contrast
    secondary: '#5D6D7E',      // Light slate
    inverse: '#FFFFFF',        // White text on dark backgrounds
    gold: '#B8941F',           // Dark gold for emphasis
  },
  
  // Background Colors
  background: {
    page: '#F5F7FA',           // Very light gray-blue
    card: '#FFFFFF',           // White cards
    cardAlt: '#ECF0F1',        // Pale slate alternative
    dark: '#2C3E50',           // Dark backgrounds
  }
};

// Tailwind CSS extension
export const tailwindColors = {
  'academic-charcoal': colors.primary.charcoal,
  'academic-slate': colors.primary.slate,
  'academic-light-slate': colors.primary.lightSlate,
  'academic-pale-slate': colors.primary.paleSlate,
  'academic-gold': colors.gold.main,
  'academic-gold-light': colors.gold.light,
  'academic-gold-dark': colors.gold.dark,
};