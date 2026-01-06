/**
 * Calculates the number of wallpaper rolls needed based on wall dimensions and wallpaper specifications.
 * 
 * @param wallWidthFeet - Width of the wall in feet
 * @param wallHeightFeet - Height of the wall in feet
 * @param patternRepeatMeters - Pattern repeat in meters (default 0 or null)
 * @param rollWidthMeters - Width of the wallpaper roll in meters (default 0.53)
 * @param rollLengthMeters - Length of the wallpaper roll in meters (default 10.05)
 * @returns Object containing rollsNeeded, stripsNeeded, and coverage details
 */
export function calculateRollsNeeded(
    wallWidthFeet: number,
    wallHeightFeet: number,
    patternRepeatMeters: number = 0,
    rollWidthMeters: number = 0.53,
    rollLengthMeters: number = 10.05
) {
    // Constants
    const METERS_PER_FOOT = 0.3048;
    const TRIM_BUFFER_METERS = 0.10; // Extra length for trimming

    // 1. Convert Wall Dimensions to Meters
    const wallWidthM = wallWidthFeet * METERS_PER_FOOT;
    const wallHeightM = wallHeightFeet * METERS_PER_FOOT;

    // 2. Adjust Height for Pattern Repeat
    let adjustedHeightM = wallHeightM;
    if (patternRepeatMeters > 0) {
        // If there is a pattern repeat, we need to ensure each strip starts at the right match point
        // Formula: We might waste up to (patternRepeat - small_epsilon) per strip to match
        // Simplified robust approach:
        // Effective Strip Length = Wall Height + Trim.
        // We then round this up to the nearest multiple of pattern repeat IF it wasn't a drop match, 
        // but usually, we just add the repeat size to be safe for matching.
        // A standard industry formula is: (Height + Repeat + Trim)
        adjustedHeightM = wallHeightM + patternRepeatMeters;
    }

    // Add trim buffer
    const finalStripHeightM = adjustedHeightM + TRIM_BUFFER_METERS;

    // 3. Calculate Strips per Roll
    // How many full height strips can we get from one 10.05m roll?
    const stripsPerRoll = Math.floor(rollLengthMeters / finalStripHeightM);

    // 4. Calculate Total Strips Needed for Width
    const stripsNeeded = Math.ceil(wallWidthM / rollWidthMeters);

    // 5. Calculate Total Rolls
    let rollsNeeded = 0;

    if (stripsPerRoll > 0) {
        rollsNeeded = Math.ceil(stripsNeeded / stripsPerRoll);
    } else {
        // Edge case: Wall is taller than a single roll!
        // Fallback to Area Calculation (Area + 20% waste) / Roll Coverage
        const wallArea = wallWidthM * wallHeightM;
        const rollArea = rollWidthMeters * rollLengthMeters;
        const wasteFactor = 1.20; // 20% waste
        rollsNeeded = Math.ceil((wallArea * wasteFactor) / rollArea);
    }

    return {
        rollsNeeded,
        stripsNeeded,
        stripsPerRoll,
        wallWidthM,
        wallHeightM,
        finalStripHeightM
    };
}
