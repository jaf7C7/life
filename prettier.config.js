const config = {
    tabWidth: 4,
    singleQuote: true,
    trailingComma: 'none',
    overrides: [
        {
            files: ['*.html', '*.json', '*.md'],
            options: {
                tabWidth: 2
            }
        }
    ]
};

export default config;
