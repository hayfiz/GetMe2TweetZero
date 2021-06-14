const express = require('express');
const bodyParser = require ('body-parser');
const twitterWebhooks = require('twitter-webhooks');
const https = require ('https');

const OAuth = require('oauth')
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

// const stream = T.stream("user");
// console.log("User stream started 🚀🚀🚀");
//
// stream.on("follow", console.log("followed"));
// stream.on('user_event', function (eventMsg) {
//   console.log(eventMsg)
// });


// T.get('followers/ids', { screen_name: 'hayfiz' },  function (err, data, response) {
//   console.log(data)
// })


    // }, timeout);

// getTwitterUserProfileWithOAuth1('hype_central')
//   .then((profile) => console.log('oauth1 response', JSON.stringify(profile, null, 2)) && process.exit(0))
//   .catch(err => console.error(err) && process.exit(1))
//
// async function getTwitterUserProfileWithOAuth1 (username = 'hype_central') {
//   var oauth = new OAuth.OAuth(
//     'https://api.twitter.com/oauth/request_token',
//     'https://api.twitter.com/oauth/access_token',
//     process.env.TWITTER_CONSUMER_KEY,
//     process.env.TWITTER_CONSUMER_SECRET,
//     '1.0A', null, 'HMAC-SHA1'
//   )
//   // const get = promisify(oauth.get.bind(oauth))
//   //
//   // const body = await get(
//   //   `https://api.twitter.com/1.1/users/show.json?screen_name=${username}`,
//   //   process.env.TWITTER_ACCESS_KEY,
//   //   process.env.TWITTER_ACCESS_TOKEN_SECRET
//   // )
//
//   var request_body = {
//         event: {
//           type: 'message_create',
//           message_create: {
//             target: {
//               recipient_id: 796702896,
//             },
//             message_data: {
//               text: `Hi! 👋`,
//             },
//           },
//         },
//       };
//
//   const post = promisify(oauth.post.bind(oauth))
//
//   const body = await post(
//     'https://api.twitter.com/1.1/direct_messages/events/new.json',
//     process.env.TWITTER_ACCESS_KEY,
//     process.env.TWITTER_ACCESS_TOKEN_SECRET,
//     JSON.stringify(request_body)
//   )
//
//   return JSON.parse(body)
// }

const userActivityWebhook = twitterWebhooks.userActivity({
    serverUrl: 'https://whats-down-this-hole.herokuapp.com/',
    route: '/', //default : '/'
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessToken: process.env.TWITTER_ACCESS_KEY,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    environment: 'development', //default : 'env-beta'
    appBearerToken: 'AAAAAAAAAAAAAAAAAAAAAM%2FsPQEAAAAAYa16T%2BFIkXX9fdO9xYdUBVX1wi8%3DY2ialfV498fCONhbWsTW4bo4gaWuJnkL7eZq5CRpjfOFhWVmS5',
    app
});

/**

//Register your webhook url - just needed once per URL
userActivityWebhook.register().catch(err => {
  console.log('err on register');
  console.log(err);
});;

*/


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
                      text: `Baba funds dey come! 🔥`,
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

        // console.log('successfully subscribed')
    })
    .then(function (ret) {
        console.log('Successfully subscribed to user activity ✅');
      }).catch(err => {
        console.log('err on subscribe');
        console.log(err.body);
      });
}).catch(err => {
  console.log('err on unsubscribe');
  console.log(err.body);
});

// Get webhook info
// userActivityWebhook.getWebhook()
// .then(function (ret) {
//     console.log('webhook info: ' + JSON.stringify(ret[0]));
// }).catch(err => {
//   console.log('err on getWebhooks');
//   console.log(err.body);
// });

/** Code to send a dm*/

/***/


// listen to any user activity
// userActivityWebhook.on ('event', (event, userId, data) => console.log (userId + ' - favorite'));

// listen to unknown payload (in case of api new features)
// userActivityWebhook.on ('unknown-event', (rawData) => console.log (rawData));


// app.post('/', (req, res) => {
//   console.log("logginggggg: " + req);
// })

app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`)
})
