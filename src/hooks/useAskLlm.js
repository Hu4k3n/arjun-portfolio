import { useCallback, useEffect, useRef, useState } from 'react';
import {
    DEFAULT_MODEL_ID,
    LOAD_FAILED_MESSAGE,
    WEBGPU_UNSUPPORTED_MESSAGE,
    WebLlmEngine,
    isWebGpuSupported,
    validateQuestion,
} from '../services/webllm';

/** Prefer idle time; fall back so prefetch still starts within a few seconds. */
const PREFETCH_IDLE_TIMEOUT_MS = 2500;
const PREFETCH_FALLBACK_MS = 800;

/**
 * Prefetches the on-device model shortly after mount; first ask reuses it.
 * Holds no chat history — each ask is an independent single turn.
 */
export function useAskLlm() {
    const engineRef = useRef(null);
    const loadPromiseRef = useRef(null);
    const askIdRef = useRef(0);
    const [engineStatus, setEngineStatus] = useState(() =>
        isWebGpuSupported() ? 'idle' : 'unsupported',
    );
    const [statusText, setStatusText] = useState('');
    const [loadProgress, setLoadProgress] = useState(null);
    const [errorMessage, setErrorMessage] = useState(
        isWebGpuSupported() ? null : WEBGPU_UNSUPPORTED_MESSAGE,
    );

    useEffect(
        () => () => {
            askIdRef.current += 1;
            loadPromiseRef.current = null;
            const engine = engineRef.current;
            engineRef.current = null;
            if (engine) {
                void engine.dispose();
            }
        },
        [],
    );

    const ensureEngine = useCallback(async () => {
        if (!isWebGpuSupported()) {
            setEngineStatus('unsupported');
            setErrorMessage(WEBGPU_UNSUPPORTED_MESSAGE);
            throw new Error(WEBGPU_UNSUPPORTED_MESSAGE);
        }

        if (engineRef.current?.loadedModelId) {
            return engineRef.current;
        }

        if (loadPromiseRef.current) {
            await loadPromiseRef.current;
            if (engineRef.current?.loadedModelId) {
                return engineRef.current;
            }
        }

        setEngineStatus('loading');
        setErrorMessage(null);
        setLoadProgress(0);
        setStatusText('Downloading model…');

        const engine = engineRef.current ?? new WebLlmEngine();
        engineRef.current = engine;

        const loadPromise = (async () => {
            await engine.load(DEFAULT_MODEL_ID, ({ text, progress }) => {
                setStatusText(text || 'Downloading model…');
                setLoadProgress(typeof progress === 'number' ? progress : null);
            });
            if (engine.disposed) {
                throw new Error(LOAD_FAILED_MESSAGE);
            }
            setEngineStatus('ready');
            setStatusText('');
            setLoadProgress(null);
            return engine;
        })();

        loadPromiseRef.current = loadPromise;

        try {
            return await loadPromise;
        } catch (cause) {
            setEngineStatus('error');
            setLoadProgress(null);
            const message =
                cause instanceof Error && cause.message
                    ? cause.message
                    : LOAD_FAILED_MESSAGE;
            setErrorMessage(message);
            setStatusText(message);
            throw cause instanceof Error ? cause : new Error(message);
        } finally {
            if (loadPromiseRef.current === loadPromise) {
                loadPromiseRef.current = null;
            }
        }
    }, []);

    // Warm the model while the start page is idle so the first ask is faster.
    useEffect(() => {
        if (!isWebGpuSupported()) {
            return undefined;
        }

        let cancelled = false;
        let idleId = null;
        let timeoutId = null;

        const startPrefetch = () => {
            if (cancelled) {
                return;
            }
            void ensureEngine().catch(() => {
                // Prefetch is best-effort; ask() surfaces errors on submit.
            });
        };

        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
            idleId = window.requestIdleCallback(startPrefetch, {
                timeout: PREFETCH_IDLE_TIMEOUT_MS,
            });
        } else {
            timeoutId = window.setTimeout(startPrefetch, PREFETCH_FALLBACK_MS);
        }

        return () => {
            cancelled = true;
            if (idleId != null && typeof window.cancelIdleCallback === 'function') {
                window.cancelIdleCallback(idleId);
            }
            if (timeoutId != null) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [ensureEngine]);

    const cancel = useCallback(() => {
        askIdRef.current += 1;
        engineRef.current?.interrupt();
        setEngineStatus((prev) => {
            if (prev === 'unsupported' || prev === 'error') {
                return prev;
            }
            return engineRef.current?.loadedModelId ? 'ready' : 'idle';
        });
        setStatusText('');
        setLoadProgress(null);
    }, []);

    const ask = useCallback(
        async (rawQuestion) => {
            const validated = validateQuestion(rawQuestion);
            if (!validated.ok) {
                throw new Error(validated.error);
            }

            const askId = askIdRef.current + 1;
            askIdRef.current = askId;

            const engine = await ensureEngine();
            if (askId !== askIdRef.current) {
                throw new Error('cancelled');
            }

            setEngineStatus('replying');
            setStatusText('Thinking…');
            setLoadProgress(null);
            setErrorMessage(null);

            try {
                const answer = await engine.askOnce(validated.question);
                if (askId !== askIdRef.current) {
                    throw new Error('cancelled');
                }
                setEngineStatus('ready');
                setStatusText('');
                return answer;
            } catch (cause) {
                if (askId !== askIdRef.current || cause?.message === 'cancelled') {
                    throw new Error('cancelled');
                }
                const message =
                    cause instanceof Error && cause.message
                        ? cause.message
                        : LOAD_FAILED_MESSAGE;
                setEngineStatus(engineRef.current?.loadedModelId ? 'ready' : 'error');
                setErrorMessage(message);
                setStatusText('');
                throw cause instanceof Error ? cause : new Error(message);
            }
        },
        [ensureEngine],
    );

    const isReady =
        engineStatus === 'ready' ||
        engineStatus === 'idle' ||
        engineStatus === 'replying' ||
        engineStatus === 'loading';

    return {
        /** idle | loading | ready | replying | error | unsupported */
        status: engineStatus,
        statusText,
        loadProgress,
        errorMessage,
        isReady: isReady && engineStatus !== 'unsupported',
        isUnsupported: engineStatus === 'unsupported',
        ask,
        cancel,
    };
}
