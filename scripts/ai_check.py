"""Probe the exact configured model with a synthetic streamed chat prompt."""
from backend.assistant import status
from backend.chat import provider_stream

settings = status()
if not settings["configured"]:
    raise SystemExit("Configura MAIA_AI_PROVIDER, MAIA_AI_MODEL e le eventuali credenziali.")
try:
    messages = [{"role": "user", "content": "Rispondi in una parola: pronto."}]
    text = "".join(delta.get("content") or "" for delta in provider_stream(messages, True))
    if not text.strip():
        raise ValueError
except (OSError, ValueError, KeyError, TypeError):
    raise SystemExit("Provider o modello indisponibile per lo streaming con strumenti.") from None
print(f"Configurazione raggiungibile: {settings['provider']} / {settings['model']}")
