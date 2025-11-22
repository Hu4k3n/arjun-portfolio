
import React, { useEffect, useContext } from 'react';
import GameUI from '../GameUI';
import GodotCanvasAndStatus from './GodotCanvasAndStatus';
import './GodotGame.css';
import BackButton from '../../Button/BackButton';
import BackgroundVideo from '../../MainMenu/BackgroundVideo'; 
import gameBgArt from '../../../assets/bg/bgArt.mp4';
import { AudioContext } from '../../../context/AudioContext';

// This component renders the Godot game canvas and status overlays, then runs the Godot loader
function GodotGame() {
    const { playAudio, pauseAudio, bgAudioObject } = useContext(AudioContext);
    
    useEffect(() => {
        // Dynamically load the Godot engine script if not already loaded
        const godotScriptId = 'godot-engine-script';
        if (!document.getElementById(godotScriptId)) {
            const script = document.createElement('script');
            script.id = godotScriptId;
            script.src = '/index.js'; // CHANGED: now at public root
            script.async = false;
            script.onload = () => {
                // After engine is loaded, load the init script
                loadInitScript();
            };
            document.body.appendChild(script);
        } else {
            loadInitScript();
        }

        function loadInitScript() {
            // Load the init_godot_game.js and call init_godot_game()
            const initScriptId = 'godot-init-script';
            if (!document.getElementById(initScriptId)) {
                const script = document.createElement('script');
                script.id = initScriptId;
                script.src = '/init_godot_game.js';
                script.onload = () => {
                    if (window.init_godot_game) window.init_godot_game();
                };
                document.body.appendChild(script);
            } else {
                if (window.init_godot_game) window.init_godot_game();
            }
        }
        // Cleanup: remove canvas/status on unmount
        return () => {
            const canvas = document.getElementById('canvas');
            if (canvas) canvas.remove();
            const status = document.getElementById('status');
            if (status) status.remove();
        };
    }, []);

    // The Godot loader expects these elements to exist in the DOM
    return (
        <>
            <div className="godot-game-background">
                <BackgroundVideo 
                    videoPath={gameBgArt} 
                    posterPath={require('../../../assets/bg/bgArtPoster.png')}
                />
            </div>
            <BackButton 
                onPlay={playAudio}
                onPause={pauseAudio}
                bgAudioObject={bgAudioObject}
            />
            <div className="godot-game-root">
                <GodotCanvasAndStatus />
                <GameUI />
            </div>
        </>
    );
}


export default GodotGame;
