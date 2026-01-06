import { Platform } from 'react-native';

const API_URL = 'https://toolkit.rork.com/images/edit/';

export interface AiProcessResult {
    processedBase64: string;
    maskBase64?: string; // If we start returning mask separately
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

    const cleanImageBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const cleanWallpaperBase64 = wallpaperBase64.replace(/^data:image\/[a-z]+;base64,/, '');

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
    // To generate a mask, we ask the AI to paint the wall WHITE and everything else BLACK.
    // We send a simple white image as the "pattern" to apply? Or we ask it to segment.
    // Since the endpoint expects 2 images (Source + Pattern), we can send a solid WHITE image as the pattern 
    // and instruct it to "Replace the wall with this white pattern, and turn everything else BLACK".

    // Create a 64x64 white pixel base64 to ensure the model can process it as a valid pattern
    const whitePatternBase64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAACQd1PeAAAADElEQVR4nGP6z8AAAAABAAH2I8UAAAAASUVORK5CYII=";

    const maskPrompt = `TASK: Create a BINARY MASK of the main wall in the image.
    1. Identify the PRIMARY WALL (largest central vertical surface).
    2. Apply the provided WHITE pattern to the entire wall surface.
    3. Make everything else (furniture, floor, ceiling, people, windows) BLACK.
    4. The output must be a black and white image only. White = Wall, Black = Not Wall.
    5. No shadows, no lighting, just flat white on the wall area.`;

    return await processImageWithAI(imageBase64, whitePatternBase64, maskPrompt);
}
