
/**
 * Utility functions for unit conversions and formatting.
 * User Request: "Everything in inches"
 */

export const cmToInches = (cm: number | string): string => {
    const value = typeof cm === 'string' ? parseFloat(cm) : cm;
    if (isNaN(value)) return '';
    // 1 cm = 0.393701 inches
    const inches = value * 0.393701;
    // Standard wallpaper widths: 53cm -> ~21", 70cm -> ~27"
    // We round to 1 decimal place for cleaner UI, or nearest integer if close.
    return `${inches.toFixed(1)}"`;
};

export const formatDimension = (value: number | string, unit: 'cm' | 'm' = 'cm'): string => {
    let cmValue = typeof value === 'string' ? parseFloat(value) : value;
    if (unit === 'm') cmValue *= 100;

    return cmToInches(cmValue);
};

export const translations = {
    common: {
        loading: "Loading...",
        error: "An error occurred",
        search: "Search",
        cart: "Cart",
        menu: "Menu",
    },
    home: {
        heroTitle: "TIMELESS ELEGANCE",
        heroSubtitle: "Transform every corner of your home.",
        heroButton: "DISCOVER",
        visualizerTitle: "VISUALIZE IN YOUR HOME",
        visualizerSubtitle: "Try our wallpapers with AI on your wall.",
        collectionTitle: "OUR COLLECTION",
        filters: {
            all: "All",
            new: "New",
            floral: "Floral",
            texture: "Texture",
            geometric: "Geometric",
            colors: {
                all: "All",
                white: "White",
                beige: "Beige",
                grey: "Grey",
                black: "Black",
                gold: "Gold",
                green: "Green",
                blue: "Blue",
                pink: "Pink"
            }
        }
    },
    product: {
        pricePerRoll: "/roll",
        addToCart: "ADD TO CART",
        visualize: "VISUALIZE",
        description: "DESCRIPTION",
        specifications: "SPECIFICATIONS",
        dimensions: "Dimensions",
        patternRepeat: "Pattern Repeat",
        material: "Material",
        match: "Match",
        washability: "Washability",
        strippability: "Strippability",
        goodLightFastness: "Good Light Fastness",
        pasteTheWall: "Paste the Wall"
    },
    cart: {
        title: "YOUR CART",
        empty: "Your cart is empty",
        total: "Total",
        checkout: "CHECKOUT",
        remove: "Remove",
        continueShopping: "Continue Shopping"
    },
    search: {
        placeholder: "Search wallpapers...",
        noResults: "No results found for"
    }
};
