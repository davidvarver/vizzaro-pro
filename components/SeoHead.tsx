import React from 'react';
import Head from 'expo-router/head';
import { Platform } from 'react-native';

interface SeoHeadProps {
    title: string;
    description: string;
    image?: string;
    url?: string;
    type?: 'website' | 'product';
    productData?: {
        price: number;
        currency: string;
        availability: 'InStock' | 'OutOfStock';
        brand?: string;
    };
}

const SITE_NAME = 'Vizzaro Wallpaper';
const DOMAIN = 'https://vizzaro-pro.vercel.app';

export const SeoHead: React.FC<SeoHeadProps> = ({
    title,
    description,
    image = `${DOMAIN}/images/default-share.jpg`,
    url,
    type = 'website',
    productData
}) => {
    if (Platform.OS !== 'web') return null;

    const fullTitle = `${title} | ${SITE_NAME}`;
    const fullUrl = url ? (url.startsWith('http') ? url : `${DOMAIN}${url}`) : DOMAIN;
    const fullImage = image.startsWith('http') ? image : `${DOMAIN}${image}`;

    // JSON-LD for Rich Snippets
    const jsonLd = productData ? {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": title,
        "image": [fullImage],
        "description": description,
        "brand": {
            "@type": "Brand",
            "name": productData.brand || "Vizzaro"
        },
        "offers": {
            "@type": "Offer",
            "url": fullUrl,
            "priceCurrency": productData.currency,
            "price": productData.price,
            "availability": productData.availability === 'InStock' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/NewCondition"
        }
    } : {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": SITE_NAME,
        "url": DOMAIN
    };

    return (
        <Head>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />

            {/* Open Graph / Facebook / WhatsApp */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={fullImage} />
            <meta property="og:url" content={fullUrl} />
            <meta property="og:site_name" content={SITE_NAME} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={fullImage} />

            {/* Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify(jsonLd)}
            </script>
        </Head>
    );
};
