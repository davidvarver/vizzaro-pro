const { authMiddleware } = require('../_authMiddleware');

const initialWallpapers = [
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
];

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const authResult = authMiddleware(req);
  if (!authResult.success) {
    return res.status(401).json({ success: false, error: authResult.error });
  }

  try {
    console.log('[Catalog RESET] Resetting catalog to default...');
    
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    
    console.log('[Catalog RESET] KV URL configured:', !!kvUrl);
    console.log('[Catalog RESET] KV Token configured:', !!kvToken);
    
    const kvConfigured = kvUrl && kvUrl !== 'your_vercel_kv_url' && kvToken && kvToken !== 'your_vercel_kv_token';
    
    if (!kvConfigured) {
      console.warn('[Catalog RESET] KV not configured');
      return res.status(503).json({
        success: false,
        error: 'Base de datos no configurada',
        needsConfig: true
      });
    }

    console.log('[Catalog RESET] Deleting current catalog...');
    await fetch(`${kvUrl}/del/wallpapers_catalog`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
      },
    });

    console.log('[Catalog RESET] Setting default catalog...');
    const kvResponse = await fetch(`${kvUrl}/set/wallpapers_catalog`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(initialWallpapers),
    });

    if (!kvResponse.ok) {
      const errorText = await kvResponse.text();
      console.error('[Catalog RESET] KV error:', kvResponse.status, errorText);
      throw new Error(`KV error: ${kvResponse.status}`);
    }

    const kvData = await kvResponse.json();
    console.log('[Catalog RESET] KV response:', kvData);
    
    const timestamp = Date.now();
    console.log('[Catalog RESET] Catalog reset successfully. Timestamp:', timestamp);
    
    return res.status(200).json({ 
      success: true,
      message: 'Catálogo reseteado correctamente',
      catalog: initialWallpapers,
      timestamp
    });
  } catch (error) {
    console.error('[Catalog RESET] Error resetting catalog:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error al resetear el catálogo',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
}
