import { MAX_INPUT_CHARS } from './config';

export function countWords(text) {
    const trimmed = String(text ?? '').trim();
    if (!trimmed) {
        return 0;
    }
    return trimmed.split(/\s+/).length;
}

export function truncateToWords(text, maxWords) {
    const parts = String(text ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length <= maxWords) {
        return parts.join(' ');
    }
    return parts.slice(0, maxWords).join(' ');
}

function stripControlChars(value) {
    return Array.from(String(value ?? ''))
        .filter((ch) => {
            const code = ch.charCodeAt(0);
            return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
        })
        .join('');
}

/**
 * @returns {{ ok: true, question: string } | { ok: false, error: string }}
 */
export function validateQuestion(raw) {
    const cleaned = stripControlChars(raw).replace(/\s+/g, ' ').trim();

    if (!cleaned) {
        return { ok: false, error: 'Enter a question.' };
    }

    if (cleaned.length > MAX_INPUT_CHARS) {
        return {
            ok: true,
            question: cleaned.slice(0, MAX_INPUT_CHARS),
        };
    }

    const injection = /^(ignore (all |previous |above )?instructions|system\s*:|assistant\s*:)/i;
    if (injection.test(cleaned)) {
        return { ok: false, error: 'That question cannot be processed.' };
    }

    return { ok: true, question: cleaned };
}
