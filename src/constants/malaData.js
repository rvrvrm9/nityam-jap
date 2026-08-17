export const MALA_OPTIONS = [
  {
    id: "om",
    nameEn: "Om Mala",
    nameHi: "ॐ माला",
    tagline: "Universal Sound",
    desc: "Universal sound of creation. Fosters inner peace, cosmic connection, and deep meditation.",
    color: "#EA580C",
    bgGradient: ["#FFFBF5", "#FFEDE0"],
    glowColor: "rgba(234, 88, 12, 0.15)"
  },
  {
    id: "rudraksha",
    nameEn: "Rudraksha",
    nameHi: "रुद्राक्ष",
    tagline: "Shiva Devotion",
    desc: "Sacred organic seeds. Brings focus, peace, and spiritual protection.",
    color: "#D97706",
    bgGradient: ["#FFF8F5", "#FFEBE0"],
    glowColor: "rgba(217, 119, 6, 0.15)"
  },
  {
    id: "tulsi",
    nameEn: "Tulsi",
    nameHi: "तुलसी",
    tagline: "Vishnu Devotion",
    desc: "Holy wood of Tulsi. Fosters purity, devotion, and calm energy.",
    color: "#4E6A3B",
    bgGradient: ["#FCFAF5", "#F5EFE0"],
    glowColor: "rgba(78, 106, 59, 0.1)"
  },
  {
    id: "chandan",
    nameEn: "Chandan",
    nameHi: "चंदन",
    tagline: "Cooling & Peace",
    desc: "Fragrant sandalwood. Calms the mind and relieves mental stress.",
    color: "#B5491F",
    bgGradient: ["#FFF6F5", "#FFE6E3"],
    glowColor: "rgba(181, 73, 31, 0.15)"
  },
  {
    id: "crystal",
    nameEn: "Sphatik (Crystal)",
    nameHi: "क्रिस्टल / स्फटिक",
    tagline: "Clarity & Healing",
    desc: "Cooling quartz crystals. Purifies the aura and sharpens mental focus.",
    color: "#0284C7",
    bgGradient: ["#F0F9FF", "#E0F2FE"],
    glowColor: "rgba(2, 132, 199, 0.15)"
  },
  {
    id: "kamalgatta",
    nameEn: "Kamal Beej",
    nameHi: "कमल बीज",
    tagline: "Prosperity",
    desc: "Lotus seed beads dear to Lakshmi. Attracts success and abundance.",
    color: "#78350F",
    bgGradient: ["#FAF8F5", "#F2ECE7"],
    glowColor: "rgba(120, 53, 15, 0.1)"
  },
  {
    id: "karungali",
    nameEn: "Karungali",
    nameHi: "करुंगली",
    tagline: "Ebony Protection",
    desc: "Black ebony wood. Protects against negativity and obstacles.",
    color: "#374151",
    bgGradient: ["#F9FAFB", "#F3F4F6"],
    glowColor: "rgba(55, 65, 81, 0.08)"
  }
];

export const MALA_THEMES = {
  rudraksha: {
    filledFill: "#E5C158",
    filledStroke: "#E5C158",
    emptyFill: "#2F261E",
    emptyStroke: "#5C3A21",
    centerGlow: "#E5C158",
    centerShadow: "rgba(229, 193, 88, 0.25)"
  },
  tulsi: {
    filledFill: "#E5C158",
    filledStroke: "#E5C158",
    emptyFill: "#2B2822",
    emptyStroke: "#4F493E",
    centerGlow: "#E5C158",
    centerShadow: "rgba(229, 193, 88, 0.25)"
  },
  chandan: {
    filledFill: "#E5C158",
    filledStroke: "#E5C158",
    emptyFill: "#2B1E1C",
    emptyStroke: "#593D39",
    centerGlow: "#E5C158",
    centerShadow: "rgba(229, 193, 88, 0.25)"
  },
  crystal: {
    filledFill: "#E5C158",
    filledStroke: "#E5C158",
    emptyFill: "#1F2B30",
    emptyStroke: "#3A4F57",
    centerGlow: "#E5C158",
    centerShadow: "rgba(229, 193, 88, 0.25)"
  },
  kamalgatta: {
    filledFill: "#E5C158",
    filledStroke: "#E5C158",
    emptyFill: "#1E1815",
    emptyStroke: "#3F322B",
    centerGlow: "#E5C158",
    centerShadow: "rgba(229, 193, 88, 0.25)"
  },
  karungali: {
    filledFill: "#E5C158",
    filledStroke: "#E5C158",
    emptyFill: "#1A1A1A",
    emptyStroke: "#2C2C2C",
    centerGlow: "#E5C158",
    centerShadow: "rgba(229, 193, 88, 0.25)"
  },
  om: {
    filledFill: "#E5C158",
    filledStroke: "#E5C158",
    emptyFill: "#2D1D16",
    emptyStroke: "#5E3B2E",
    centerGlow: "#E5C158",
    centerShadow: "rgba(229, 193, 88, 0.25)"
  }
};

export const MANTRA_LABELS = {
  rudraksha: "ॐ नमः शिवाय",
  tulsi: "राम / कृष्ण",
  chandan: "ॐ नमो भगवते वासुदेवाय",
  crystal: "ॐ श्रीं",
  kamalgatta: "ॐ महालक्ष्म्यै नमः",
  karungali: "ॐ मुरुगा",
  om: "ॐ"
};

export const MALA_COOLDOWNS = {
  rudraksha: 1600,
  kamalgatta: 1600,
  karungali: 1000,
  crystal: 1200,
  tulsi: 1000,
  chandan: 2000,
  om: 1000
};
// Force Cache Invalidation Comment for Om Mala Position Move
