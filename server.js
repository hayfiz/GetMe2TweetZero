const express = require('express');
const bodyParser = require ('body-parser');
const twitterWebhooks = require('twitter-webhooks');
const https = require ('https');
const { TwitterApi } = require('twitter-api-v2');

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

// OAuth 1.0a (User context)
const client = new TwitterApi({
  appKey: process.env.TWITTER_CONSUMER_KEY,
  appSecret: process.env.TWITTER_CONSUMER_SECRET,
  // Following access tokens are not required if you are
  // at part 1 of user-auth process (ask for a request token)
  // or if you want a app-only client (see below)
  accessToken: process.env.TWITTER_ACCESS_KEY,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

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
            digTweet(data.user.screen_name, data.in_reply_to_status_id_str, data.user.id);
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

async function digTweet(authorUserName, tweetId, recipientId) {
  //authorUserName - data.user.screen_name
  //tweetId - data.id_str
  //recipientId - data.user.id

  if (tweetId) {
  //search for referenced tweets
    await testCall(tweetId).then(async(value) => {
      if (value && value.data.referenced_tweets) {
        var authorUserName = value.includes.users[0].username;
        var tweetId = value.data.referenced_tweets[0].id;

        //call digTweet on referenced tweets
        await digTweet(authorUserName, tweetId, recipientId);
      }
    });
  }

  //dm referenced tweet to owner
  var tweetString = `https://twitter.com/${authorUserName}/status/${tweetId}`;
  var msg = {
        event: {
          type: 'message_create',
          message_create: {
            target: {
              recipient_id: recipientId,
            },
            message_data: {
              text: tweetString,
            },
          },
        },
      };

  console.log('Sending tweet >>>>>>>>> ' + tweetString);

  T.post("direct_messages/events/new", msg)
      .catch(err => {
        console.error("error", err.stack);
      })
      .then(result => {
        console.log(`Message sent successfully To ${recipientId} 💪💪`);
      });
  }

async function testCall(tweetId) {
  return tweetSearchedFor = await client.v2.singleTweet(tweetId, {
    'expansions': [
      'referenced_tweets.id.author_id'
    ],
    'tweet.fields': ['referenced_tweets']
  });
};

// digTweet('hayfiz', '1408182964282957827', '316270387');

app.listen(port, () => {
  console.log(`listening at http://localhost:${port} 🤙🏾`)
})
