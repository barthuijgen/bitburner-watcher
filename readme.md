# BitBurner

Local file watcher and sync for the programming game BitBurner

Features:

- Watch local directory and sync files to BitBurner on save
- Adds a comment with RAM usage to the source file
- Supports typescript
- Supports bundling (add `// @bundlefile` to a file to bundle)
- Transform `@/` alias to absolute paths.

## Install

Install deno https://deno.land/manual/getting_started/installation

`deno install --allow-env --allow-read --allow-write --allow-net --allow-run https://cdn.deno.land/bitburner/versions/0.3.0/raw/bitburner.ts`

## Environment

Add bitburner api auth token

Make a `.env` file with `TOKEN=<token>` in your script directory

Alternatively you can pass the token as a cli option with `--token <token>`

## Run file watcher

`bitburner --dir <scripts dir>`

## Sync

To sync all existing files once

`bitburner sync --dir <scripts dir>`

## Tips

Write scripts using es modules, you would not need bundling in most cases.
You can import npm modules with CDNs like https://esm.sh/

Set up an import alas with `import_map.json`

```
{
  "imports": {
    "@/": "./home/",
  }
}
```

And use import paths like `import {} from '@/folder/script.ts`. This is needed because BitBurner does not support relative imports in some cases
