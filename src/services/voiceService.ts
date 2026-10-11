const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || "";
const VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Default Rachel voice

// Two-tone chime alert before patient announcement
function playChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.38);

      // Note 2: G#5 (830.61 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(830.61, now + 0.18);
      gain2.gain.setValueAtTime(0.12, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.6);

      setTimeout(() => {
        resolve();
      }, 650);
    } catch {
      resolve();
    }
  });
}

function speakWithBrowser(text: string) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.88;
  utterance.pitch = 1.0;
  utterance.lang = "en-US";

  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find((v) => v.lang.startsWith("en") && !v.name.includes("Google"));
  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export async function announceNumber(
  serviceName: string,
  referenceId: string,
  patientName?: string
) {
  // Extract numerical digits so TTS articulates each number distinctly (e.g., "APT-5369" -> "5 3 6 9")
  const digitsOnly = referenceId.replace(/\D/g, "");
  const spokenDigits = digitsOnly.split("").join(" ");

  // Announcement script: "Now serving, Vaccination. Number 5 3 6 9. Juan Dela Cruz."
  const textToSpeak = patientName
    ? `Now serving, ${serviceName}. Number ${spokenDigits || referenceId}. ${patientName}.`
    : `Now serving, ${serviceName}. Number ${spokenDigits || referenceId}.`;

  await playChime();

  if (ELEVENLABS_API_KEY && ELEVENLABS_API_KEY.trim() !== "") {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: textToSpeak,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.85,
          },
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        await audio.play();
        return;
      }
    } catch (err) {
      console.warn("ElevenLabs network issue, using fallback browser voice:", err);
    }
  }

  speakWithBrowser(textToSpeak);
}