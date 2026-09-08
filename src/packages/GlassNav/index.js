import React from 'react';
import { GlassCard } from 'react-glass-ui';
import './GlassNav.css';

const NAV_ITEMS = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'explore', label: 'Explore' },
];

const glassNav = {
    blur: 3,
    distortion: 28,
    saturation: 140,
    brightness: 106,
    borderRadius: 999,
    borderSize: 0,
    borderOpacity: 0,
    backgroundColor: '#8b7dff',
    backgroundOpacity: 0.1,
    innerLightBlur: 12,
    innerLightSpread: 1,
    innerLightColor: '#a5b4fc',
    innerLightOpacity: 0.22,
    outerLightBlur: 20,
    outerLightSpread: 0,
    outerLightColor: '#7c5cff',
    outerLightOpacity: 0.16,
    flexibility: 0,
    onHoverScale: 1,
    padding: '6px',
    width: 'auto',
    color: '#fff',
};

function GlassNav({ active, onChange }) {
    return (
        <nav className="glass-nav" aria-label="Portfolio sections">
            <GlassCard {...glassNav} className="glass-nav-card" contentClassName="glass-nav-card-content">
                <ul className="glass-nav-list" role="tablist">
                    {NAV_ITEMS.map(({ id, label }) => {
                        const isActive = active === id;
                        return (
                            <li key={id} role="presentation">
                                <button
                                    type="button"
                                    role="tab"
                                    id={`nav-tab-${id}`}
                                    aria-selected={isActive}
                                    aria-controls={`nav-panel-${id}`}
                                    className={`glass-nav-item${isActive ? ' is-active' : ''}`}
                                    onClick={() => onChange(id)}
                                >
                                    {label}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </GlassCard>
        </nav>
    );
}

export default GlassNav;
