import {
    CHAT_TEMPERATURE,
    DEFAULT_MODEL_ID,
    EMPTY_ANSWER_FALLBACK,
    MAX_OUTPUT_WORDS,
    MAX_TOKENS,
    isWebGpuSupported,
} from './config';
import { countWords, truncateToWords } from './guards';
import { getSystemPrompt } from './prompt';

/**
 * Owns one WebLLM worker + engine for a load cycle.
 * Single-turn only: each streamReply sends system + current question.
 *
 * Avoid calling interruptGenerate when idle — WebLLM can leave the engine
 * stuck so the next completion returns empty (mlc-ai/web-llm#447).
 */
export class WebLlmEngine {
    constructor() {
        this.engine = null;
        this.worker = null;
        this.loadedModelId = null;
        this.disposed = false;
        this.loadChain = Promise.resolve();
        this.onProgress = null;
        /** True while a completions stream is active. */
        this.generating = false;
    }

    load(modelId = DEFAULT_MODEL_ID, onProgress) {
        this.onProgress = onProgress ?? null;

        this.loadChain = this.loadChain
            .catch(() => undefined)
            .then(() => this.#loadModel(modelId));

        return this.loadChain;
    }

    async #loadModel(modelId) {
        if (this.disposed) {
            return;
        }

        if (!isWebGpuSupported()) {
            throw new Error('WebGPU is not supported in this browser.');
        }

        const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');

        if (this.disposed) {
            return;
        }

        const initProgressCallback = (report) => {
            if (this.onProgress) {
                this.onProgress({
                    text: report.text,
                    progress: report.progress,
                });
            }
        };

        if (!this.engine) {
            this.worker = new Worker(new URL('./worker.js', import.meta.url), {
                type: 'module',
            });
            try {
                this.engine = await CreateWebWorkerMLCEngine(this.worker, modelId, {
                    initProgressCallback,
                });
            } catch (error) {
                try {
                    this.worker.terminate();
                } catch {
                    // ignore
                }
                this.worker = null;
                throw error;
            }
        } else {
            this.interrupt();
            this.engine.setInitProgressCallback?.(initProgressCallback);
            await this.engine.reload(modelId);
        }

        if (this.disposed) {
            await this.#tearDown();
            return;
        }

        this.loadedModelId = modelId;
    }

    /**
     * Yields content deltas. Soft-stops yielding past MAX_OUTPUT_WORDS without
     * interruptGenerate (drains the stream instead) so the next ask still works.
     * @param {{ question: string }} request
     */
    async *streamReply({ question }) {
        if (!this.engine || this.disposed) {
            throw new Error('Model is not loaded.');
        }

        const messages = [
            { role: 'system', content: getSystemPrompt() },
            { role: 'user', content: question },
        ];

        this.generating = true;
        let text = '';

        try {
            const stream = await this.engine.chat.completions.create({
                messages,
                temperature: CHAT_TEMPERATURE,
                max_tokens: MAX_TOKENS,
                stream: true,
            });

            let stopYielding = false;

            for await (const chunk of stream) {
                if (this.disposed) {
                    break;
                }

                // Past the word cap: keep draining so the runtime lock releases,
                // but do not interruptGenerate (breaks later asks).
                if (stopYielding) {
                    continue;
                }

                const delta = chunk.choices?.[0]?.delta?.content;
                if (!delta) {
                    continue;
                }

                const next = text + delta;
                if (countWords(next) > MAX_OUTPUT_WORDS) {
                    stopYielding = true;
                    continue;
                }

                text = next;
                yield delta;
            }
        } finally {
            this.generating = false;
            try {
                await this.engine?.resetChat?.();
            } catch {
                // Best-effort hygiene; never keep turns in messages either way.
            }
        }

        if (!String(text).trim()) {
            yield EMPTY_ANSWER_FALLBACK;
        }
    }

    /**
     * Collect a full single-turn answer with the hard word limit applied.
     */
    async askOnce(question) {
        let answer = '';
        for await (const delta of this.streamReply({ question })) {
            answer += delta;
        }
        const trimmed = answer.trim();
        if (!trimmed) {
            return EMPTY_ANSWER_FALLBACK;
        }
        return truncateToWords(trimmed, MAX_OUTPUT_WORDS);
    }

    interrupt() {
        if (!this.generating) {
            return;
        }
        try {
            this.engine?.interruptGenerate?.();
        } catch {
            // Ignore interrupt races during dispose.
        }
    }

    async dispose() {
        this.disposed = true;
        this.onProgress = null;
        this.interrupt();
        await this.#tearDown();
    }

    async #tearDown() {
        const engine = this.engine;
        const worker = this.worker;
        this.engine = null;
        this.worker = null;
        this.loadedModelId = null;

        try {
            await engine?.unload?.();
        } catch {
            // Ignore unload errors during teardown.
        }

        try {
            worker?.terminate?.();
        } catch {
            // Ignore terminate errors.
        }
    }
}
