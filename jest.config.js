module.exports = {
    preset: 'jest-expo',

    setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect', '<rootDir>/jestSetup.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@nkzw/.*)'
    ],
    moduleNameMapper: {
        '\\.(png|jpg|jpeg|svg)$': '<rootDir>/__mocks__/fileMock.js',
        '\\.(css|less)$': 'identity-obj-proxy',
    },
};
