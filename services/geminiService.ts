
import { GoogleGenAI, Modality } from "@google/genai";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export async function translateMedicalText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const ai = getAIClient();
  
  const systemInstruction = `
    You are an expert medical interpreter with 20 years of experience in clinical settings.
    CRITICAL INSTRUCTION: Translate the following healthcare conversation from ${sourceLang} to ${targetLang} with 100% medical accuracy.
    1. NEVER alter medical terms, medication names, or dosages.
    2. Maintain the exact meaning. Do NOT paraphrase or simplify clinical terminology unless it is a direct explanation from the provider.
    3. Ensure the tone remains professional yet accessible.
    4. If a word has no direct medical equivalent, use the closest clinical term used in the target language's healthcare system.
    5. Provide ONLY the translated text. No commentary.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text }]}],
      config: {
        systemInstruction,
        temperature: 0.0, // Absolute minimum randomness for medical precision
      },
    });

    // Prefer SDK helper when available, otherwise fallback to candidates path
    const r: any = response as any;
    const viaMethod = typeof r.text === 'function' ? r.text() : undefined;
    const viaProp = typeof r.text === 'string' ? r.text : undefined;
    const viaCandidates = r?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
    return viaMethod ?? viaProp ?? viaCandidates ?? "Translation failed.";
  } catch (error) {
    console.error("Translation error:", error);
    return "Error: Unable to connect to translation service.";
  }
}

export async function generateMedicalSpeech(text: string, voice: string = 'Kore'): Promise<ArrayBuffer> {
  const ai = getAIClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly and professionally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");

    return decodeBase64(base64Audio);
  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
}

function decodeBase64(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function decodePcmAudio(
  data: ArrayBuffer,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  // First try decoding with browser's decoder (handles MP3/OGG/WAV/etc.)
  try {
    const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      // slice to detach the buffer for decodeAudioData in some browsers
      ctx.decodeAudioData(data.slice(0), resolve, reject);
    });
    return audioBuffer;
  } catch {
    // Fall back to manual PCM (Int16) decoding as previously implemented
    const dataInt16 = new Int16Array(data);
    const frameCount = Math.floor(dataInt16.length / numChannels);
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}
