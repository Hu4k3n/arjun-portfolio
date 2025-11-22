import React, { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './StartPage.css';
import ProfileCard from '../ProfileCard';
import pic from '../../assets/avatar/avatar-pic.png'
import Aurora from '../BgWaves';
import ScrollReveal from '../ScrollReveal';
import UIButton from '../Button/UIButton';
import { onResume, sendEmail } from '../utils/utils';
import { contentArray, ProfileCardInfo } from '../utils/constant';
import { AudioContext } from '../../context/AudioContext';

function StartPage() {
    const navigate = useNavigate();
    const { pauseAudio } = useContext(AudioContext);

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
                    handle={ProfileCardInfo.handle}
                    status={ProfileCardInfo.status}
                    contactText="Email Me"
                    avatarUrl={pic}
                    showUserInfo={true}
                    enableTilt={true}
                    onContactClick={() => sendEmail({to: ProfileCardInfo.email, subject: " ", body: " "})}
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
                {scrollBox(10)}
                <h1 className="main-menu-title">Hello there!</h1>
                {scrollBox(10)}
                <UIButton onClick={onResume}>See my Resume</UIButton>
                {scrollBox(10)}
                {startPageContent(contentArray)}
                {scrollBox(10)}
                <UIButton onClick={goToGame}>Open Hrkn World</UIButton>
                {scrollBox(10)}
            </div>
        </div>
    );
}

export default StartPage;


