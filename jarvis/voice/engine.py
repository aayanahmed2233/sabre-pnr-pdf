"""
JARVIS voice engine: speech-to-text (STT) + text-to-speech (TTS).

Both are local. STT prefers Vosk (lightweight, CPU-friendly), falls back to a
clear message if unavailable. TTS uses Windows SAPI (offline, no AVX), with an
espeak-ng fallback.

These modules degrade gracefully: if the optional libs aren't installed, the
methods return a helpful message instead of crashing the app.
"""


def _vosk_available():
    try:
        import vosk  # noqa: F401
        return True
    except ImportError:
        return False


class SpeechToText:
    def __init__(self, model_path: str = "", sample_rate: int = 16000):
        self.model_path = model_path
        self.sample_rate = sample_rate
        self._recognizer = None

    def available(self) -> bool:
        return _vosk_available() and bool(self.model_path)

    def _ensure(self):
        if self._recognizer is not None:
            return
        if not self.available():
            raise RuntimeError(
                "Vosk STT not available. Install: pip install vosk, and download "
                "a model (e.g. vosk-model-small-en-us-0.15). Set voice.stt model "
                "path in Settings.")
        from vosk import Model, KaldiRecognizer
        import wave  # noqa: F401
        model = Model(self.model_path)
        self._recognizer = KaldiRecognizer(model, self.sample_rate)

    def transcribe_stream(self):
        """
        Generator yielding partial/final transcripts from the default mic.
        Requires sounddevice. Each yield is a dict {'text','final'}.
        """
        self._ensure()
        try:
            import sounddevice as sd
        except ImportError:
            raise RuntimeError("Microphone capture needs: pip install sounddevice")

        import json
        with sd.RawInputStream(samplerate=self.sample_rate, blocksize=8000,
                               dtype="int16", channels=1) as stream:
            while True:
                data, _ = stream.read(4000)
                if self._recognizer.AcceptWaveform(bytes(data)):
                    res = json.loads(self._recognizer.Result())
                    if res.get("text"):
                        yield {"text": res["text"], "final": True}
                else:
                    res = json.loads(self._recognizer.PartialResult())
                    if res.get("partial"):
                        yield {"text": res["partial"], "final": False}


class TextToSpeech:
    """Windows SAPI TTS (primary) with espeak-ng fallback."""

    def __init__(self, voice_name: str = "", rate: int = 0):
        self.voice_name = voice_name
        self.rate = rate

    def available(self) -> bool:
        return self._sapi_available() or self._espeak_available()

    @staticmethod
    def _sapi_available() -> bool:
        try:
            import win32com.client  # noqa: F401
            return True
        except ImportError:
            return False

    @staticmethod
    def _espeak_available() -> bool:
        import shutil
        return shutil.which("espeak-ng") is not None or shutil.which("espeak") is not None

    def speak(self, text: str):
        if not text:
            return
        if self._sapi_available():
            import win32com.client
            speaker = win32com.client.Dispatch("SAPI.SpVoice")
            if self.voice_name:
                try:
                    for tok in speaker.GetVoices():
                        if self.voice_name.lower() in tok.Getdescription().lower():
                            speaker.Voice = tok
                            break
                except Exception:  # noqa: BLE001
                    pass
            speaker.Rate = self.rate
            speaker.Speak(text)
            return
        if self._espeak_available():
            import shutil
            exe = shutil.which("espeak-ng") or shutil.which("espeak")
            import subprocess
            subprocess.Popen([exe, text])
            return
        raise RuntimeError("No TTS engine available (install pywin32 for SAPI, "
                           "or espeak-ng).")