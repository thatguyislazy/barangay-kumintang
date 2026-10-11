const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || "";
const ELEVENLABS_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Default Rachel voice

// Play an alert tone using Web Audio API before speaking
function playChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        resolve();
        return;
      }
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);

      setTimeout(() => {
        resolve();
      }, 550);
    } catch {
      resolve();
    }
  });
}

export const voiceService = {
  async speak(text: string): Promise<void> {
    try {
      await playChime();

      // If ElevenLabs API Key is present, use ElevenLabs TTS
      if (ELEVENLABS_API_KEY) {
        try {
          const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "xi-api-key": ELEVENLABS_API_KEY,
              },
              body: JSON.stringify({
                text,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.75,
                },
              }),
            }
          );

          if (response.ok) {
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            await audio.play();
            return;
          }
        } catch (elevenErr) {
          console.warn("ElevenLabs TTS failed, falling back to browser speech:", elevenErr);
        }
      }

      // Default browser SpeechSynthesis fallback
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.lang = "en-US";
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error("voiceService: Error speaking text:", err);
    }
  },
};

export default voiceService;