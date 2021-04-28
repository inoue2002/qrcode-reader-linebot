//Lambdaで動かす
"use strict";
// モジュール呼び出し
const crypto = require("crypto");
const line = require("@line/bot-sdk");
const QRReader = require("qrcode-reader");
const jimp = require("jimp");

// インスタンス生成
const client = new line.Client({ channelAccessToken: process.env.ACCESSTOKEN });

exports.handler = (event) => {
  let signature = crypto
    .createHmac("sha256", process.env.CHANNELSECRET)
    .update(event.body)
    .digest("base64");
  let checkHeader = (event.headers || {})["X-Line-Signature"];
  if (!checkHeader) {
    checkHeader = (event.headers || {})["x-line-signature"];
  }

  const body = JSON.parse(event.body);
  const events = body.events;
  console.log(events);

  // 署名検証が成功した場合
  if (signature === checkHeader) {
    events.forEach(async (event) => {
      let message;
      switch (event.type) {
        case "message":
          message = await messageFunc(event);
          break;
        case "postback":
          message = await postbackFunc(event);
          break;
        case "follow":
          message = { type: "text", text: "追加ありがとうございます！" };
          break;
      }
      // メッセージを返信
      if (message != undefined) {
        await sendFunc(body.events[0].replyToken, message);
        // .then(console.log)
        // .catch(console.log);
        return;
      }
    });
  }
  // 署名検証に失敗した場合
  else {
    console.log("署名認証エラー");
  }
};

async function sendFunc(replyToken, mes) {
  const result = new Promise(function (resolve, reject) {
    client.replyMessage(replyToken, mes).then((response) => {
      resolve("送信完了");
    });
  });
  return result;
}

async function messageFunc(event) {
  let message = "";
  message = { type: "text", text: `メッセージイベント` };
  if (event.message.type === "image") {
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
  }
  return message;
}
const postbackFunc = async function (event) {
  let message = "";
  message = { type: "text", text: "ポストバックイベント" };
  return message;
};
