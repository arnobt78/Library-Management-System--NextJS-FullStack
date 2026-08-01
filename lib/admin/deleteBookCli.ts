// Parent: REQ-0025
// Pure CLI parsing keeps destructive targets explicit and secrets out of argv.

export interface DeleteBookCliOptions {
  id: string;
  forceReturn: boolean;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseDeleteBookArgs(argv: string[]): DeleteBookCliOptions {
  let id: string | undefined;
  let forceReturn = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--id" && argv[index + 1]) {
      id = argv[index + 1];
      index += 1;
    } else if (argument === "--force-return") {
      forceReturn = true;
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }

  if (!id) {
    throw new Error("An explicit --id <uuid> is required");
  }

  if (!UUID_PATTERN.test(id)) {
    throw new Error("--id must be a valid UUID");
  }

  return { id, forceReturn };
}
