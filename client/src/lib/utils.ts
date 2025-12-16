// Utility functions for OpenQuiz

// Get avatar class based on first letter of name
export function getAvatarClass(name: string): string {
  const letter = (name[0] || 'a').toLowerCase();
  return `avatar-${letter}`;
}

// Get initials from name (max 2 characters)
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Generate confetti pieces
export function createConfetti(count: number = 50): Array<{ id: number; left: number; color: string; delay: number; size: number }> {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 2,
    size: 8 + Math.random() * 8
  }));
}

// Format large numbers
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Calculate percentage
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Sound effects (using Web Audio API)
const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  gainNode.gain.value = volume;
  
  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  oscillator.stop(audioContext.currentTime + duration);
}

export const sounds = {
  correct: () => {
    playTone(523.25, 0.1, 'sine', 0.2); // C5
    setTimeout(() => playTone(659.25, 0.1, 'sine', 0.2), 100); // E5
    setTimeout(() => playTone(783.99, 0.15, 'sine', 0.2), 200); // G5
  },
  wrong: () => {
    playTone(200, 0.3, 'sawtooth', 0.15);
  },
  tick: () => {
    playTone(800, 0.05, 'sine', 0.1);
  },
  countdown: () => {
    playTone(440, 0.1, 'sine', 0.2);
  },
  victory: () => {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, 'sine', 0.2), i * 150);
    });
  },
  click: () => {
    playTone(600, 0.05, 'sine', 0.1);
  }
};

// Theme management
export function setTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('openquiz.theme', theme);
}

export function getTheme(): 'light' | 'dark' {
  return (localStorage.getItem('openquiz.theme') as 'light' | 'dark') || 'light';
}

export function setThemeColor(color: string) {
  document.documentElement.setAttribute('data-theme-color', color);
  localStorage.setItem('openquiz.themeColor', color);
}

export function getThemeColor(): string {
  return localStorage.getItem('openquiz.themeColor') || 'purple';
}

// Initialize theme on load
export function initTheme() {
  setTheme(getTheme());
  setThemeColor(getThemeColor());
}
