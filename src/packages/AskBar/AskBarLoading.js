import React, { forwardRef } from 'react';

const AskBarLoading = forwardRef(function AskBarLoading({ active, label = 'Thinking', progress = null }, ref) {
    const showProgress = active && typeof progress === 'number';
    const percent = showProgress ? Math.max(0, Math.min(100, Math.round(progress * 100))) : null;

    return (
        <div
            ref={ref}
            className={`ask-bar-loading ${active ? 'is-active' : ''}`}
            role="status"
            aria-live="polite"
            aria-busy={active}
            aria-hidden={!active}
        >
            <div className="ask-bar-loading-copy">
                <span className="ask-bar-thinking">
                    {label}
                    {!showProgress && (
                        <span className="ask-bar-thinking-dots" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </span>
                    )}
                    {showProgress && (
                        <span className="ask-bar-progress" aria-hidden="true">
                            {percent}%
                        </span>
                    )}
                </span>
                {showProgress && (
                    <div className="ask-bar-loading-track" aria-hidden="true">
                        <div className="ask-bar-loading-fill" style={{ width: `${percent}%` }} />
                    </div>
                )}
            </div>
        </div>
    );
});

export default AskBarLoading;
