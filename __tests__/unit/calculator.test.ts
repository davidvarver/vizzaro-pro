import { calculateRollsNeeded } from '../../utils/calculator';

describe('Wallpaper Roll Calculator', () => {
    // Standard Roll: 0.53m x 10.05m

    test('calculates correctly for a small wall (10x8ft) with no pattern repeat', () => {
        // Wall: 10ft (3.048m) W x 8ft (2.438m) H
        const { rollsNeeded, stripsNeeded } = calculateRollsNeeded(10, 8, 0);

        // Width 3.048m / 0.53m = 5.75 -> 6 strips needed
        // Height 2.438m + 0.1m trim = 2.538m per strip
        // Roll 10.05m / 2.538m = 3.95 -> 3 strips per roll
        // Rolls needed: 6 strips / 3 strips/roll = 2 rolls

        expect(stripsNeeded).toBe(6);
        expect(rollsNeeded).toBe(2);
    });

    test('calculates correctly for a larger wall with pattern repeat', () => {
        // Wall: 12ft (3.65m) W x 9ft (2.74m) H
        // Repeat: 0.64m
        const { rollsNeeded, stripsPerRoll } = calculateRollsNeeded(12, 9, 0.64);

        // Height 2.74m + 0.64m (repeat) + 0.1m (trim) = 3.48m
        // Roll 10.05m / 3.48m = 2.88 -> 2 strips per roll
        // Width 3.65m / 0.53m = 6.88 -> 7 strips needed
        // Rolls needed: 7 / 2 = 3.5 -> 4 rolls

        expect(stripsPerRoll).toBe(2);
        expect(rollsNeeded).toBe(4);
    });

    test('handles fallback when wall is taller than a roll', () => {
        // Wall: 10ft W x 40ft H (Too tall for 10m roll)
        // 40ft = 12.19m > 10.05m

        const { rollsNeeded, stripsPerRoll } = calculateRollsNeeded(10, 40, 0);

        expect(stripsPerRoll).toBe(0); // Should be 0
        expect(rollsNeeded).toBeGreaterThan(0); // Should fallback to area
    });
});
