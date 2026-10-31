# Track2Excel

## Outcome Planning

The Outcomes tab supports daily, weekly, monthly, and yearly outcomes. Each period defaults to three outcomes; configure independent positive whole-number limits in Settings and select Save outcome limits. Lowering a limit preserves existing outcomes and allows edits, but blocks additions until the count is below the new limit. Limits are saved locally in this browser. Weeks begin on Monday. Select a planning date to review past periods or plan ahead.

Outcomes can link to the next planning level: daily to weekly, weekly to monthly, and monthly to yearly. Set status explicitly to planned, in progress, achieved, or deferred. Linked activity time does not automatically mark an outcome achieved.

Today's daily outcomes appear on the Tracking tab. Activities can optionally link to an outcome when starting, editing, or using the selector in the activity log. Parent outcomes include activities linked to their descendants. Deleting an outcome keeps activities and child outcomes, removing only their direct links to it.

Outcomes and activity links are saved locally in this browser. They are not synchronized between devices. The existing activity CSV format does not include outcomes or outcome links.

Run planning-model tests with `node --test src/outcomes.test.mjs`; run the production build with `npm run build`.

## Development Template

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
