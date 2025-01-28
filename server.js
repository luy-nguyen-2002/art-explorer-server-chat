const http = require('http');
const WebSocket = require('ws');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let players = {};

wss.on('connection', (ws) => {
    console.log('A user connected');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            switch (data.action) {
                case 'joinGame':
                    players[ws] = { username: data.username, score: null, competitor: null, ready: false };
                    console.log(`${data.username} joined the game`);
                    ws.send(JSON.stringify({ action: 'joined', message: "Join successful. You can now take the quiz." }));
                    break;
                case 'saveScore':
                    if (players[ws]) {
                        players[ws].score = data.score;
                        console.log(`${players[ws].username} scored ${data.score}`);
                        ws.send(JSON.stringify({ action: 'scoreSaved', message: "Your score is saved." }));
                    } else {
                        console.log('Player not found while saving score.');
                    }
                    break;
                case 'ready':
                    const player = players[ws];
                    const competitorWs = [...wss.clients].find(client =>
                        players[client] && players[client].username === data.competitorUsername
                    );
                    if (player && player.score !== null) {
                        player.ready = true;
                        player.competitor = data.competitorUsername;
                        if (competitorWs && players[competitorWs].score !== null && players[competitorWs].ready) {
                            const playerScore = player.score;
                            const competitorScore = players[competitorWs].score;
                            const winner = playerScore > competitorScore ? player.username : players[competitorWs].username;
                            const winnerMessage = `Winner is: ${winner}`;
                            ws.send(JSON.stringify({ action: 'winner', message: winnerMessage }));
                            competitorWs.send(JSON.stringify({ action: 'winner', message: winnerMessage }));
                        } else {
                            console.log('Competitor is not ready or score is missing.');
                            ws.send(JSON.stringify({ action: 'waiting', message: "Waiting for competitor readiness." }));
                        }
                    } else {
                        console.log('Player is not ready or has not completed the quiz.');
                        ws.send(JSON.stringify({ action: 'error', message: "Please take the quiz before getting ready." }));
                    }
                    break;
                default:
                    console.log("Unknown action received:", data.action);
                    ws.send(JSON.stringify({ action: 'error', message: "Unknown action." }));
            }
        } catch (error) {
            console.error('Error parsing message:', error);
            ws.send(JSON.stringify({ action: 'error', message: "Invalid message format." }));
        }
    });
    ws.on('close', () => {
        if (players[ws]) {
            console.log(`${players[ws].username} disconnected`);
            delete players[ws];
        }
    });
});
server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
