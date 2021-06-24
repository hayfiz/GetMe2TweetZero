const express = require('express');
const bodyParser = require ('body-parser');
const twitterWebhooks = require('twitter-webhooks');
const https = require ('https');

const { promisify } = require('util')

const app = express()
app.use(bodyParser.json());

const port = process.env.PORT || 3000

var Twit = require('twit')

var T = new Twit({
  consumer_key:         process.env.TWITTER_CONSUMER_KEY,
  consumer_secret:      process.env.TWITTER_CONSUMER_SECRET,
  access_token:         process.env.TWITTER_ACCESS_KEY,
  access_token_secret:  process.env.TWITTER_ACCESS_TOKEN_SECRET,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
  strictSSL:            true,     // optional - requires SSL certificates to be valid.
})

const userActivityWebhook = twitterWebhooks.userActivity({
    serverUrl: 'https://whats-down-this-hole.herokuapp.com/',
    route: '/', //default : '/'
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessToken: process.env.TWITTER_ACCESS_KEY,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    environment: 'development', //default : 'env-beta'
    appBearerToken: 'AAAAAAAAAAAAAAAAAAAAAM%2FsPQEAAAAAYa16T%2BFIkXX9fdO9xYdUBVX1wi8%3DY2ialfV498fCONhbWsTW4bo4gaWuJnkL7eZq5CRpjfOFhWVmS5', //// TODO: Move bearer token to env variable
    app
});

//// TODO:  Combine methods below to register webhook if none is registered
/**

//Register your webhook url - just needed once per URL
userActivityWebhook.register().catch(err => {
  console.log('err on register');
  console.log(err);
});;

*/

// Get webhook info
// userActivityWebhook.getWebhook()
// .then(function (ret) {
//     console.log('webhook info: ' + JSON.stringify(ret[0]));
// }).catch(err => {
//   console.log('err on getWebhooks');
//   console.log(err.body);
// });

// Unsubscribe for a particular user activity
userActivityWebhook.unsubscribe({
    userId: '316270387',
    accessToken: process.env.TWITTER_ACCESS_KEY,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})
.then(function (ret) {
    console.log('Removed previous subscription for user activity ❌')
    // Subscribe for a particular user activity
    userActivityWebhook.subscribe({
        userId: '316270387',
        accessToken: process.env.TWITTER_ACCESS_KEY,
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    })
    .then(function (userActivity) {
        userActivity
        .on('favorite', (data) => console.log (JSON.stringify(data) + ' - favorite'))
        .on ('tweet_create', (data) => {
          console.log (JSON.stringify(data) + ' - tweet_create')
          var obj = {
                event: {
                  type: 'message_create',
                  message_create: {
                    target: {
                      recipient_id: data.user.id,
                    },
                    message_data: {
                      text: `🤖: Thanks for reaching out ${data.user.name}. Hayford will get back to you ASAP`,
                    },
                  },
                },
              };

          T.post("direct_messages/events/new", obj)
              .catch(err => {
                console.error("error", err.stack);
              })
              .then(result => {
                console.log(`Message sent successfully To ${data.user.screen_name} 💪💪`);
              });
            })
            .on ('follow', (data) => console.log (JSON.stringify(data) + ' - follow'))
            .on ('mute', (data) => console.log (JSON.stringify(data) + ' - mute'))
            .on ('revoke', (data) => console.log (JSON.stringify(data) + ' - revoke'))
            .on ('direct_message', (data) => console.log (JSON.stringify(data) + ' - direct_message'))
            .on ('direct_message_indicate_typing', (data) => console.log (JSON.stringify(data) + ' - direct_message_indicate_typing'))
            .on ('direct_message_mark_read', (data) => console.log (JSON.stringify(data) + ' - direct_message_mark_read'))
            .on ('tweet_delete', (data) => console.log (JSON.stringify(data) + ' - tweet_delete'))
          })
          .then(function (ret) {
            console.log('Successfully subscribed to user activity ✅');
          }).catch(err => {
            console.log('err on subscribe 🤮');
            console.log(err.body);
          });
}).catch(err => {
  console.log('err on unsubscribe 🤮');
  console.log(err.body);
});

function digTweet(data, recipient_id) {
  //search for referenced tweets

  //call digTweet on referenced tweets


  //dm referenced tweet to owner
  var tweetString = `https://twitter.com/${data.user.screen_name}/status/${data.id_str}`;
  var msg = {
        event: {
          type: 'message_create',
          message_create: {
            target: {
              recipient_id: data.user.id,
            },
            message_data: {
              text: tweetString,
            },
          },
        },
      };
}

// T.get('/tweets/', { id: '1408182889578217475' }, function (err, data, response) {
//   console.log(data)
// })

var request = require('request');
var options = {
  'method': 'GET',
  'url': 'https://api.twitter.com/2/tweets/1408182889578217475?tweet.fields=referenced_tweets',
  'headers': {
    'Authorization': 'OAuth oauth_consumer_key="PtQ6Alt8ZW4c2Y48sad6cZkKJ",oauth_token="316270387-F1jRV5VeBoWkcz1fTyQCRnxEZErvgsJ2TSrER6cm",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1624572624",oauth_nonce="gUhLtE8M0yN",oauth_version="1.0",oauth_signature="1pFi3C%2Ftk42iKBv7WrfzkAp01Eg%3D"',
    'Cookie': 'guest_id=v1%3A162088818648439981; personalization_id="v1_x0G0pyVUfxh6NfBACXkQ7w=="'
  }
};
request(options, function (error, response) {
  if (error) throw new Error(error);
  console.log(response.body);
});



app.listen(port, () => {
  console.log(`listening at http://localhost:${port} 🤙🏾`)
})
