# Tux Bot 🎵

A feature-rich Discord music bot to play songs from YouTube videos.

## Features

### Commands

| Command             | Description                                          | Example                               |
| ------------------- | ---------------------------------------------------- | ------------------------------------- |
| `play` `p`       | Plays a track or adds a track/playlist to the queue.             | `/play Never gonna give you up`         |
| `skip` `s`            | Skips the current track.                   | `/skip`                              |
| `join`            | Joins the selected voice channel. If none is selected, joins the voice channel you are currently in.                             | `/join` |
| `leave`            | Leaves the voice channel.                             | `/leave`                             |
| `nowplaying` `np` `now`            | Shows the track currently being played.                   | `/nowplaying`                              |
| `queue` `q`            | Displays the queue.                   | `/queue`                              |
| `clear`            | Clears the queue.                   | `/clear`                              |
| `remove`           | Removes the track at the specified position from the queue.                   | `/remove 2`                              |
| `loop`       | Sets the loop mode (off, track, or queue).             | `/loop queue`         |
| `forward`       | Forwards the current track by the specified number of seconds.             | `/forward 30`         |
| `rewind`       | Rewinds the current track by the specified number of seconds.             | `/rewind 30`         |
| `speed`       | Sets the playback speed.             | `/speed 1.5`         |
| `prefix`       | Sets the prefix for the server or shows the current one.             | `/prefix !`         |

### Other features

* To interact with the bot, you may use either the modern slash commands and the classic prefixes. Use the `prefix` command to set the prefix.
* The bot will leave the voice channel automatically if alone.

## How To Install

Follow these instructions to get a copy of the bot up and running on your local machine.

### Prerequisites

* **[Node.js](https://nodejs.org/)**
* A **Discord Bot Application**. You can create one from the [Discord Developer Portal](https://discord.com/developers/applications).

### Installation

1.  **Clone the repository:**

    ```sh
    git clone https://github.com/RafaelSantos777/TuxBot.git
    cd TuxBot
    ```

2.  **Install dependencies:**

    ```sh
    npm install
    ```

3. **Configure the bot:**

    * Create a new file in the project's root directory named `.env`:
    ```sh
    nano .env
    ```
    * Add the following values (available in the [Discord Developer Portal](https://discord.com/developers/applications)) to the `.env` file:
    ```env
      BOT_TOKEN = [YOUR_BOT_TOKEN]
      APPLICATION_ID = [YOUR_BOT_APPLICATION_ID]
    ```

4. **Compile the TypeScript code** into JavaScript:

    ```sh
    npx tsc
    ```

5.  **Start the bot**:
    ```sh
    npm start
    ```
