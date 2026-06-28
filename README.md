# packwiz-suggestion-bot

## Docker Compose

```yaml
services:
  bot:
    image: ghcr.io/nicoladen05/packwiz-suggestion-bot:latest
    restart: unless-stopped
    environment:
      TOKEN: ${TOKEN}
      CLIENT_ID: ${CLIENT_ID}
      # Optional: deploy commands to one guild during development
      # GUILD_ID: ${GUILD_ID}
    volumes:
      - packwiz-bot-data:/data

volumes:
  packwiz-bot-data:
```

Create a `.env` next to the compose file:

```env
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
# GUILD_ID=your_discord_guild_id
```
