import { z } from 'zod';

export const userRegisterSchema = z.object({
  email: z.string().email('Email inválido').min(3).max(255),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(100),
  name: z.string().min(1, 'El nombre es requerido').max(100),
});

export const userLoginSchema = z.object({
  email: z.string().email('Email inválido').min(3).max(255),
  password: z.string().min(1, 'La contraseña es requerida').max(100),
});

export const orderCreateSchema = z.object({
  order: z.object({
    userId: z.string().min(1, 'userId requerido'),
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().nonnegative(),
    })).min(1, 'Debe haber al menos un item'),
    total: z.number().nonnegative().optional(),
    status: z.enum(['pending', 'processing', 'completed', 'cancelled']).optional(),
    paymentMethod: z.string().optional(),
    paymentReference: z.string().optional(),
    shippingAddress: z.string().optional(),
    customerName: z.string().optional(),
    customerEmail: z.string().email().optional(),
    customerPhone: z.string().optional(),
  }),
});

export const catalogItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'El nombre es requerido').max(200),
  description: z.string().max(2000).optional().default(''),
  price: z.number().nonnegative('El precio debe ser positivo').default(0),
  imageUrl: z.string().url('URL de imagen inválida').or(z.literal('')).optional().default(''),
  imageUrls: z.array(z.string()).optional().default([]),
  category: z.string().optional().default('General'),
  style: z.string().optional().default('Moderno'),
  colors: z.array(z.string()).optional().default([]),
  dimensions: z.object({
    width: z.number().positive().default(0.53),
    height: z.number().positive().default(10.05),
    coverage: z.number().positive().default(5.33),
    weight: z.number().optional(),
  }).optional().default({ width: 0.53, height: 10.05, coverage: 5.33 }),
  specifications: z.object({
    material: z.string().default('Vinilo'),
    washable: z.boolean().default(true),
    removable: z.boolean().default(true),
    textured: z.boolean().default(false),
  }).optional().default({ material: 'Vinilo', washable: true, removable: true, textured: false }),
  inStock: z.boolean().optional().default(true),
  rating: z.number().min(0).max(5).optional().default(0),
  reviews: z.number().int().nonnegative().optional().default(0),
  showInHome: z.boolean().optional().default(false),
  featured: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export const catalogUpdateSchema = z.object({
  catalog: z.array(catalogItemSchema).min(1, 'El catálogo debe tener al menos un item'),
});

export const collectionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  wallpaperIds: z.array(z.string()).optional(),
});

export const collectionsUpdateSchema = z.object({
  collections: z.array(collectionSchema),
});

export const verificationEmailSchema = z.object({
  email: z.string().email('Email inválido'),
  code: z.string().length(6, 'El código debe tener 6 dígitos'),
});

export function validateRequest(schema, data) {
  try {
    return {
      success: true,
      data: schema.parse(data),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    return {
      success: false,
      errors: [{ path: 'unknown', message: 'Error de validación desconocido' }],
    };
  }
}
