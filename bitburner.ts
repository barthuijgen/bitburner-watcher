import { watch, sync } from "./server.ts";
import { cliffy, dotenv } from "./deps.ts";

const { Command } = cliffy;

const env = dotenv.config();

const getToken = (token: unknown) => {
  return typeof token === "string" ? token : env.TOKEN ? env.TOKEN : null;
};

const syncCommand = new Command()
  .description("Upload all files to BitBurner")
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
  .action((options) => {
    const token = getToken(options.token);

    if (!token) {
      return console.log(
        `Token must be present as option (--token <token>) or in a .env file (TOKEN=<token>).`
      );
    }

    sync({
      watchDir: options.dir,
      apiHost: options.host,
      apiPort: options.port,
      apiToken: token,
    });
  });

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
  .action((options) => {
    const token = getToken(options.token);

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
  .command("sync", syncCommand)
  .parse(Deno.args);
