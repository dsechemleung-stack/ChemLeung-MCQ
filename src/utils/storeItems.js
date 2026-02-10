// ============================================================================
// STORE ITEMS - ChemStore Catalog
// ============================================================================

export const STORE_ITEMS = {
  // ────────── PROFILE PICTURES ──────────
  profilePics: [
    {
      id: 'flask_blue',
      name: 'Blue Flask',
      description: 'Classic chemistry icon',
      price: 0,
      icon: '🧪',
      rarity: 'common',
      category: 'profilePic'
    },
    {
      id: 'atom_green',
      name: 'Green Atom',
      description: 'Atomic structure design',
      price: 50,
      icon: '⚛️',
      rarity: 'common',
      category: 'profilePic'
    },
    {
      id: 'molecule',
      name: 'Molecule Master',
      description: 'For molecular enthusiasts',
      price: 100,
      icon: '🔬',
      rarity: 'uncommon',
      category: 'profilePic'
    },
    {
      id: 'fire',
      name: 'Combustion King',
      description: 'Exothermic reactions only',
      price: 150,
      icon: '🔥',
      rarity: 'uncommon',
      category: 'profilePic'
    },
    {
      id: 'lightning',
      name: 'Electrochemist',
      description: 'Charged with energy',
      price: 200,
      icon: '⚡',
      rarity: 'rare',
      category: 'profilePic'
    },
    {
      id: 'crystal',
      name: 'Crystal Scholar',
      description: 'Perfectly structured',
      price: 250,
      icon: '💎',
      rarity: 'rare',
      category: 'profilePic'
    },
    {
      id: 'explosion',
      name: 'Reaction Expert',
      description: 'Explosive personality',
      price: 300,
      icon: '💥',
      rarity: 'epic',
      category: 'profilePic'
    },
    {
      id: 'star',
      name: 'Chemistry Star',
      description: 'Shine bright like neon',
      price: 400,
      icon: '⭐',
      rarity: 'epic',
      category: 'profilePic'
    },
    {
      id: 'crown',
      name: 'Noble Gas King',
      description: 'Unreactive royalty',
      price: 500,
      icon: '👑',
      rarity: 'legendary',
      category: 'profilePic'
    },
    {
      id: 'trophy',
      name: 'Grand Master',
      description: 'Ultimate achievement',
      price: 1000,
      icon: '🏆',
      rarity: 'legendary',
      category: 'profilePic'
    }
  ],

  // ────────── BADGES ──────────
  badges: [
    {
      id: 'beginner',
      name: 'Beginner Badge',
      description: 'Your first steps',
      price: 0,
      icon: '🎖️',
      rarity: 'common',
      category: 'badge'
    },
    {
      id: 'scholar',
      name: 'Scholar Badge',
      description: '100 questions solved',
      price: 200,
      icon: '📚',
      rarity: 'uncommon',
      category: 'badge'
    },
    {
      id: 'expert',
      name: 'Expert Badge',
      description: '500 questions mastered',
      price: 500,
      icon: '🎓',
      rarity: 'rare',
      category: 'badge'
    }
  ],

  // ────────── THEMES ──────────
  themes: [
    {
      id: 'default',
      name: 'Classic Blue',
      description: 'Original ChemLeung theme',
      price: 0,
      preview: 'linear-gradient(135deg, #2563eb, #1e40af)',
      rarity: 'common',
      category: 'theme'
    },
    {
      id: 'forest',
      name: 'Forest Green',
      description: 'Organic chemistry vibes',
      price: 150,
      preview: 'linear-gradient(135deg, #10b981, #059669)',
      rarity: 'uncommon',
      category: 'theme'
    },
    {
      id: 'sunset',
      name: 'Sunset Orange',
      description: 'Warm combustion colors',
      price: 200,
      preview: 'linear-gradient(135deg, #f97316, #ea580c)',
      rarity: 'rare',
      category: 'theme'
    },
    {
      id: 'royal',
      name: 'Royal Purple',
      description: 'Permanganate elegance',
      price: 300,
      preview: 'linear-gradient(135deg, #9333ea, #7e22ce)',
      rarity: 'epic',
      category: 'theme'
    }
  ]
};

// Flatten all items for easy lookup
export const ALL_ITEMS = [
  ...STORE_ITEMS.profilePics,
  ...STORE_ITEMS.badges,
  ...STORE_ITEMS.themes
];

// Get item by ID
export function getItemById(itemId) {
  return ALL_ITEMS.find(item => item.id === itemId);
}

// Rarity colors
export const RARITY_COLORS = {
  common: 'from-slate-400 to-slate-500',
  uncommon: 'from-green-400 to-green-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-amber-400 to-amber-600'
};

export const RARITY_BORDER = {
  common: 'border-slate-300',
  uncommon: 'border-green-300',
  rare: 'border-blue-300',
  epic: 'border-purple-300',
  legendary: 'border-amber-300'
};

export const RARITY_LABELS = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
};