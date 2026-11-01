# Track2Excel

## Outcome Planning

Running activities end automatically after 90 minutes or at the next local midnight, whichever comes first. The saved end time is the exact cutoff, even if the browser was asleep or closed; expired activities are reconciled when the app resumes or reloads. Existing titles, notes, and planning links are preserved, and an open Stop dialog can still save its details after an automatic cutoff. Finished activities remain editable.

Display updates pause while the page is hidden and refresh immediately when it becomes visible. Seconds update only inside the active timer on the Tracking tab; the tracking summary refreshes once per minute while visible. Chart datasets are cached until activities, the analysis range, or the local day changes. Automatic cutoffs and reload recovery remain active independently of display updates; no manual refresh is needed.

The Outcomes tab supports daily, weekly, monthly, and yearly outcomes. Each period defaults to three outcomes; configure independent positive whole-number limits in Settings and select Save outcome limits. Lowering a limit preserves existing outcomes and allows edits, but blocks additions until the count is below the new limit. Limits are saved locally in this browser. Weeks begin on Monday. Select a planning date to review past periods or plan ahead.

Outcomes can link to the next planning level: daily to weekly, weekly to monthly, and monthly to yearly. Set status explicitly to planned, in progress, achieved, or deferred. Linked activity time does not automatically mark an outcome achieved.

Each outcome has optional priority (P1 Must, P2 Should, P3 Could), intent, and multiline notes. Priority sorts outcomes within the selected period, with unprioritized outcomes last. Notes expand in the planning list.

The three intents are Building Muscle (physical security), Compounding Wealth (financial security), and Reinforcing Trust (social security). A parent's intent takes precedence and is inherited through the outcome hierarchy; an outcome without an aligned parent can choose its own intent. Activities inherit their linked outcome's intent, or can select a direct intent independently.

Select Alignment in the Outcomes tab to review the selected period's planned and achieved outcomes, activity counts, and completed activity minutes by intent. Unaligned lists work without an effective intent, including activities linked to an outcome that has no intent. Each activity is counted once. Changing an intent reclassifies its linked work in this view; time invested does not automatically change outcome status.

Today's daily outcomes appear on the Tracking tab. Activities can optionally link to an outcome when starting, editing, or using the selector in the activity log. Parent outcomes include activities linked to their descendants. Deleting an outcome keeps activities and child outcomes, removing only their direct links to it.

Outcomes and activity links are saved locally in this browser. They are not synchronized between devices. The existing activity CSV format does not include outcomes or outcome links.

Run planning-model tests with `node --test src/outcomes.test.mjs`; run the production build with `npm run build`.
Run activity timer tests with `node --test src/activityTimer.test.mjs`.

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
