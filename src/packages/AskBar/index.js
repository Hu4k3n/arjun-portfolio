import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GlassCard } from 'react-glass-ui';
import { useAskLlm } from '../../hooks/useAskLlm';
import { MAX_INPUT_CHARS } from '../../services/webllm';
import AskBarLoading from './AskBarLoading';
import './AskBar.css';

const MAX_LENGTH = MAX_INPUT_CHARS;
const LINE_STAGGER_MS = 140;
const LINE_REVEAL_OFFSET_MS = 180;
const WIDTH_MAX_RATIO = 0.5;
const PLACEHOLDER = 'Ask me anything...';
/** Reserved trailing slot so the plane stays docked while text grows. */
const SUBMIT_SPACE = 40;
const FORM_LEFT_PAD = 20;
const SEARCH_ICON = 19;
const FORM_GAP = 12;

const glassIdle = {
    blur: 3,
    distortion: 30,
    saturation: 140,
    brightness: 106,
    borderRadius: 28,
    borderSize: 0,
    borderOpacity: 0,
    backgroundColor: '#8b7dff',
    backgroundOpacity: 0.08,
    innerLightBlur: 14,
    innerLightSpread: 1,
    innerLightColor: '#a5b4fc',
    innerLightOpacity: 0.2,
    outerLightBlur: 22,
    outerLightSpread: 0,
    outerLightColor: '#7c5cff',
    outerLightOpacity: 0.16,
    flexibility: 0,
    onHoverScale: 1,
    padding: '0',
    width: 'auto',
    color: '#fff',
};

const glassBlob = {
    ...glassIdle,
    borderRadius: 36,
    flexibility: 0,
    distortion: 42,
    backgroundOpacity: 0.1,
    outerLightBlur: 28,
    outerLightOpacity: 0.22,
};

