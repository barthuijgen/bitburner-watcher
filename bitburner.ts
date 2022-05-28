import { Command } from "cliffy";
import { config } from "dotenv";
import { watch } from "./server.ts";

const env = config();

await new Command()
  .name("bitburner")
  .version("0.1.0")
  .description("BitBurner file sync server")
  .usage("--dir <dir> --token <token> [options]")
  .option("-d, --dir <type>", "Directory to watch", {
    required: true,
  })
  .option("-t, --token [token:string]", "Api auth token")
  .option("-h, --host <host>", "Hostname of BitBurner api", {
    default: "localhost",
  })
  .option("-p, --port <port:integer>", "port of BitBurner api", {
    default: 9990,
  })
  .action((options, ...args) => {
    const token =
      typeof options.token === "string"
        ? options.token
        : env.TOKEN
        ? env.TOKEN
        : null;

    if (!token) {
      return console.log(
        `Token must be present as option (--token <token>) or in a .env file (TOKEN=<token>).`
      );
    }

    watch({
      watchDir: options.dir,
      apiHost: options.host,
      apiPort: options.port,
      apiToken: token,
    });
  })
  .parse(Deno.args);
