import React, { forwardRef } from 'react';

const AskBarLoading = forwardRef(function AskBarLoading({ active }, ref) {
    return (
        <div
            ref={ref}
            className={`ask-bar-loading ${active ? 'is-active' : ''}`}
            role="status"
            aria-live="polite"
            aria-busy={active}
            aria-hidden={!active}
        >
            <span className="ask-bar-thinking">
                Thinking
                <span className="ask-bar-thinking-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </span>
            </span>
        </div>
    );
});

export default AskBarLoading;
