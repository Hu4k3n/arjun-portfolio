import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GlassCard } from 'react-glass-ui';
import AskBarLoading from './AskBarLoading';
import './AskBar.css';

const MAX_LENGTH = 150;
const LINE_STAGGER_MS = 140;
const LINE_REVEAL_OFFSET_MS = 180;
const LOADING_MIN_MS = 3000;
const WIDTH_MAX_RATIO = 0.5;
const PLACEHOLDER = 'Ask me anything...';

const PLACEHOLDER_REPLY = [
    'Thanks for asking — this is a placeholder reply.',
    '',
    'Once the model backend is connected, answers will land here',
    'as the glass blob expands and each line fades in.',
].join('\n');

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

function AskBar({ className = '' }) {
    const panelId = useId();
    const [query, setQuery] = useState('');
    const [question, setQuestion] = useState('');
    const [status, setStatus] = useState('idle');
    const [panelHeight, setPanelHeight] = useState(0);
    const [barWidth, setBarWidth] = useState(null);
    const [inputWidth, setInputWidth] = useState(0);
    const [animateWidth, setAnimateWidth] = useState(false);

    const inputRef = useRef(null);
    const sizerRef = useRef(null);
    const formRef = useRef(null);
    const loadingRef = useRef(null);
    const panelRef = useRef(null);
    const loadTimerRef = useRef(null);

    const isLoading = status === 'loading';
    const isAnswer = status === 'answer';
    const hasContent = query.trim().length > 0;
    const showClose = hasContent || isLoading || isAnswer;

    const glassProps = isAnswer ? glassBlob : glassIdle;
    const cardClass = ['ask-bar-card', isAnswer ? 'is-blob' : '', isAnswer ? 'is-open' : '']
        .filter(Boolean)
        .join(' ');

    const measureInputWidth = useCallback(() => {
        const sizer = sizerRef.current;
        if (!sizer) {
            return;
        }

        const textW = Math.ceil(sizer.getBoundingClientRect().width) + 2;
        const cap = maxContentWidth();
        // Keep search icon, gaps, submit, and close affordance inside the bar.
        const rightPad = showClose ? 44 : 14;
        const submitSpace = hasContent && !isAnswer ? 40 : 0; // 12 gap + 28 button
        const chrome = 20 + 19 + 12 + submitSpace + rightPad;
        const maxInput = Math.max(48, cap - chrome);

        setInputWidth(Math.min(textW, maxInput));
    }, [hasContent, isAnswer, showClose]);

    const measureBarWidth = useCallback(() => {
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
        } else if (formRef.current) {
            const rightPad = showClose ? 44 : 14;
            const submitSpace = hasContent && !isAnswer ? 40 : 0;
            const chrome = 20 + 19 + 12 + submitSpace + rightPad;
            const textW = inputWidth || Math.ceil(sizerRef.current?.getBoundingClientRect().width || 0) + 2;
            natural = chrome + textW;
        }

        if (!natural) {
            return;
        }

        setBarWidth(Math.min(Math.ceil(natural), cap));
    }, [hasContent, inputWidth, isAnswer, isLoading, showClose]);

    useLayoutEffect(() => {
        measureInputWidth();
    }, [query, measureInputWidth]);

    useLayoutEffect(() => {
        measureBarWidth();
    }, [measureBarWidth, query, question, status, panelHeight, inputWidth]);

    useEffect(() => {
        if (!animateWidth) {
            return undefined;
        }
        const timer = window.setTimeout(() => setAnimateWidth(false), 520);
        return () => window.clearTimeout(timer);
    }, [animateWidth]);

    useEffect(() => {
        const onResize = () => {
            measureInputWidth();
            measureBarWidth();
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [measureBarWidth, measureInputWidth]);

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
    }, [isAnswer, question, barWidth]);

    useEffect(
        () => () => {
            if (loadTimerRef.current) {
                clearTimeout(loadTimerRef.current);
            }
        },
        [],
    );

    const collapse = useCallback(() => {
        if (loadTimerRef.current) {
            clearTimeout(loadTimerRef.current);
            loadTimerRef.current = null;
        }
        setAnimateWidth(true);
        setStatus('idle');
        setQuestion('');
    }, []);

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

    const onSubmit = (event) => {
        event.preventDefault();
        const prompt = query.trim();
        if (!prompt || isLoading) {
            if (!prompt) {
                inputRef.current?.focus();
            }
            return;
        }

        if (loadTimerRef.current) {
            clearTimeout(loadTimerRef.current);
        }

        setQuestion(prompt);
        setAnimateWidth(true);
        setStatus('loading');

        loadTimerRef.current = setTimeout(() => {
            loadTimerRef.current = null;
            setAnimateWidth(true);
            setStatus('answer');
        }, LOADING_MIN_MS);
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
            // Dismiss the answer like clear, but keep the user's new keystrokes.
            collapse();
            if (next.startsWith(query) && next.length > query.length) {
                setQuery(next.slice(query.length).slice(0, MAX_LENGTH));
            } else {
                setQuery(next.slice(0, MAX_LENGTH));
            }
            return;
        }

        setQuery(next);
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

    const rootStyle = barWidth
        ? { width: barWidth, maxWidth: '50vw' }
        : { maxWidth: '50vw' };

    return (
        <div
            className={`ask-bar ${isLoading ? 'is-loading' : ''} ${isAnswer ? 'is-open' : ''} ${animateWidth ? 'is-width-animating' : ''} ${showClose ? 'has-close' : ''} ${className}`.trim()}
            style={rootStyle}
        >
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
                        className={`ask-bar-form ${isLoading ? 'is-exiting' : ''}`}
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
                            style={{ width: inputWidth || undefined, maxWidth: '100%' }}
                            onChange={onQueryChange}
                            onKeyDown={onKeyDown}
                            onPaste={onPaste}
                        />
                        {hasContent && !isAnswer && (
                            <button
                                type="submit"
                                className="ask-bar-submit"
                                aria-label="Ask"
                                tabIndex={isLoading ? -1 : 0}
                            >
                                <SubmitIcon />
                            </button>
                        )}
                    </form>

                    <AskBarLoading ref={loadingRef} active={isLoading} />
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
                            {isAnswer && <FadingAnswer text={PLACEHOLDER_REPLY} />}
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}

export default AskBar;
