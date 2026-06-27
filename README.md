# Talkie

## Azure Speech setup

Server-side pronunciation audio uses Azure AI Speech. Set these environment variables in your local `.env` and production deployment:

```env
AZURE_SPEECH_KEY="your-azure-speech-key"
AZURE_SPEECH_REGION="your-azure-region"
```

Do not expose the subscription key to client-side code or commit real secrets.
