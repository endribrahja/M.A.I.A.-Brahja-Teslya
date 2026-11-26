# MAIA AI

La modalità predefinita usa analisi statistiche interpretate localmente. Per domande libere usa OpenAI, Ollama o un servizio compatibile Chat Completions con streaming e tool calling.

## Configurazione

OpenAI in `.env`:

```dotenv
MAIA_AI_PROVIDER=openai
MAIA_AI_MODEL=<identificativo disponibile nel tuo account API>
OPENAI_API_KEY=<chiave>
```

Ollama sullo stesso host, con un modello che dichiara il supporto agli strumenti:

```bash
ollama pull qwen2.5:3b
ollama serve
```

```dotenv
MAIA_AI_PROVIDER=ollama
MAIA_AI_MODEL=qwen2.5:3b
MAIA_AI_BASE_URL=http://127.0.0.1:11434/v1
```

Il provider `compatible` richiede URL HTTPS, modello e chiave in `MAIA_AI_API_KEY`. In Docker `127.0.0.1` identifica il container. Per Ollama sullo stesso host usa l’avvio nativo oppure configura un endpoint HTTPS compatibile raggiungibile dal container.

Dalla radice, verifica la configurazione con una domanda sintetica:

```bash
set -a
source .env
set +a
.venv/bin/python -m scripts.ai_check
```

La verifica OpenAI è una richiesta API a consumo. Per l’interfaccia avvia o riavvia con `bash start.sh`.

## Dati e strumenti

Il provider riceve testo degli ultimi turni e risultati sintetici degli strumenti invocati. Gli strumenti sono limitati all’abitazione della conversazione e ricontrollano sessione e proprietà. Possono consultare letture, profilo sintetico, confronti, obiettivi, costi, previsioni, stato dei contatori, avvisi e consumi attribuiti alle stanze. Gli strumenti di storico e previsione possono mostrare grafici. Lo strumento report prepara il link al PDF per il periodo richiesto. La selezione di una vista richiede un clic sul risultato della chat. L’assistente non dispone di azioni di scrittura.

Il server limita a una generazione simultanea per account e a sei avvii al minuto per processo. Le conversazioni sono cancellabili e hanno un limite di 100 messaggi. Le richieste al provider includono fino a 12 turni, ciascuno limitato a 1.400 caratteri. Il frontend visualizza Markdown di base mediante nodi di testo. Le interruzioni possono essere rigenerate.

I test simulano il provider e la risposta a strumenti. La verifica live dipende dal provider e dalle credenziali scelti. Conserva le chiavi lato server e usa solo contenuti fittizi.

- [OpenAI Chat Completions](https://platform.openai.com/docs/api-reference/chat)
- [Ollama e compatibilità OpenAI](https://docs.ollama.com/openai)
