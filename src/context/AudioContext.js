import { createContext, useState } from 'react';
import bgm from '../assets/sound/bgm.mp3';

export const AudioContext = createContext();

export function AudioProvider({ children }) {
  const [bgAudioObject, setBgAudioObject] = useState(null);

  const playAudio = () => {
    if (!bgAudioObject) {
      console.log('Playing background audio');
      const audio = new Audio(bgm);
      audio.loop = true;
      audio.play().catch((err) => {
        console.error('Error playing audio:', err);
      });
      setBgAudioObject(audio);
    } else {
      console.warn('Background audio is already playing');
    }
  };

  const pauseAudio = () => {
    if (bgAudioObject) {
      console.log('Pausing background audio');
      bgAudioObject.pause();
    }
    setBgAudioObject(null);
  };

  return (
    <AudioContext.Provider value={{ bgAudioObject, playAudio, pauseAudio }}>
      {children}
    </AudioContext.Provider>
  );
}
