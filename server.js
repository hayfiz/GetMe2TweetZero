const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const twitterWebhooks = require('twitter-webhooks');
const { TwitterApi } = require('twitter-api-v2');

const app = express()
app.use(bodyParser.json());

const port = process.env.PORT || 3000;

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
});

const tweetsForUser = {};

app.get('/tweets/:screenName', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  const { screenName } = req.params;
  if (tweetsForUser[screenName]) {
    if (tweetsForUser[screenName].complete) {
      const threadedConversation = tweetsForUser[screenName].tweets.reverse();

      res.send(threadedConversation);
    }

    res.send("We're still threading these tweets together, try again soon :)");
  }

  res.send("We've not threaded any tweets for this id just yet, please try again later)");
});

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
    expansions: ['referenced_tweets.id.author_id'],
    'tweet.fields': ['referenced_tweets'],
    'user.fields': ['profile_image_url', 'username'],
  });
}

function saveTweetDisplayObject(tweetId, screenName) {
  client.v2.singleTweet(tweetId, {
    expansions: ['author_id'],
    'user.fields': ['profile_image_url', 'username']
  }).then((response) => {
    console.log(JSON.stringify(response));

    const tweetDisplayObject = {
      id: response.data.id,
      author_id: response.data.author_id,
      text: response.data.text,
      username: response.includes.users[0].username,
      profile_image_url: response.includes.users[0].profile_image_url,
    };

    tweetsForUser[screenName].tweets.push(tweetDisplayObject);
  });
}

function sendTweetToRequestor(authorUserName, tweetId, screenName, recipientId) {
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

  saveTweetDisplayObject(tweetId, screenName);

  T.post('direct_messages/events/new', msg)
    .catch((err) => {
      console.error('error', err.stack);
    })
    .then(() => {
      console.log(`${tweetString} sent successfully To ${screenName} 💪💪`);
    });
}

// function sendUserLinkToTweets(screenName) {
//   // T.get('users/lookup', { screen_name: screenName })
//   //   .catch((err) => {
//   //     console.error('error', err.stack);
//   //   })
//   //   .then((response) => {
//   //     console.log("user lookup response =>" + response);
//   //   });
// }

function digTweet(authorUserName, tweetId, screenName, recipientId) {
  // dm referenced tweet to owner
  sendTweetToRequestor(authorUserName, tweetId, screenName, recipientId);
  // saveTweetDisplayObject(tweetId, screenName);

  if (tweetId) {
  // search for referenced tweets
    searchForTweet(tweetId).then((value) => {
      if (value && value.data.referenced_tweets) {
        const dugTweetAuthorUserName = value.includes.users[0].username;
        const dugTweetReferencedTweetId = value.data.referenced_tweets[0].id;

        // call digTweet on referenced tweets
        digTweet(dugTweetAuthorUserName, dugTweetReferencedTweetId, screenName, recipientId);
      } else {
        tweetsForUser[screenName].complete = true;
        // sendUserLinkToTweets(screenName);
        // console.log(JSON.stringify(tweetsForUser));
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
          // console.log("tweet create data: =>" + JSON.stringify(data));
          if (data.in_reply_to_status_id) {
            tweetsForUser[data.user.screen_name] = {
              tweets: [],
              complete: false,
            };
            digTweet(data.in_reply_to_screen_name,
              data.in_reply_to_status_id_str,
              data.user.screen_name,
              data.user.id_str
            );
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
