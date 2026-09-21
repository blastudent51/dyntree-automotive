# npm setup

This variant is configured to use npm instead of pnpm.

From the project root:

```bash
npm install
npm run build
```

`npm install` will generate `package-lock.json`. Commit that file with the project.

Vercel is configured to run `npm install` and `npm run build:vercel`.
