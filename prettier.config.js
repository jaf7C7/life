const config = {
    tabWidth: 4,
    singleQuote: true,
    trailingComma: 'none',
    overrides: [
        {
            files: ['*.html', '*.json', '*.md', '*.yaml', '*.yml'],
            options: {
                tabWidth: 2
            }
        }
    ],
    plugins: ['prettier-plugin-jsdoc']
};

export default config;
