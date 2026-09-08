import React from 'react';
import { GlassCard } from 'react-glass-ui';
import { formatDateRange } from '../utils/constant';
import './AboutSections.css';

const glassSection = {
    blur: 3,
    distortion: 28,
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
    padding: '1.35rem 1.5rem',
    width: '100%',
    color: '#fff',
};

function AboutCard({ title, entries }) {
    return (
        <GlassCard {...glassSection} className="about-glass-card" contentClassName="about-glass-card-content">
            <h3 className="about-glass-title">{title}</h3>
            <ul className="about-glass-list">
                {entries.map((entry) => (
                    <li
                        key={`${entry.org}-${entry.startDate?.getTime?.() ?? entry.role}`}
                        className="about-glass-entry"
                    >
                        <div className="about-glass-entry-head">
                            <span className="about-glass-role">{entry.role}</span>
                            <span className="about-glass-dates">
                                {formatDateRange(entry.startDate, entry.endDate)}
                            </span>
                        </div>
                        <span className="about-glass-org">{entry.org}</span>
                        {entry.detail ? (
                            <p className="about-glass-detail">{entry.detail}</p>
                        ) : null}
                        {entry.highlights?.length ? (
                            <ul className="about-glass-highlights">
                                {entry.highlights.map((item) => (
                                    <li key={item} className="about-glass-highlight">
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </li>
                ))}
            </ul>
        </GlassCard>
    );
}

function AboutSections({ education, experience }) {
    return (
        <div className="about-sections">
            <AboutCard title="Education" entries={education} />
            <AboutCard title="Experience" entries={experience} />
        </div>
    );
}

export default AboutSections;
