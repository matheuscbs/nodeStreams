// node -e "process.stdout.write('hello world'.repeat(1e5))" > big.file

import { CallTracker, deepStrictEqual } from "node:assert";
import { createReadStream } from "node:fs";
import { createServer, get } from "node:http";
import { PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";
import { setTimeout } from "node:timers/promises";

const fileStream1 = createReadStream("./big.file");
const fileStream2 = createReadStream("./big.file");

createServer((request, response) => {
  console.log("connection received from API 01");
  // can consume partially stream
  fileStream1.pipe(response);
}).listen(3000, () => console.log("running at 3000"));

createServer(async (request, response) => {
  console.log("connection received from API 02");
  // ERR_STREAM_PREMATURE_CLOSE if you don't consume the whole stream!
  await pipeline(fileStream2, response);
}).listen(3001, () => console.log("running at 3001"));

// --------

await setTimeout(500);

const getHttpStream = (url) =>
  new Promise((resolve) => {
    get(url, (response) => resolve(response));
  });

const pass = () => PassThrough();
const streamPipe = await getHttpStream("http://localhost:3000");
streamPipe.pipe(pass());

const streamPipeline = await getHttpStream("http://localhost:3001");
streamPipeline.pipe(pass());

streamPipe.destroy();
streamPipeline.destroy();

const tracker = new CallTracker();
const fn = tracker.calls((msg) => {
  console.log("stream.pipeline rejects if you don't fully consume it");
  deepStrictEqual(msg.message, "Premature Close");
  process.exit();
});

process.on("uncaughtException", fn);

await setTimeout(10);
tracker.verify();
