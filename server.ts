import { base64, debounce, path, swc, conversion, esbuild } from "./deps.ts";

const ALLOWED = [".js", ".script", ".ns", ".txt"];

interface WatchOptions {
  watchDir: string;
  apiToken: string;
  apiHost: string;
  apiPort: number;
}

const getOSTempDir = () =>
  Deno.env.get("TMPDIR") ||
  Deno.env.get("TMP") ||
  Deno.env.get("TEMP") ||
  "/tmp";

async function updateFileHeader(filepath: string, ramUsage: number) {
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();
  const fileEncoded = await Deno.readFile(filepath);
  const file = decoder.decode(fileEncoded);
  const usageText = `// Ram usage: ${ramUsage}GB`;

  // Exact match, do nothing to prevent watch loop
  if (file.includes(usageText)) return;

  if (file.includes(`// Ram usage: `)) {
    Deno.writeFile(
      filepath,
      encoder.encode(file.replace(/\/\/ Ram usage:\ (.*)/, usageText))
    );
  } else {
    Deno.writeFile(filepath, encoder.encode(usageText + "\n\n" + file));
  }
}

function fixFilename(filename: string) {
  // Reject invalid name
  if (filename.includes(" ")) return false;

  if (filename.includes("/") && !filename.startsWith("/")) {
    filename = "/" + filename;
  }
  return filename.replace(".tsx", ".js").replace(".ts", ".js");
}

function fixFileContent(code: string) {
  // replace .ts imports with .js
  // Fix absolute import paths in the game
  return (
    code
      .replaceAll('.tsx";', '.js";')
      .replaceAll('.ts";', '.js";')
      .replaceAll('from "@/', 'from "/')
      .replaceAll("document.", "globalThis['document'].")
      .replaceAll("globalThis.document", "globalThis['document']")
      // Specific fix for re-exporting Evt
      .replace(
        "export { Evt as Evt };",
        "const Evt = Ir.Evt;\n" + "export { Evt };\n"
      )
  );
}

function transformSingleFile(content: string) {
  try {
    const { code } = swc.transform(content, {
      jsc: {
        target: "es2021",
        parser: {
          syntax: "typescript",
          tsx: true,
        },
      },
    } as any);
    return code;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function transformBundledFile(filepath: string) {
  const process = Deno.run({
    cmd: ["deno", "bundle", filepath],
    stdout: "piped",
  });

  const buff = await conversion.readAll(process.stdout);
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(buff);
}

async function transformEsbuildFile(filepath: string) {
  const tmpfilename = Math.floor(Math.random() * 1e10) + ".js";
  const tmpFilePath = path.join(getOSTempDir(), tmpfilename);
  await esbuild.build({
    entryPoints: [filepath],
    outfile: tmpFilePath,
    bundle: true,
    format: "esm",
    target: "es2020",
  });
  const output = await readFile(tmpFilePath);
  await Deno.remove(tmpFilePath);
  return output;
}

async function readFile(filepath: string) {
  const decoder = new TextDecoder("utf-8");
  const file = await Deno.readFile(filepath).catch(() => {});
  return file ? decoder.decode(file) : null;
}

async function syncFile(options: WatchOptions, filepath: string) {
  const relativePath = path.relative(options.watchDir, filepath);
  const filename = fixFilename(relativePath);

  if (!filename) {
    return console.log(
      `Failed to copy "${relativePath}" please check file name.`
    );
  }

  if (!ALLOWED.includes(path.extname(filename))) {
    console.log(`${filename} not allowed to sync to Bitburner`);
    return;
  }

  const file = await readFile(filepath);
  if (!file) {
    return console.log(`Failed to copy ${relativePath}, could not read file`);
  }

  const shouldBundle = file.includes("// @bundlefile");
  const shouldEsbundle = file.includes("// @esbundlefile");
  const code = shouldEsbundle
    ? await transformEsbuildFile(filepath)
    : shouldBundle
    ? await transformBundledFile(filepath)
    : transformSingleFile(file);

  if (!code) {
    return console.log(
      `Failed to ${shouldBundle ? "bundle" : "transform"} file ${relativePath}`
    );
  }

  const body = JSON.stringify({
    filename,
    code: base64.encode(fixFileContent(code)),
  });

  const res = await fetch(`http://${options.apiHost}:${options.apiPort}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": body.length.toString(),
      Authorization: `Bearer ${options.apiToken}`,
    },
    body,
  }).catch((error) => {
    console.log(
      "Failed to sync file to bitburner, check if the api server is enabled and your configuration is correct." +
        `\nError: ${error.message}`
    );
    return null;
  });

  if (res?.status === 200) {
    const result = await res.json();
    if (result.success === true) {
      console.log(
        `Saved ${
          shouldBundle ? "bundled" : "transformed"
        } file in Bitburner ${filename} (${result.data.ramUsage}GB Ram)`
      );
      updateFileHeader(filepath, result.data.ramUsage);
    }
  } else if (res) {
    console.log(
      "Failed to sync file to bitburner, check if the api server is enabled and your configuration is correct." +
        `\nError: ${res.status} ${res.statusText}`
    );
  }
}

const debounced = debounce.debounce(syncFile, 100);

export async function watch(options: WatchOptions) {
  options.watchDir = path.resolve(options.watchDir);
  const watcher = Deno.watchFs(options.watchDir);

  console.log(`Watching for changes in: ${options.watchDir}`);
  for await (const event of watcher) {
    if (event.kind === "modify") {
      const last = event.paths[event.paths.length - 1];
      debounced(options, last);
    }
  }
}
