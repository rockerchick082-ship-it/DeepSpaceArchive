# Regression audit

Run from the DeepSpaceArchive project root:

```powershell
node .\tests\regression.mjs
```

This lightweight guard checks the cross-cutting changes that are easy to accidentally regress: Backup V2 personal-data coverage, reset/import/export coverage, offline mutation queue cleanup, Main Story remaining excluded from completeness, Android manifest permission deduplication, existing Up Next controls, and common mojibake markers.

It complements TypeScript, ESLint, fresh-install tests, and Android builds rather than replacing them.
