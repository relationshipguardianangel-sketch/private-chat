# Private Chat

A minimal browser-to-browser chat using WebRTC DataChannels.

## Deployment

Upload `index.html`, `style.css`, and `app.js` to a GitHub repository and enable GitHub Pages.

## Usage

1. Open the site in browser A.
2. Click Create Chat.
3. Copy the generated connection code.
4. Send it to browser B.
5. Browser B pastes it and clicks Join Chat.
6. Browser B copies the response code.
7. Send the response back to browser A.
8. Browser A pastes the response and clicks Connect.

Messages are sent over a WebRTC DataChannel and are not stored by this application.

## Note

The initial version uses manual signaling. A later version can add a signaling service so the two users only need to exchange a URL.
