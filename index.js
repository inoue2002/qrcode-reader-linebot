//ローカルで動かす
"use strict";

const express = require("express");
const line = require("@line/bot-sdk");
const QRReader = require("qrcode-reader");
const jimp = require("jimp");
const PORT = process.env.PORT || 3000;
const dotenv = require("dotenv");
dotenv.config();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();

app.get("/", (req, res) => res.send("Hello（GET)"));
app.post("/webhook", line.middleware(config), (req, res) => {
  console.log(req.body.events);

  if (
    req.body.events[0].replyToken === "00000000000000000000000000000000" &&
    req.body.events[1].replyToken === "ffffffffffffffffffffffffffffffff"
  ) {
    res.send("Hello!(POST)");
    console.log("疎通確認用");
    return;
  }

  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
});

const client = new line.Client(config);

async function handleEvent(event) {
  let message;
  switch (event.type) {
    case "follow":
      message = { type: "text", text: "友達登録ありがとう！" };
      break;
    case "message":
      message = await messageFunc(event);
      break;
    default:
      return Promise.resolve(null);
  }

  return client.replyMessage(event.replyToken, message);
}

app.listen(PORT);
console.log(`Server running at ${PORT}`);

async function messageFunc(event) {
  let message;
  switch (event.message.type) {
    case "text":
      message = {
        type: "text",
        text: `${event.message.type}メッセージをありがとう！`,
      };
      break;
    case "image":
      message = await imageFunc(event);
      break;
    default:
      message = { type: "text", text: "メッセージありがとう！" };
      break;
  }
  return message;
}

async function imageFunc(event) {
  let message;
  const imageBuffer = await (() =>
    new Promise((resolve) => {
      client.getMessageContent(event.message.id).then((stream) => {
        const bufs = [];
        stream.on("data", (chunk) => {
          bufs.push(chunk);
        });
        stream.on("end", async () => {
          resolve(Buffer.concat(bufs));
        });
        stream.on("error", (err) => {
          // error handling
        });
      });
    }))();
  const img = await jimp.read(imageBuffer);
  const qr = new QRReader();
  const value = await new Promise((resolve, reject) => {
    qr.callback = (err, v) => (err != null ? reject(err) : resolve(v));
    qr.decode(img.bitmap);
  });
  message = { type: "text", text: `解析結果${value.result}` };

  return message;
}
