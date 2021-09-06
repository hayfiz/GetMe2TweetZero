const _ = require('lodash');
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
  serverUrl: 'https://whats-down-this-hole.herokuapp.com/test/',
  route: '/', // default : '/'
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_ACCESS_KEY,
  accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  environment: process.env.TWITTER_ENVIRONMENT, // default : 'env-beta'
  appBearerToken:
  process.env.TWITTER_APP_BEARER_TOKEN,
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

// Register your webhook url - just needed once per URL
if (process.env.REGISTER_TWITTER_WEBHOOK === 'Y') {
  console.log('Attempting to register webhook');
  userActivityWebhook.register().then(() => {
    console.log('Webhook registered ok 🤙🏾')
  }).catch((err) => {
    console.log('err on register');
    console.log(err);
  });
}

function searchForTweet(tweetId) {
  return client.v2.singleTweet(tweetId, {
    'expansions': ['referenced_tweets.id.author_id'],
    'tweet.fields': ['referenced_tweets'],
    'user.fields': ['profile_image_url', 'username'],
  });
}

function buildTweetDisplayObject(tweetId) {
  client.v2.singleTweet(tweetId, {
    // 'expansions': ['referenced_tweets.id.author_id'],
    // 'tweet.fields': ['referenced_tweets'],
    'user.fields': ['profile_image_url', 'username']
  }).then((value) => {
    console.log(JSON.stringify(value));
  });
}

const tweets = {};

function sendTweetToRequestor(authorUserName, tweetId, recipientId) {
  const tweetString = `https://twitter.com/${authorUserName}/status/${tweetId}`;
  const msg = {
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

  // tweets[recipientId].push(msg);
  buildTweetDisplayObject(tweetId);
  T.post('direct_messages/events/new', msg)
    .catch((err) => {
      console.error('error', err.stack);
    })
    .then(() => {
      console.log(`${tweetString} sent successfully To ${recipientId} 💪💪`);
    });
}

function digTweet(authorUserName, tweetId, recipientId) {
  // dm referenced tweet to owner
  sendTweetToRequestor(authorUserName, tweetId, recipientId);

  if (tweetId) {
  // search for referenced tweets
    searchForTweet(tweetId).then((value) => {
      if (value && value.data.referenced_tweets) {
        const dugTweetAuthorUserName = value.includes.users[0].username;
        const dugTweetReferencedTweetId = value.data.referenced_tweets[0].id;

        // call digTweet on referenced tweets
        digTweet(dugTweetAuthorUserName, dugTweetReferencedTweetId, recipientId);
      } else {
        console.log(JSON.stringify(tweets));
      }
    });
  }
}

function subscribeToUserActivity() {
  userActivityWebhook.subscribe({
    userId: process.env.TWITTER_USER_ID_TO_REGISTER_FOR_ACTIVITY,
    accessToken: process.env.TWITTER_ACCESS_KEY,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
  })
    .then((userActivity) => {
      userActivity
        .on('tweet_create', (data) => {
          if (data.in_reply_to_status_id) {
            tweets[data.user.id] = [];
            digTweet(data.in_reply_to_screen_name, data.in_reply_to_status_id_str, data.user.id);
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
}

if (process.env.TWITTER_BOT_ACTIVE === 'Y') {
  console.log('Attempting to unsubscribe for user activity in order to resubscribe');
  userActivityWebhook.unsubscribe({
    userId: process.env.TWITTER_USER_ID_TO_REGISTER_FOR_ACTIVITY,
    accessToken: process.env.TWITTER_ACCESS_KEY,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
  }).then(() => {
    console.log('Successfully removed previous subscription for user activity ❌. Attempting to subscribe to user activity 💬');
    subscribeToUserActivity();
  }).catch((err) => {
    if (err.body.errors[0].code === 34) { // No existing subscription for user activity
      console.log('No previous webhook. Attempting to subscribe to user activity 💬');
      // Subscribe for a particular user activity
      subscribeToUserActivity();
    } else {
      console.log(`err on unsubscribe 🤮. Info: ${err.body}`);
    }
  });
}

if (process.env.GET_TWITTER_WEBHOOK_INFO === 'Y') {
  userActivityWebhook.getWebhook()
    .then((ret) => {
      console.log(`webhook info: ${JSON.stringify(ret[0])}`);
    }).catch((err) => {
      console.log('err on getWebhooks');
      console.log(err.body);
    });
}

app.listen(port, () => {
  console.log(`listening at http://localhost:${port} 🤙🏾`)
})
