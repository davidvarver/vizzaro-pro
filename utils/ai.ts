import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const API_URL = 'https://toolkit.rork.com/images/edit/';

export interface AiProcessResult {
    processedBase64: string;
    maskBase64?: string; // If we start returning mask separately
}

// Helper to resize image
async function resizeImage(base64: string, label: string): Promise<string> {
    try {
        // Skip check for very small strings to be safe, just ensure it's a valid uri
        const uri = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;

        // Log original size
        console.log(`AI Processing [${label}]: Original Length:`, base64.length);

        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 512 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (result.base64) {
            console.log(`AI Processing [${label}]: Resized Length:`, result.base64.length);
            return result.base64;
        }
    } catch (error) {
        console.warn(`Failed to resize ${label}, using original:`, error);
    }
    return base64;
}

export async function processImageWithAI(
    imageBase64: string,
    wallpaperBase64: string,
    promptOverride?: string
): Promise<string> {

    // Default prompt if not provided
    const defaultPrompt = `You are an expert at applying wallpaper patterns to walls in photos with advanced wall detection capabilities.
    TASK: Apply the wallpaper pattern from the SECOND IMAGE onto the walls in the FIRST IMAGE.
    CRITICAL WALL DETECTION RULES:
    1. PRIMARY WALL IDENTIFICATION: Identify the largest continuous flat surface in the center (background).
    2. DISTINGUISH WALLS FROM NON-WALLS: Ignore furniture, people, objects.
    3. PATTERN EXTRACTION: Use pattern from second image.
    4. APPLICATION STRATEGY: Apply ONLY to the primary wall. Respect perspective and lighting.
    5. REALISM: Maintain shadows and depth.
    PRIORITY: Identify the PRIMARY WALL correctly and apply wallpaper ONLY to that wall surface.`;

    const prompt = promptOverride || defaultPrompt;

    // Resize input images
    const processedImageBase64 = await resizeImage(imageBase64, 'Source');

    // For mask generation, we use source as pattern, so we can reuse the resized image
    let processedWallpaperBase64 = wallpaperBase64;

    if (wallpaperBase64 === imageBase64) {
        processedWallpaperBase64 = processedImageBase64;
    } else {
        processedWallpaperBase64 = await resizeImage(wallpaperBase64, 'Pattern');
    }

    const cleanImageBase64 = processedImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const cleanWallpaperBase64 = processedWallpaperBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const requestBody = {
        prompt: prompt,
        images: [
            { type: 'image' as const, image: cleanImageBase64 },
            { type: 'image' as const, image: cleanWallpaperBase64 }
        ]
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI Service Error (${response.status}): ${errorText}`);
        }

        const result = await response.json();
        if (!result.image || !result.image.base64Data) {
            throw new Error('Invalid AI response format');
        }

        return result.image.base64Data;
    } catch (error) {
        clearTimeout(timeoutId);
        // Enhance error message for known issues
        if (error instanceof Error && error.message.includes('INVALID_ARGUMENT')) {
            console.error('AI Input Error: Check image size/format.');
        }
        throw error;
    }
}

export async function generateWallMask(imageBase64: string): Promise<string> {
    // Strategy: Use the source image itself as the "pattern" (since it's guaranteed to be a valid image)
    // and rely on the prompt to instruct the AI to paint it white.
    // This avoids issues with creating dummy invalid base64 images.

    const maskPrompt = `TASK: Create a BINARY MASK of the main wall in the image.
    1. Identify the PRIMARY WALL (largest central vertical surface).
    2. IGNORE the reference image content.
    3. Output a pure BLACK and WHITE image.
    4. WHITE = The Wall.
    5. BLACK = Everything else (furniture, floor, ceiling, people).
    6. NO gray, NO shadows, NO texture. Flat White on Flat Black.`;

    return await processImageWithAI(imageBase64, imageBase64, maskPrompt);
}
