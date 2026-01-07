export interface Wallpaper {
  id: string;
  publicSku?: string; // Added for search/display
  name: string;
  description: string;
  price: number;
  imageUrl: string; // Main image for backward compatibility
  imageUrls: string[]; // Array of multiple images
  category: string;
  style: string;
  group?: string; // NEW: To identify variants of the same model
  colors: string[];
  dimensions: {
    width: number; // in meters
    height: number; // in meters
    coverage: number; // square meters per roll
    weight?: number; // weight in kg per roll
  };
  specifications: {
    material: string;
    washable: boolean;
    removable: boolean;
    textured: boolean;
  };
  inStock: boolean;
  rating: number;
  reviews: number;
  showInHome?: boolean;
  patternRepeat?: number;
  patternMatch?: string;
}

export const wallpapers: Wallpaper[] = [
  // VARIANT GROUP 1: Floral
  {
    id: '1a',
    publicSku: 'VIZ-1042-CR',
    name: 'Elegant Floral - Cream & Gold',
    description: 'Classic floral design with gold touches on a cream background',
    price: 45.99,
    imageUrl: 'https://images.unsplash.com/photo-1628191011993-47926719266f?q=80&w=800&auto=format&fit=crop',
    imageUrls: [
      'https://images.unsplash.com/photo-1628191011993-47926719266f?q=80&w=800&auto=format&fit=crop'
    ],
    category: 'Floral',
    style: 'Classic',
    group: 'floral-elegant', // GROUP KEY
    colors: ['Cream', 'Gold'],
    dimensions: { width: 0.53, height: 10.05, coverage: 5.33 },
    specifications: { material: 'Vinyl', washable: true, removable: true, textured: false },
    inStock: true,
    rating: 4.8,
    reviews: 124,
  },
  {
    id: '1b',
    publicSku: 'VIZ-1042-GR',
    name: 'Elegant Floral - Green',
    description: 'Classic floral design with lush green tones',
    price: 45.99,
    imageUrl: 'https://images.unsplash.com/photo-1615800001869-7c70c0617578?q=80&w=800&auto=format&fit=crop', // Different image
    imageUrls: [
      'https://images.unsplash.com/photo-1615800001869-7c70c0617578?q=80&w=800&auto=format&fit=crop'
    ],
    category: 'Floral',
    style: 'Classic',
    group: 'floral-elegant', // SAME GROUP KEY
    colors: ['Green'],
    dimensions: { width: 0.53, height: 10.05, coverage: 5.33 },
    specifications: { material: 'Vinyl', washable: true, removable: true, textured: false },
    inStock: true,
    rating: 4.8,
    reviews: 12,
  },

  // VARIANT GROUP 2: Geometric
  {
    id: '2a',
    publicSku: 'VIZ-8491-GY',
    name: 'Modern Geometric - Grey',
    description: 'Contemporary geometric patterns in neutral grey tones',
    price: 52.99,
    imageUrl: 'https://images.unsplash.com/photo-1549419137-c79659b9d3b7?q=80&w=800&auto=format&fit=crop',
    imageUrls: [
      'https://images.unsplash.com/photo-1549419137-c79659b9d3b7?q=80&w=800&auto=format&fit=crop'
    ],
    category: 'Geometric',
    style: 'Modern',
    group: 'geo-modern', // GROUP KEY
    colors: ['Grey', 'White'],
    dimensions: { width: 0.53, height: 10.05, coverage: 5.33 },
    specifications: { material: 'Non-woven', washable: true, removable: true, textured: true },
    inStock: true,
    rating: 4.6,
    reviews: 89,
  },
  {
    id: '2b',
    publicSku: 'VIZ-8491-BK',
    name: 'Modern Geometric - Black',
    description: 'Bold geometric patterns in black and white',
    price: 52.99,
    imageUrl: 'https://images.unsplash.com/photo-1617103197170-13ad8c14f686?q=80&w=800&auto=format&fit=crop', // Darker image
    imageUrls: [
      'https://images.unsplash.com/photo-1617103197170-13ad8c14f686?q=80&w=800&auto=format&fit=crop'
    ],
    category: 'Geometric',
    style: 'Modern',
    group: 'geo-modern', // SAME GROUP KEY
    colors: ['Black', 'White'],
    dimensions: { width: 0.53, height: 10.05, coverage: 5.33 },
    specifications: { material: 'Non-woven', washable: true, removable: true, textured: true },
    inStock: true,
    rating: 4.6,
    reviews: 22,
  },

  {
    id: '3',
    publicSku: 'VIZ-3320',
    name: 'Minimalist Texture',
    description: 'Subtle and elegant texture for modern spaces',
    price: 38.99,
    imageUrl: 'https://images.unsplash.com/photo-1596253406322-2623d24959db?q=80&w=800&auto=format&fit=crop', // Minimal Texture
    imageUrls: [
      'https://images.unsplash.com/photo-1596253406322-2623d24959db?q=80&w=800&auto=format&fit=crop'
    ],
    category: 'Texture',
    style: 'Minimalist',
    colors: ['Beige', 'White'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'Paper',
      washable: false,
      removable: true,
      textured: true,
    },
    inStock: true,
    rating: 4.7,
    reviews: 156,
  },
  {
    id: '4',
    publicSku: 'VIZ-5512',
    name: 'Classic Vertical Stripes',
    description: 'Elegant vertical stripes that visually enlarge space',
    price: 41.99,
    imageUrl: 'https://images.unsplash.com/photo-1549416872-466d338ddbf6?q=80&w=800&auto=format&fit=crop', // Vertical Stripes
    imageUrls: [
      'https://images.unsplash.com/photo-1549416872-466d338ddbf6?q=80&w=800&auto=format&fit=crop'
    ],
    category: 'Stripes',
    style: 'Classic',
    colors: ['Blue', 'White'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'Vinyl',
      washable: true,
      removable: true,
      textured: false,
    },
    inStock: true,
    rating: 4.5,
    reviews: 78,
  },
  {
    id: '5',
    publicSku: 'VIZ-9981',
    name: 'Luxury Marble',
    description: 'Sophisticated marble effect for luxury spaces',
    price: 68.99,
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&auto=format&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=400&fit=crop&auto=format&q=80'
    ],
    category: 'Texture',
    style: 'Luxury',
    colors: ['White', 'Grey', 'Gold'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'Premium Vinyl',
      washable: true,
      removable: true,
      textured: true,
    },
    inStock: true,
    rating: 4.9,
    reviews: 203,
  },
  {
    id: '6',
    publicSku: 'VIZ-1029',
    name: 'Tropical Paradise',
    description: 'Vibrant tropical leaves for a fresh atmosphere',
    price: 49.99,
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&auto=format&q=80'
    ],
    category: 'Tropical',
    style: 'Modern',
    colors: ['Green', 'White', 'Pink'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'Non-woven',
      washable: true,
      removable: true,
      textured: false,
    },
    inStock: false,
    rating: 4.4,
    reviews: 67,
  },
  {
    id: '7',
    publicSku: 'VIZ-2214',
    name: 'Brewster 2969-26028 Pacifica',
    description: 'Tropical design with palm leaves in green tones on light background',
    price: 55.99,
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format&q=80'
    ],
    category: 'Tropical',
    style: 'Modern',
    colors: ['Green', 'White'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'Non-woven',
      washable: true,
      removable: true,
      textured: false,
    },
    inStock: true,
    rating: 4.7,
    reviews: 45,
  },
  {
    id: '8',
    publicSku: 'VIZ-1193',
    name: 'Brewster 2969-26027 Pacifica',
    description: 'Tropical leaf pattern in green and white tones, contemporary style',
    price: 55.99,
    imageUrl: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=400&h=400&fit=crop&auto=format&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=400&h=400&fit=crop&auto=format&q=80'
    ],
    category: 'Tropical',
    style: 'Modern',
    colors: ['Green', 'White'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'Non-woven',
      washable: true,
      removable: true,
      textured: false,
    },
    inStock: true,
    rating: 4.6,
    reviews: 38,
  },
  {
    id: '9',
    publicSku: 'VIZ-6642',
    name: 'Brewster 2969-26029 Pacifica',
    description: 'Large tropical leaf design in vibrant green tones',
    price: 55.99,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&auto=format&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&auto=format&q=80'
    ],
    category: 'Tropical',
    style: 'Modern',
    colors: ['Green', 'White'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'Non-woven',
      washable: true,
      removable: true,
      textured: false,
    },
    inStock: true,
    rating: 4.8,
    reviews: 52,
  },
];

