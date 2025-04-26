# DF-LFG-Bot
Delta Force LFG Discord Bot with auto-generated voice channel support. This bot helps players form groups for Operations in Delta Force.

## Features

- **LFG Creation**: Create Looking For Group requests with map selection, difficulty, and other gameplay preferences
- **Auto Voice Channels**: Automatically generates voice channels for LFG groups
- **Map Rotation Support**: Shows only currently available maps based on the official game rotation
- **Role Pings**: Configurable role pings when new LFG requests are created
- **User-Friendly Interface**: Interactive dropdown menus for all selections
- **Temporary Voice Channels**: Create temporary voice channels for quick gaming sessions

## Map Rotation System

The bot tracks the current map rotation based on UTC time:

### Permanent Maps
* Zero Dam (Easy, Normal)
* Layali Grove (Easy)

### Rotating Maps
* Zero Dam – Blackout: Long Night (Normal)
* Layali Grove (Normal)
* Space City (Normal, Hard)
* Brakkesh (Normal)

## Commands

- `/lfg create` - Start the LFG creation process
- `/lfg close` - Close your active LFG request
- `/lfg rotation` - View information about the current map rotation

## Setup

Administrators can configure the bot for their server using:
- `/setup-lfg` - Configure announcement channel, voice category, and ping role

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
