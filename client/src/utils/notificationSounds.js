const SOUND_PATTERNS = {
    default: [
        { frequency: 740, duration: 0.10, offset: 0, wave: "sine" },
        { frequency: 560, duration: 0.13, offset: 0.10, wave: "sine" }
    ],
    softPop: [
        { frequency: 520, duration: 0.08, offset: 0, wave: "sine" },
        { frequency: 780, duration: 0.10, offset: 0.07, wave: "sine" }
    ],
    classic: [
        { frequency: 880, duration: 0.11, offset: 0, wave: "sine" },
        { frequency: 660, duration: 0.15, offset: 0.14, wave: "sine" }
    ],
    minimal: [
        { frequency: 660, duration: 0.12, offset: 0, wave: "sine" }
    ],
    digital: [
        { frequency: 1046, duration: 0.06, offset: 0, wave: "square" },
        { frequency: 784, duration: 0.07, offset: 0.08, wave: "square" },
        { frequency: 1174, duration: 0.09, offset: 0.17, wave: "square" }
    ]
};

export const NOTIFICATION_SOUND_OPTIONS = [
    { value: "default", label: "Default" },
    { value: "softPop", label: "Soft Pop" },
    { value: "classic", label: "Classic" },
    { value: "minimal", label: "Minimal Beep" },
    { value: "digital", label: "Digital Alert" }
];

export function playNotificationSound(soundName = "default") {
    const pattern = SOUND_PATTERNS[soundName] || SOUND_PATTERNS.default;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    let context;
    try {
        context = new AudioContextClass();
        const startAt = context.currentTime + 0.02;
        pattern.forEach(({ frequency, duration, offset, wave }) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const noteStart = startAt + offset;
            oscillator.type = wave;
            oscillator.frequency.setValueAtTime(frequency, noteStart);
            gain.gain.setValueAtTime(0.0001, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.10, noteStart + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(noteStart);
            oscillator.stop(noteStart + duration + 0.01);
        });
        const totalDuration = Math.max(...pattern.map(note => note.offset + note.duration)) + 0.08;
        window.setTimeout(() => context.close().catch(() => {}), totalDuration * 1000 + 100);
    } catch (error) {
        if (context) context.close().catch(() => {});
        console.debug("Notification sound unavailable:", error);
    }
}
