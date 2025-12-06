import React, { useContext } from 'react';
import './MainMenu.css';
import UIButton from '../Button/UIButton';
import BackgroundVideo from './BackgroundVideo';
import bgArtVideo from '../../assets/bg/bgArt.mp4';
import { useNavigate } from 'react-router-dom';
import { onResume } from '../utils/utils';
import { AudioContext } from '../../context/AudioContext';
import Socials from '../Socials';
import { Buttons } from '../utils/constant';


function MainMenu() {
    const navigate = useNavigate();
    const { bgAudioObject, playAudio, pauseAudio } = useContext(AudioContext);
    const [musicOn, setMusicOn] = React.useState(!!bgAudioObject);

    const onPlay = () => {
        console.log("Play button clicked");
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

    const onExit = () => {
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
                <h1 className="main-menu-title">Arjun's Island</h1>
                <UIButton onClick={onPlay}>{Buttons.play}</UIButton>
                <UIButton onClick={onResume}>{Buttons.resume}</UIButton>
                <UIButton onClick={onMusic}>{musicOn ? Buttons.musicOn : Buttons.musicOff}</UIButton>
                <UIButton onClick={onExit}>{Buttons.exit}</UIButton>
                <Socials />
            </div>
        </div>
    );
}


export default MainMenu;