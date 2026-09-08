import React, { useEffect, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './StartPage.css';
import ProfileCard from '../ProfileCard';
import pic from '../../assets/avatar/avatar-pic.png'
import Aurora from '../BgWaves';
import UIButton from '../Button/UIButton';
import { onResume, openLink } from '../utils/utils';
import { aboutEducation, aboutExperience, ProfileCardInfo } from '../utils/constant';
import { AudioContext } from '../../context/AudioContext';
import Socials from '../Socials';
import UIGlassButton from '../Button/UIGlassButton';
import AskBar from '../AskBar';
import GlassNav from '../GlassNav';
import AboutSections from '../AboutSections';
import { isWebGpuSupported } from '../../services/webllm';

function StartPage() {
    const navigate = useNavigate();
    const { pauseAudio } = useContext(AudioContext);
    const showAskBar = isWebGpuSupported();
    const [activeSection, setActiveSection] = useState('home');
    const [askReady, setAskReady] = useState(false);

    useEffect(() => {
        pauseAudio();
    }, [pauseAudio]);

    const goToGame = () => {
        navigate('/main');
    };

    const renderProfileCard = () => { 
        return (
            <ProfileCard
                    name={ProfileCardInfo.name}
                    title={ProfileCardInfo.title}
                    avatarUrl={pic}
                    showUserInfo={false}
                    enableTilt={true}
                    onContactClick={() => openLink(ProfileCardInfo.linkedIn)}
                />
        )
    }

    return (
        <div
            className="start-page"
            tabIndex={0}
        >
            <div className="cubes-bg">
                <Aurora
                colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
                blend={0.5}
                amplitude={1.0}
                speed={0.5}
                />
            </div>
            <GlassNav active={activeSection} onChange={setActiveSection} />
            <div className="start-page-content">
                {activeSection === 'home' && (
                    <section
                        id="nav-panel-home"
                        role="tabpanel"
                        aria-labelledby="nav-tab-home"
                        className="start-page-panel"
                    >
                        {renderProfileCard()}
                        <h1 className="main-menu-title">Hello there!</h1>
                        {showAskBar ? (
                            <>
                                <AskBar onReadyChange={setAskReady} />
                                {askReady ? (
                                    <p className="ask-bar-disclaimer">
                                        Powered by a small on-device LLM via WebGPU. It can make mistakes.
                                    </p>
                                ) : null}
                            </>
                        ) : null}
                        <UIGlassButton onClick={onResume}>See my Resume</UIGlassButton>
                        <Socials glass />
                    </section>
                )}

                {activeSection === 'explore' && (
                    <section
                        id="nav-panel-explore"
                        role="tabpanel"
                        aria-labelledby="nav-tab-explore"
                        className="start-page-panel"
                    >
                        <h4 className="main-menu-title">Explore my portfolio through an island</h4>
                        <UIButton onClick={goToGame}>Explore</UIButton>
                    </section>
                )}

                {activeSection === 'about' && (
                    <section
                        id="nav-panel-about"
                        role="tabpanel"
                        aria-labelledby="nav-tab-about"
                        className="start-page-panel start-page-panel--about"
                    >
                        <AboutSections
                            education={aboutEducation}
                            experience={aboutExperience}
                        />
                    </section>
                )}
            </div>
        </div>
    );
}

export default StartPage;
