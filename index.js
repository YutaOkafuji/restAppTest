"use strict"
require("dotenv").config();
const express = require('express');
const app = express();
const request = require('request');
var async = require('async');

app.listen(process.env.PORT || 5000, () => {
  console.log(`server is listening to ${process.env.PORT || 5000}...`);
});
const line_bot = require("@line/bot-sdk");
const bot_config = {
  channelAccessToken: process.env.LINE_BOT_ACCESS_TOKEN,
  channelSecret: process.env.LINE_BOT_CHANNEL_SECRET
}

const bot_middleware = line_bot.middleware(bot_config);
const bot_client = new line_bot.Client(bot_config);

app.post('/bot', bot_middleware, (req, res, next) => {
  res.sendStatus(200);
  req.body.events.map(function (event) {
    // 接続確認の場合は無視する
    console.log(`Event: ${JSON.stringify(event)}`);
    if (event.replyToken == "00000000000000000000000000000000" || event.replyToken == "ffffffffffffffffffffffffffffffff") {
      console.log(`Had Connection check!!`);
      return;
    }
    if (event.message.type === "location") {

      let inputLatitude = event.message.latitude; // Requestで飛んできた経度、緯度を代入する。
      let inputLongitude = event.message.longitude; // Requestで飛んできた経度、緯度を代入する
      const URL = 'https://api.gnavi.co.jp/RestSearchAPI/v3/';

      let optionG = {
        uri: URL,
        headers: {
          'content-type': 'application/json; charset=UTF-8'
        },
        qs: {
          keyid: process.env.G_NAVI_KEY_ID,
          input_coordinates_mode: 1,
          latitude: inputLatitude,
          longitude: inputLongitude,
          range: 3,
          hit_per_page: 10
        },
        json: true
      }

      let searchResults = [];

      request.get(optionG, function (error, response, body) {

        if (!error && response.statusCode == 200) {
          if ('error' in body) {
            console.log("検索エラー" + JSON.stringify(body));
            return;
          }
          async.each(response.body.rest, function (row, callback) {
            let searchResult = [];
            searchResult['image'] = row.image_url.shop_image1;
            searchResult['name'] = row.name;
            searchResult['address'] = row.address;

            searchResults.push(searchResult);
            callback();
          }, function (err) {

            if (err) console.log('process failed');
            console.log('all done');
          });
        } else {
          console.log('error: ' + response.statusCode);
        }

        let contents = [];
        async.each(searchResults, function (data, callback) {
          if (data.image == '') {
            data.image = "https://placehold.jp/150x150.png";
          }
          let content = {
            "type": "bubble",
            "hero": {
              "type": "image",
              "url": data.image,
              "size": "full",
              "aspectRatio": "16:9",
              "aspectMode": "cover",
              "action": {
                "type": "uri",
                "label": "Line",
                "uri": "https://linecorp.com/"
              }
            },
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": data.name,
                  "size": "xl",
                  "weight": "bold"
                },
                {
                  "type": "box",
                  "layout": "vertical",
                  "spacing": "sm",
                  "margin": "lg",
                  "contents": [
                    {
                      "type": "box",
                      "layout": "baseline",
                      "spacing": "sm",
                      "contents": [
                        {
                          "type": "text",
                          "text": "Place",
                          "flex": 1,
                          "size": "sm",
                          "color": "#AAAAAA"
                        },
                        {
                          "type": "text",
                          "text": data.address,
                          "flex": 5,
                          "size": "sm",
                          "color": "#666666",
                          "wrap": true
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            "footer": {
              "type": "box",
              "layout": "vertical",
              "flex": 0,
              "spacing": "sm",
              "contents": [
                {
                  "type": "button",
                  "action": {
                    "type": "uri",
                    "label": "TEL",
                    "uri": "https://linecorp.com"
                  },
                  "color": "#AA6666",
                  "margin": "none",
                  "height": "md",
                  "style": "link",
                  "gravity": "center"
                },
                {
                  "type": "spacer",
                  "size": "xs"
                }
              ]
            }
          };
          contents.push(content);
          callback();
        })

        let message = {
          "type": "flex",
          "altText": "Flex Message",
          "contents": {
            "type": "carousel",
            "contents": contents
          }
        }
        console.log("no.1");
        console.log(bot_client);
        process.on('unhandledRejection', console.dir);
        return bot_client.replyMessage(event.replyToken, message);
      })
    }
    else {
      console.log("使用方法をメニューでご確認ください");
    }
  })
  // .catch((err) => {
  //   console.error(err);
  //   res.status(500).end();
  // })
})