export function getCategoriesFromWallpapers(wallpaperList: Wallpaper[]): string[] {
  const categorySet = new Set<string>();
  wallpaperList.forEach(w => {
    if (w.category) {
      categorySet.add(w.category);
    }
  });
  return ['All', ...Array.from(categorySet).sort()];
}

export function getStylesFromWallpapers(wallpaperList: Wallpaper[]): string[] {
  const styleSet = new Set<string>();
  wallpaperList.forEach(w => {
    if (w.style) {
      styleSet.add(w.style);
    }
  });
  return ['All', ...Array.from(styleSet).sort()];
}

export function getColorsFromWallpapers(wallpaperList: Wallpaper[]): string[] {
  const colorSet = new Set<string>();
  wallpaperList.forEach(w => {
    if (w.colors && Array.isArray(w.colors)) {
      w.colors.forEach(color => colorSet.add(color));
    }
  });
  return ['All', ...Array.from(colorSet).sort()];
}

export const categories = [
  'All',
  'Floral',
  'Geometric',
  'Texture',
  'Stripes',
  'Tropical',
];

export const styles = [
  'All',
  'Modern',
  'Classic',
  'Minimalist',
  'Luxury',
];

export const colors = [
  'All',
  'White',
  'Grey',
  'Beige',
  'Blue',
  'Green',
  'Pink',
  'Gold',
  'Black',
];