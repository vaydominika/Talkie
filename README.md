# Talkie

## Local PostgreSQL

The development database runs from the portable PostgreSQL binaries in `.local/`.
The binaries, database files, and logs are workspace-local and ignored by Git.

```powershell
npm run db:local:start
npx prisma migrate deploy
npm run dev
```

`npm run dev` starts PostgreSQL automatically before Next.js. Use `npm run dev:next`
only when the database is already managed separately. Stop the database with
`npm run db:local:stop` when it is no longer needed.

## Azure Speech setup

Server-side pronunciation audio uses Azure AI Speech. Set these environment variables in your local `.env` and production deployment:

```env
AZURE_SPEECH_KEY="your-azure-speech-key"
AZURE_SPEECH_REGION="your-azure-region"
```

Do not expose the subscription key to client-side code or commit real secrets.
