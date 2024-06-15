import express from 'express';
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { Server as SocketIO } from 'socket.io';
import bodyParser from 'body-parser';

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);

// FFmpeg process setup (assumed to be running continuously)
app.post('/submit', (req, res) => {
    const inputValue = req.body.inputValue;
    console.log('Received input:', inputValue); // Debugging
    res.json({ message: `Received value: ${inputValue}` });
});
const options = [
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-r', '25',
    '-g', '50',
    '-keyint_min', 25,
    '-crf', '25',
    '-pix_fmt', 'yuv420p',
    '-sc_threshold', '0',
    '-profile:v', 'main',
    '-level', '3.1',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '32000',
    '-f', 'flv',
    `rtmp://a.rtmp.youtube.com/live2/${inputValue}`,
];
const ffmpegProcess = spawn('ffmpeg', options);

ffmpegProcess.stdout.on('data', (data) => {
    console.log(`ffmpeg stdout: ${data}`);
});

ffmpegProcess.on('close', (code) => {
    console.log(`ffmpeg process exited with code ${code}`);
});

// Middleware
app.use(bodyParser.json());

// Serve static files
app.use(express.static(path.resolve('./Public')));

// Route to handle input value submission

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('Socket Connected', socket.id);
    socket.on('binarystream', (stream) => {
        console.log('Binary stream is coming...');
        ffmpegProcess.stdin.write(stream, (err) => {
            if (err) {
                console.log('Error', err);
            }
        });
    });
});

// Start the server
server.listen(3000, () => console.log('HTTP server is running on PORT 3000'));
