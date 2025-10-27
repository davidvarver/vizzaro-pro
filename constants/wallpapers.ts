export interface Wallpaper {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string; // Main image for backward compatibility
  imageUrls: string[]; // Array of multiple images
  category: string;
  style: string;
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
}

export const wallpapers: Wallpaper[] = [
  {
    id: '1',
    name: 'Papel Tapiz Floral Elegante',
    description: 'Diseño floral clásico con toques dorados sobre fondo crema',
    price: 45.99,
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop&auto=format&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&auto=format&q=80'
    ],
    category: 'Floral',
    style: 'Clásico',
    colors: ['Crema', 'Dorado', 'Verde'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'Vinilo',
      washable: true,
      removable: true,
      textured: false,
    },
    inStock: true,
    rating: 4.8,
    reviews: 124,
  },
  {
    id: '2',
    name: 'Diseño Geométrico Moderno',
    description: 'Patrones geométricos contemporáneos en tonos neutros',
    price: 52.99,
    imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=400&fit=crop&auto=format&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=400&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&auto=format&q=80'
    ],
    category: 'Geométrico',
    style: 'Moderno',
    colors: ['Gris', 'Blanco', 'Negro'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'No tejido',
      washable: true,
      removable: true,
      textured: true,
    },
    inStock: true,
    rating: 4.6,
    reviews: 89,
  },
  {
    id: '3',
    name: 'Textura Minimalista',
    description: 'Textura sutil y elegante para espacios modernos',
    price: 38.99,
    imageUrl: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=400&h=400&fit=crop&auto=format&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=400&h=400&fit=crop&auto=format&q=80'
    ],
    category: 'Textura',
    style: 'Minimalista',
    colors: ['Beige', 'Blanco'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'Papel',
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
    name: 'Rayas Verticales Clásicas',
    description: 'Rayas verticales elegantes que agrandan visualmente el espacio',
    price: 41.99,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&auto=format&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=400&h=400&fit=crop&auto=format&q=80'
    ],
    category: 'Rayas',
    style: 'Clásico',
    colors: ['Azul', 'Blanco'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'Vinilo',
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
    name: 'Mármol Luxury',
    description: 'Efecto mármol sofisticado para espacios de lujo',
    price: 68.99,
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&auto=format&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=400&fit=crop&auto=format&q=80'
    ],
    category: 'Textura',
    style: 'Luxury',
    colors: ['Blanco', 'Gris', 'Dorado'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'Vinilo Premium',
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
    name: 'Tropical Paradise',
    description: 'Hojas tropicales vibrantes para un ambiente fresco',
    price: 49.99,
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&auto=format&q=80'
    ],
    category: 'Tropical',
    style: 'Moderno',
    colors: ['Verde', 'Blanco', 'Rosa'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'No tejido',
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
    name: 'Brewster 2969-26028 Pacifica',
    description: 'Diseño tropical con hojas de palma en tonos verdes sobre fondo claro',
    price: 55.99,
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format&q=80'
    ],
    category: 'Tropical',
    style: 'Moderno',
    colors: ['Verde', 'Blanco'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'No tejido',
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
    name: 'Brewster 2969-26027 Pacifica',
    description: 'Patrón de hojas tropicales en tonos verdes y blancos, estilo contemporáneo',
    price: 55.99,
    imageUrl: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=400&h=400&fit=crop&auto=format&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=400&h=400&fit=crop&auto=format&q=80'
    ],
    category: 'Tropical',
    style: 'Moderno',
    colors: ['Verde', 'Blanco'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'No tejido',
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
    name: 'Brewster 2969-26029 Pacifica',
    description: 'Diseño de hojas tropicales grandes en tonos verdes vibrantes',
    price: 55.99,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&auto=format&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&auto=format&q=80'
    ],
    category: 'Tropical',
    style: 'Moderno',
    colors: ['Verde', 'Blanco'],
    dimensions: {
      width: 0.53,
      height: 10.05,
      coverage: 5.33,
    },
    specifications: {
      material: 'No tejido',
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
  return ['Todos', ...Array.from(categorySet).sort()];
}

export function getStylesFromWallpapers(wallpaperList: Wallpaper[]): string[] {
  const styleSet = new Set<string>();
  wallpaperList.forEach(w => {
    if (w.style) {
      styleSet.add(w.style);
    }
  });
  return ['Todos', ...Array.from(styleSet).sort()];
}

export function getColorsFromWallpapers(wallpaperList: Wallpaper[]): string[] {
  const colorSet = new Set<string>();
  wallpaperList.forEach(w => {
    if (w.colors && Array.isArray(w.colors)) {
      w.colors.forEach(color => colorSet.add(color));
    }
  });
  return ['Todos', ...Array.from(colorSet).sort()];
}

export const categories = [
  'Todos',
  'Floral',
  'Geométrico',
  'Textura',
  'Rayas',
  'Tropical',
];

export const styles = [
  'Todos',
  'Moderno',
  'Clásico',
  'Minimalista',
  'Luxury',
];

export const colors = [
  'Todos',
  'Blanco',
  'Gris',
  'Beige',
  'Azul',
  'Verde',
  'Rosa',
  'Dorado',
  'Negro',
];