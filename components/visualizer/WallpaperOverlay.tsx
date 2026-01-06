import React, { useMemo } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import Svg, { Defs, Mask, Image as SvgImage, Rect, Pattern } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WallpaperOverlayProps {
    originalImage: string; // Base64
    maskImage: string;     // Base64 (White=Wall, Black=Background)
    patternImage: string;  // URI of the wallpaper pattern
    opacity?: number;
}

export const WallpaperOverlay: React.FC<WallpaperOverlayProps> = ({
    originalImage,
    maskImage,
    patternImage,
    opacity = 0.85
}) => {
    // Ensure base64 strings have prefixes
    const bgUri = useMemo(() =>
        originalImage.startsWith('data:') ? originalImage : `data:image/jpeg;base64,${originalImage}`,
        [originalImage]);

    const maskUri = useMemo(() =>
        maskImage.startsWith('data:') ? maskImage : `data:image/png;base64,${maskImage}`,
        [maskImage]);

    // Calculate aspect ratio if possible, or assume container fills screen?
    // Usually we fit to width.
    // For now assuming full fill logic (100%).

    return (
        <View style={styles.container}>
            <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                    {/* Define the Mask based on the Mask Image */}
                    <Mask id="wallMask">
                        {/* 
                            We rely on the mask image: 
                            White areas = Visible (Opacity 1)
                            Black areas = Hidden (Opacity 0)
                        */}
                        <SvgImage
                            href={maskUri}
                            width="100%"
                            height="100%"
                            preserveAspectRatio="xMidYMid slice"
                        />
                    </Mask>

                    {/* Define the Pattern Tiling */}
                    <Pattern
                        id="wallpaperPattern"
                        patternUnits="userSpaceOnUse"
                        width="150" // Tune scale
                        height="150"
                    >
                        <SvgImage
                            href={patternImage}
                            width="150"
                            height="150"
                            preserveAspectRatio="xMidYMid slice"
                        />
                    </Pattern>
                </Defs>

                {/* 1. Background Layer: Original Room */}
                <SvgImage
                    href={bgUri}
                    width="100%"
                    height="100%"
                    preserveAspectRatio="xMidYMid slice"
                />

                {/* 2. Wallpaper Layer matched to Mask */}
                {/* 
                    We fill the screen with the pattern, but apply the mask 
                    so it only shows on the wall 
                */}
                <Rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="url(#wallpaperPattern)"
                    mask="url(#wallMask)"
                    opacity={opacity}
                />

            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
});
