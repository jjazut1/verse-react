// Sound utility functions

// Declare the global gameSounds object
declare global {
  interface Window {
    gameSounds?: {
      crack?: HTMLAudioElement;
    };
  }
}

// Initialize game sounds
export const initGameSounds = () => {
  if (!window.gameSounds) {
    window.gameSounds = {};
  }
  
  // Create crack sound
  if (!window.gameSounds.crack) {
    const crackSound = new Audio('/sounds/crack.mp3');
    window.gameSounds.crack = crackSound;
  }
};

// Play a sound
export const playSound = (soundName: string) => {
  if (window.gameSounds && window.gameSounds[soundName as keyof typeof window.gameSounds]) {
    const sound = window.gameSounds[soundName as keyof typeof window.gameSounds];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(error => {
        console.error('Error playing sound:', error);
      });
    }
  }
}; 