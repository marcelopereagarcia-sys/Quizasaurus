/**
 * Imported first by every CLI.
 *
 * Node's fetch gives up after 5 minutes without response headers, and a large
 * local model can take longer than that just to read the prompt. The
 * providers keep their own time limits (AbortSignal), so these are lifted.
 */
import { Agent, setGlobalDispatcher } from "undici";

setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 }));
