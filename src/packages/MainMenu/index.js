import React, { useContext } from 'react';
import './MainMenu.css';
import UIButton from '../Button/UIButton';
import BackgroundVideo from './BackgroundVideo';
import bgArtVideo from '../../assets/bg/bgArt.mp4';
import { useNavigate } from 'react-router-dom';
import { onResume } from '../utils/utils';
import { AudioContext } from '../../context/AudioContext';


function MainMenu() {
    const navigate = useNavigate();
    const { bgAudioObject, playAudio, pauseAudio } = useContext(AudioContext);
    const [musicOn, setMusicOn] = React.useState(!!bgAudioObject);

    const onPlay = () => {
        console.log("Play button clicked");
        setTimeout(() => {
            playAudio();
        }, 3000)
        navigate('/game');
    };

    const onMusic = () => {
        if (musicOn) {
            pauseAudio();
        } else {
            playAudio();
        }
        setMusicOn(!musicOn);
    };

    const onAbout = () => {
        if (musicOn) {
            pauseAudio();
        }
        navigate('/')
    };

    React.useEffect(() => {
        setMusicOn(!!bgAudioObject);
    }, [bgAudioObject]);

    return (
        <div className="main-menu-background-wrapper">
            <BackgroundVideo videoPath={bgArtVideo} />
            <div className="main-menu-container">
                <h1 className="main-menu-title">Game Menu</h1>
                <UIButton onClick={onPlay}>Play</UIButton>
                <UIButton onClick={onResume}>See my Resume</UIButton>
                <UIButton onClick={onMusic}>{musicOn ? 'Music: On' : 'Music: Off'}</UIButton>
                <UIButton onClick={onAbout}>About Me</UIButton>
            </div>
        </div>
    );
}


export default MainMenu;