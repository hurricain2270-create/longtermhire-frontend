import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";


export default [
  {
    ignores: [
      "dist",
      "dev-dist",
      "node_modules",
      "public",
      "vite.config.ts",
      "tailwind.config.ts",
      "git-hook-setup.js",
      ".eslintrc.js",
      ".eslintignore",
      ".gitignore",
      "package.json",
      "README.md",
      "tsconfig.json",
      "postcss.config.js",
      "git-script.js",
      "tsconfig.node.json",
      "git-hook-setup copy.js",
      "playwright-report/**",
      "test-results/**",
      "src/test/**",
      "deploy.template.ts",
      "jenkins.config.ts",
      "playwright-no-server.config.ts",
      "playwright.config.ts",
      "src/",
    ],
  },
  // tseslint.configs.recommendedTypeChecked,
  // tseslint.configs.stylisticTypeChecked,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json", // Explicitly point to tsconfig
        tsconfigRootDir: ".",
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        browser: true,
        es2021: true,
        node: true,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-unused-vars": "off", // Turn off base rule
      //   eqeqeq: "error",
      "no-console": "warn",
      "no-debugger": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];
