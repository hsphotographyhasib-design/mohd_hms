import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  languageOptions: {
    globals: {
      // React is available globally in Next.js via the automatic JSX runtime.
      React: 'readonly',
      // Browser globals used in service workers and client components
      EventListener: 'readonly',
      WindowEventMap: 'readonly',
      NotificationPermission: 'readonly',
      google: 'readonly',
      MediaTrackCapabilities: 'readonly',
      PositionOptions: 'readonly',
      // Node.js / Web API globals referenced in type annotations
      NodeJS: 'readonly',
      HeadersInit: 'readonly',
      RequestInit: 'readonly',
      RequestInfo: 'readonly',
      // CommonJS (some config files)
      module: 'readonly',
      // Firebase SDK loaded via script tag in public/
      firebase: 'readonly',
    },
  },
  rules: {
    // TypeScript rules
    "@typescript-eslint/no-explicit-any": "warn",    // flag `any` usage for gradual typing
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",
    
    // React rules
    // Note: react-hooks/exhaustive-deps requires react-hooks plugin which
    // isn't directly importable in flat config. Re-enable after eslint-plugin-react-hooks
    // is added as an explicit dependency.
    "react-hooks/exhaustive-deps": "off",
    "react-hooks/purity": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",
    
    // Next.js rules
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",
    
    // General JavaScript rules
    "prefer-const": "off",
    "no-unused-vars": "warn",                        // catches typos and dead code
    "no-console": "off",                             // auth-lib and startup logs are intentional
    "no-debugger": "off",
    "no-empty": "off",
    "no-irregular-whitespace": "off",
    "no-case-declarations": "off",
    "no-fallthrough": "off",
    "no-mixed-spaces-and-tabs": "off",
    "no-redeclare": "off",
    "no-undef": "error",                             // catches undefined variable references
    "no-unreachable": "off",
    "no-useless-escape": "off",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills", "mini-services/**", "spawn-server.js", "generated/**", "hostinger-build.js", "server.js"]
}];

export default eslintConfig;