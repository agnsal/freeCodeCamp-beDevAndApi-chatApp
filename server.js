import http from 'http';
import fs from 'fs';
import { WebSocket, WebSocketServer } from 'ws';
import { join, extname, resolve, sep } from 'path';

const PORT = 3001;
const wsUrl = "http://localhost";
const home = "index.html";
const contentTypes = {
    html: "text/html",
    js: "text/javascript",
    css: "text/css",
    json: "application/json",
    ico: "image/x-icon",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    bmp: "image/bmp",
    tif: "image/tiff",
    tiff: "image/tiff",
    default: "application/octet-stream"
};
const __dirname = import.meta.dirname;
// // For compatibility with older versions of Node
// import { fileURLToPath } from 'url';
// import { dirname, join, extname, resolve, sep } from 'path';
//
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
// //

const server = http.createServer((req, res) => {
    let ru;
    try {
        ru = decodeURIComponent(new URL(req.url, wsUrl).pathname.slice(1));
    } catch {
        res.writeHead(400).end("Bad Request");
        return;
    }
    const fp = join(__dirname, "public", ru === "" ? home : ru);
    const publicDir = resolve(__dirname, "public");
    const resolvedPath = resolve(fp);
    if (!resolvedPath.startsWith(publicDir + sep)) {
        res.writeHead(403).end("Forbidden");
        return;
    }
    fs.readFile(fp, (err, data) => {
        if(err){
            const [sc, msg] = err.code === "ENOENT" ? [404, "File not found"] : [500, "Something went wrong"];
            if(sc === 500) console.error(err);
            res.writeHead(sc).end(msg);
            return;
        }
        res.setHeader("Content-Type", contentTypes[extname(fp).slice(1).toLowerCase() || "default"]).end(data);
    });
});

const notifyClients = (wss, typeStr, text, username) => {
    wss.clients.forEach(client => {
        if(client.readyState === WebSocket.OPEN){
            client.send(JSON.stringify({
                type: typeStr,
                username,
                text
            }));
        }
    });
}

const wss = new WebSocketServer({server});
wss.on("connection", (socket, req) => {
    const username = new URL(req.url, wsUrl).searchParams.get("username");
    notifyClients(wss, "system", `${username} joined`);

    socket.on("message", text => notifyClients(wss, "chat", JSON.parse(text.toString())?.text, username));
    socket.on("close", () => notifyClients(wss, "system", `${username} left`));
});

server.listen(PORT, () => console.log(`Chat server running at ${wsUrl}:${PORT}`));