const SearchIcon = () => (
    <svg className="ask-bar-search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const SubmitIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
            d="M22 2L11 13"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M22 2L15 22l-4-9-9-4 20-7z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

function splitRevealLines(text) {
    const trimmed = String(text ?? '').replace(/\r\n/g, '\n').trim();
    if (!trimmed) {
        return [];
    }
    if (trimmed.includes('\n')) {
        return trimmed.split('\n');
    }
    const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    return (sentences ?? [trimmed]).map((part) => part.trim()).filter(Boolean);
}

function FadingAnswer({ text }) {
    const lines = useMemo(() => splitRevealLines(text), [text]);

    return (
        <p className="ask-bar-answer">
            {lines.map((line, index) => (
                <span
                    key={`${index}-${line.slice(0, 24)}`}
                    className="ask-bar-line"
                    style={{ animationDelay: `${LINE_REVEAL_OFFSET_MS + index * LINE_STAGGER_MS}ms` }}
                >
                    {line.length === 0 ? '\u00a0' : line}
                </span>
            ))}
        </p>
    );
}

function maxContentWidth() {
    return Math.floor(window.innerWidth * WIDTH_MAX_RATIO);
}

function loadingLabel(llm) {
    if (llm.status === 'loading') {
        return 'Downloading model';
    }
    return 'Thinking';
}

function ModelReadyProgress({ visible, progress }) {
    const hasProgress = typeof progress === 'number';
    const percent = hasProgress ? Math.max(0, Math.min(100, Math.round(progress * 100))) : null;

    return (
        <div
            className={`ask-bar-ready ${visible ? 'is-visible' : ''}`}
            role="status"
            aria-live="polite"
            aria-busy={visible}
            aria-hidden={!visible}
        >
            <div className="ask-bar-ready-track" aria-hidden="true">
                <div
                    className={`ask-bar-ready-fill ${hasProgress ? '' : 'is-indeterminate'}`.trim()}
                    style={hasProgress ? { width: `${percent}%` } : undefined}
                />
            </div>
            <span className="ask-bar-ready-label">
                Getting ready{percent != null ? ` · ${percent}%` : '…'}
            </span>
        </div>
    );
}

function AskBar({ className = '', onReadyChange }) {
    const panelId = useId();
    const { ask, cancel, status: llmStatus, statusText, loadProgress } = useAskLlm();
    const [query, setQuery] = useState('');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [status, setStatus] = useState('idle');
    const [panelHeight, setPanelHeight] = useState(0);
    const [barWidth, setBarWidth] = useState(null);
    const [animateWidth, setAnimateWidth] = useState(false);

    const inputRef = useRef(null);
    const sizerRef = useRef(null);
    const formRef = useRef(null);
    const loadingRef = useRef(null);
    const panelRef = useRef(null);
    const placeholderWidthRef = useRef(0);

    const modelReady = llmStatus === 'ready' || llmStatus === 'replying';
    const showWarmupProgress = llmStatus === 'idle' || llmStatus === 'loading';
    const isLoading = status === 'loading';
    const isAnswer = status === 'answer';
    const hasContent = query.trim().length > 0;
    const showClose = hasContent || isLoading || isAnswer;
    const showSubmit = hasContent && !isAnswer;
    const llm = { status: llmStatus, statusText, loadProgress };

    useEffect(() => {
        onReadyChange?.(modelReady);
        return () => onReadyChange?.(false);
    }, [modelReady, onReadyChange]);

    const glassProps = isAnswer ? glassBlob : glassIdle;
    const cardClass = ['ask-bar-card', isAnswer ? 'is-blob' : '', isAnswer ? 'is-open' : '']
        .filter(Boolean)
        .join(' ');

    const measureBarWidth = useCallback(() => {
        if (!modelReady) {
            return;
        }

        const cap = maxContentWidth();
        let natural = 0;

        if (isLoading && loadingRef.current) {
            natural = loadingRef.current.scrollWidth;
        } else if (isAnswer && panelRef.current) {
            const panel = panelRef.current;
            const prevWidth = panel.style.width;
            const prevMax = panel.style.maxWidth;
            panel.style.width = 'max-content';
            panel.style.maxWidth = `${cap}px`;
            const panelW = Math.ceil(panel.scrollWidth);
            panel.style.width = prevWidth;
            panel.style.maxWidth = prevMax;

            const formW = formRef.current?.scrollWidth ?? 0;
            natural = Math.max(formW, panelW);
            if (panelW >= cap - 1) {
                natural = cap;
            }
        } else {
            const sizer = sizerRef.current;
            if (!sizer) {
                return;
            }

            const textW = Math.ceil(sizer.getBoundingClientRect().width) + 2;
            if (!query) {
                placeholderWidthRef.current = textW;
            }

            const rightPad = showClose ? 44 : 14;
            const submitSpace = showSubmit ? SUBMIT_SPACE : 0;
            const chrome = FORM_LEFT_PAD + SEARCH_ICON + FORM_GAP + submitSpace + rightPad;
            const contentW = Math.max(textW, placeholderWidthRef.current || textW);
            natural = chrome + contentW;
        }

        if (!natural) {
            return;
        }

        setBarWidth(Math.min(Math.ceil(natural), cap));
    }, [isAnswer, isLoading, modelReady, query, showClose, showSubmit]);

    useLayoutEffect(() => {
        measureBarWidth();
    }, [measureBarWidth, query, question, answer, status, panelHeight, llm.statusText, llm.loadProgress, modelReady]);

    useEffect(() => {
        if (!animateWidth) {
            return undefined;
        }
        const timer = window.setTimeout(() => setAnimateWidth(false), 520);
        return () => window.clearTimeout(timer);
    }, [animateWidth]);

    useEffect(() => {
        const onResize = () => {
            measureBarWidth();
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [measureBarWidth]);

    useEffect(() => {
        const node = panelRef.current;
        if (!node) {
            return undefined;
        }

        if (!isAnswer) {
            setPanelHeight(0);
            return undefined;
        }

        const measure = () => setPanelHeight(node.getBoundingClientRect().height);
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [isAnswer, question, answer, barWidth]);

    const collapse = useCallback(() => {
        cancel();
        setAnimateWidth(true);
        setStatus('idle');
        setQuestion('');
        setAnswer('');
    }, [cancel]);

    useEffect(() => {
        if (!isLoading && !isAnswer) {
            return undefined;
        }

        const onEscape = (event) => {
            if (event.key === 'Escape') {
                collapse();
            }
        };

        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [isLoading, isAnswer, collapse]);

    const onSubmit = async (event) => {
        event.preventDefault();
        const prompt = query.trim();
        if (!prompt || isLoading) {
            if (!prompt) {
                inputRef.current?.focus();
            }
            return;
        }

        // Replace any previous Q&A — no held context.
        setAnswer('');
        setQuestion(prompt);
        setAnimateWidth(true);
        setStatus('loading');

        try {
            const reply = await ask(prompt);
            setAnswer(reply);
            setAnimateWidth(true);
            setStatus('answer');
        } catch (cause) {
            if (cause?.message === 'cancelled') {
                setStatus('idle');
                setQuestion('');
                setAnswer('');
                return;
            }
            setAnswer(cause?.message || "Couldn't generate an answer. Try again.");
            setAnimateWidth(true);
            setStatus('answer');
        }
    };

    const onClear = useCallback(() => {
        setQuery('');
        collapse();
        requestAnimationFrame(() => inputRef.current?.focus());
    }, [collapse]);

    const onClose = () => {
        if (isLoading) {
            collapse();
            requestAnimationFrame(() => inputRef.current?.focus());
            return;
        }
        onClear();
    };

    const onQueryChange = (event) => {
        const next = event.target.value;

        if (isAnswer) {
            collapse();
            if (next.startsWith(query) && next.length > query.length) {
                setQuery(next.slice(query.length).slice(0, MAX_LENGTH));
            } else {
                setQuery(next.slice(0, MAX_LENGTH));
            }
            return;
        }

        setQuery(next.slice(0, MAX_LENGTH));
    };

    const onKeyDown = (event) => {
        if (isAnswer) {
            const isModifier = event.metaKey || event.ctrlKey || event.altKey;
            const isChar = event.key.length === 1 && !isModifier;
            const isEdit = event.key === 'Backspace' || event.key === 'Delete';

            if (isChar || isEdit) {
                event.preventDefault();
                collapse();
                setQuery(isChar ? event.key : '');
                return;
            }
        }

        if (event.key !== 'Escape') {
            return;
        }
        if (isAnswer || isLoading) {
            collapse();
        } else {
            setQuery('');
        }
    };

    const onPaste = (event) => {
        if (!isAnswer) {
            return;
        }
        event.preventDefault();
        const text = event.clipboardData?.getData('text') ?? '';
        collapse();
        setQuery(text.slice(0, MAX_LENGTH));
    };

    const rootStyle = modelReady
        ? barWidth
            ? { width: barWidth, maxWidth: '50vw' }
            : { maxWidth: '50vw' }
        : undefined;

    if (!modelReady && !showWarmupProgress) {
        return null;
    }

    return (
        <div
            className={`ask-bar ${modelReady ? '' : 'is-warming'} ${isLoading ? 'is-loading' : ''} ${isAnswer ? 'is-open' : ''} ${animateWidth ? 'is-width-animating' : ''} ${showClose ? 'has-close' : ''} ${className}`.trim()}
            style={rootStyle}
        >
            {modelReady ? (
                <>
                    <span ref={sizerRef} className="ask-bar-input-sizer" aria-hidden="true">
                        {query || PLACEHOLDER}
                    </span>

                    {showClose && (
                        <button
                            type="button"
                            className="ask-bar-close"
                            onClick={onClose}
                            aria-label={isLoading ? 'Cancel' : 'Clear'}
                        >
                            &times;
                        </button>
                    )}

                    <GlassCard {...glassProps} className={cardClass} contentClassName="ask-bar-card-content">
                        <div className="ask-bar-stage">
                            <form
                                ref={formRef}
                                className={`ask-bar-form ${showSubmit ? 'has-submit' : ''} ${isLoading ? 'is-exiting' : ''}`.trim()}
                                role="search"
                                aria-hidden={isLoading}
                                onSubmit={onSubmit}
                            >
                                <SearchIcon />
                                <label className="ask-bar-visually-hidden" htmlFor={`${panelId}-input`}>
                                    Ask anything about Arjun
                                </label>
                                <input
                                    id={`${panelId}-input`}
                                    ref={inputRef}
                                    className="ask-bar-input"
                                    type="text"
                                    value={query}
                                    placeholder={PLACEHOLDER}
                                    maxLength={MAX_LENGTH}
                                    autoComplete="off"
                                    spellCheck="false"
                                    aria-controls={panelId}
                                    tabIndex={isLoading ? -1 : 0}
                                    onChange={onQueryChange}
                                    onKeyDown={onKeyDown}
                                    onPaste={onPaste}
                                />
                                {showSubmit && (
                                    <button
                                        type="submit"
                                        className="ask-bar-submit"
                                        aria-label="Ask"
                                        tabIndex={isLoading ? -1 : 0}
                                        disabled={isLoading}
                                    >
                                        <SubmitIcon />
                                    </button>
                                )}
                            </form>

                            <AskBarLoading
                                ref={loadingRef}
                                active={isLoading}
                                label={loadingLabel(llm)}
                                progress={llm.status === 'loading' ? llm.loadProgress : null}
                            />
                        </div>

                        <div
                            id={panelId}
                            className={`ask-bar-panel ${isAnswer ? 'is-open' : ''}`}
                            style={{ height: panelHeight }}
                            aria-hidden={!isAnswer}
                        >
                            <div className="ask-bar-panel-inner" ref={panelRef}>
                                <p className="ask-bar-question">{question}</p>
                                <div className="ask-bar-body" aria-live="polite">
                                    {isAnswer && <FadingAnswer text={answer} />}
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </>
            ) : null}

            <ModelReadyProgress visible={showWarmupProgress} progress={loadProgress} />
        </div>
    );
}

export default AskBar;
