
// York Wallcoverings inspired palette
const palette = {
    white: '#FFFFFF',
    offWhite: '#F9F9F9',
    black: '#000000',
    darkGray: '#333333',
    mediumGray: '#666666',
    lightGray: '#E5E5E5',
    border: '#E0E0E0',
    error: '#D32F2F',
    success: '#388E3C',
};

const typography = {
    fontFamily: {
        serif: 'PlayfairDisplay_400Regular',
        serifBold: 'PlayfairDisplay_700Bold',
        sans: 'Montserrat_400Regular',
        sansMedium: 'Montserrat_500Medium',
        sansBold: 'Montserrat_600SemiBold', // Mapping 600 to Bold for simplicity usage
    },
    sizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 24,
        xxl: 32,
        display: 48,
    }
};

export const Theme = {
    colors: {
        background: palette.white,
        backgroundSecondary: palette.offWhite,
        text: palette.black,
        textSecondary: palette.mediumGray,
        icon: palette.black,
        button: palette.black,
        buttonText: palette.white,
        ...palette,
    },
    typography,
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },
    layout: {
        maxWidth: 1400,
    }
};
