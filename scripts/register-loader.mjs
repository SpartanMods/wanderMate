// Registers the TS/alias resolver hook for `node --test`. No dependencies.
import { register } from "node:module";
register("./test-loader.mjs", import.meta.url);
