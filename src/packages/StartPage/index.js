import React, { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './StartPage.css';
import ProfileCard from '../ProfileCard';
import pic from '../../assets/avatar/avatar-pic.png'
import Aurora from '../BgWaves';
import ScrollReveal from '../ScrollReveal';
import UIButton from '../Button/UIButton';
import { onResume, openLink } from '../utils/utils';
import { contentArray, ProfileCardInfo } from '../utils/constant';
import { AudioContext } from '../../context/AudioContext';
import Socials from '../Socials';
import UIGlassButton from '../Button/UIGlassButton';
import AskBar from '../AskBar';
import { isWebGpuSupported } from '../../services/webllm';

function StartPage() {
    const navigate = useNavigate();
    const { pauseAudio } = useContext(AudioContext);
    const showAskBar = isWebGpuSupported();

    useEffect(() => {
        pauseAudio();
    }, [pauseAudio]);

    const goToGame = () => {
        navigate('/main');
    };

    const scrollBox = (value) => {
        return (
        <div style={{ height: `${value}vh` }}></div>
        )
    }

        const scrollText = (text) => {
        return (
            <ScrollReveal
                    baseOpacity={0}
                    enableBlur={true}
                    baseRotation={5}
                    blurStrength={10}
                    rotationEnd="top center"
                    wordAnimationEnd="top center"
                    containerClassName="centered-text"
            >
                    {text}
            </ScrollReveal>
        )
    }

    const startPageContent = (content) => {
        return content.map((item, index) => (
            scrollText(item)
        ));
    }

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
            <div className="start-page-content">
                {scrollBox(10)}
                {renderProfileCard()}
                <h1 className="main-menu-title">Hello there!</h1>
                {showAskBar ? <AskBar /> : null}
                <UIGlassButton onClick={onResume}>See my Resume</UIGlassButton>
                {scrollBox(5)}
                <Socials glass />
                {scrollBox(5)}
                {startPageContent(contentArray)}
                <h4 className="main-menu-title">Explore my portfolio through an island</h4>
                <UIButton onClick={goToGame}>Explore</UIButton>
                <h4 className="main-menu-title">Let me know what you think!</h4>
                {scrollBox(20)}
            </div>
        </div>
    );
}

export default StartPage;


