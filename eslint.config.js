const js = require("@eslint/js");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
    {
        ignores: ["dist/**", "node_modules/**", "coverage/**", "fast.js"],
    },
    js.configs.recommended,
    {
        // This config file, jest.config.js, and any other CommonJS tooling script.
        files: ["**/*.js"],
        languageOptions: {
            sourceType: "commonjs",
            globals: {
                require: "readonly",
                module: "writable",
                __dirname: "readonly",
                process: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
            },
        },
    },
    {
        files: ["src/**/*.ts", "tests/**/*.ts"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: "module",
            },
            globals: {
                console: "readonly",
                process: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                __dirname: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            // Formatting is owned by Prettier, not ESLint. See .prettierrc.
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "no-undef": "off", // TypeScript already checks this, and does it better.
        },
    },
    prettierConfig,
];
