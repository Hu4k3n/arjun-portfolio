/** Default small instruct model — fast enough for a portfolio start page. */
export const DEFAULT_MODEL_ID = 'SmolLM2-360M-Instruct-q4f16_1-MLC';

export const CHAT_TEMPERATURE = 0.7;

/** Hard product limit for assistant replies. */
export const MAX_OUTPUT_WORDS = 30;

/** Align with AskBar input maxLength. */
export const MAX_INPUT_CHARS = 150;

/** Soft generation ceiling; word guard is the hard stop. */
export const MAX_TOKENS = 180;

export const EMPTY_ANSWER_FALLBACK = "Couldn't generate an answer. Try again.";

export const WEBGPU_UNSUPPORTED_MESSAGE =
    'This browser cannot run the on-device model. Try Chrome or Edge 113+.';

export const LOAD_FAILED_MESSAGE = 'Failed to load the on-device model. Try again.';

export function isWebGpuSupported() {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
}
