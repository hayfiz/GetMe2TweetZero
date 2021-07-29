const express = require('express');
const bodyParser = require('body-parser');
const twitterWebhooks = require('twitter-webhooks');
const { TwitterApi } = require('twitter-api-v2');

const app = express()
app.use(bodyParser.json());

const port = process.env.PORT || 3000

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
  route: '/', // default : '/'
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_ACCESS_KEY,
  accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  environment: 'development', // default : 'env-beta'
  appBearerToken: 'AAAAAAAAAAAAAAAAAAAAAM%2FsPQEAAAAAYa16T%2BFIkXX9fdO9xYdUBVX1wi8%3DY2ialfV498fCONhbWsTW4bo4gaWuJnkL7eZq5CRpjfOFhWVmS5', /// / TODO: Move bearer token to env variable
  app
});

const Twit = require('twit')

const T = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
  strictSSL: true, // optional - requires SSL certificates to be valid.
})

/// / TODO:  Combine methods below to register webhook if none is registered


// Register your webhook url - just needed once per URL
userActivityWebhook.register().catch((err) => {
  console.log('err on register');
  console.log(err);
});;



// Get webhook info
// userActivityWebhook.getWebhook()
// .then(function (ret) {
//     console.log('webhook info: ' + JSON.stringify(ret[0]));
// }).catch(err => {
//   console.log('err on getWebhooks');
//   console.log(err.body);
// });

if (process.env.TWITTER_BOT_ACTIVE === 'Y') {
  // Unsubscribe for a particular user activity
  userActivityWebhook.unsubscribe({
    userId: '316270387',
    accessToken: process.env.TWITTER_ACCESS_KEY,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
  })
    .then(() => {
      console.log('Removed previous subscription for user activity ❌')
      // Subscribe for a particular user activity
      userActivityWebhook.subscribe({
        userId: '316270387',
        accessToken: process.env.TWITTER_ACCESS_KEY,
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
      })
        .then((userActivity) => {
          userActivity
            .on ('tweet_create', (data) => {
              if (data.in_reply_to_status_id) {
                digTweet(data.user.screen_name, data.in_reply_to_status_id_str, data.user.id);
              } else {
                console.log(`${data.id_str}: A tweet was created but it's being ignored since it is not a mention`);
              }
            })
        })
        .then(() => {
          console.log('Successfully subscribed to user activity ✅');
        }).catch((err) => {
          console.log('err on subscribe 🤮');
          console.log(err.body);
        });
    }).catch((err) => {
      console.log('err on unsubscribe 🤮');
      console.log(err.body);
    });

}

/*
  Variable name - Tweet object field
  authorUserName - data.user.screen_name
  tweetId - data.in_reply_to_status_id_str
  recipientId - data.user.id
*/
async function digTweet(authorUserName, tweetId, recipientId) {
  if (tweetId) {
  // search for referenced tweets
    await searchForTweet(tweetId).then(async(value) => {
      if (value && value.data.referenced_tweets) {
        var authorUserName = value.includes.users[0].username;
        var tweetId = value.data.referenced_tweets[0].id;

        // call digTweet on referenced tweets
        await digTweet(authorUserName, tweetId, recipientId);
      }
    });
  }

  //dm referenced tweet to owner
  sendTweetToRequestor(authorUserName, tweetId, recipientId);
}

async function searchForTweet(tweetId) {
  return tweetSearchedFor = await client.v2.singleTweet(tweetId, {
    'expansions': [
      'referenced_tweets.id.author_id'
    ],
    'tweet.fields': ['referenced_tweets']
  });
};

function sendTweetToRequestor(authorUserName, tweetId, recipientId) {
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

app.listen(port, () => {
  console.log(`listening at http://localhost:${port} 🤙🏾`)
})
