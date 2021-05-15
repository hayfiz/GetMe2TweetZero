const express = require('express');
const bodyParser = require ('body-parser');
const twitterWebhooks = require('twitter-webhooks');
const https = require ('https');

const app = express()
app.use(bodyParser.json());

const port = process.env.PORT || 3000

const userActivityWebhook = twitterWebhooks.userActivity({
    serverUrl: 'https://whats-down-this-hole.herokuapp.com/',
    route: '/', //default : '/'
    consumerKey: 'PtQ6Alt8ZW4c2Y48sad6cZkKJ',
    consumerSecret: 'JDY0G3McBTKdyl6B6LtmpEN5vAxpgpIq7qp6k5shuYBvGn7YFY',
    accessToken: '316270387-F1jRV5VeBoWkcz1fTyQCRnxEZErvgsJ2TSrER6cm',
    accessTokenSecret: 'tvl0LHycdYl3SWbkpFSHqPCsSXxmsOZ10ccq36nR5fuuA',
    environment: 'development', //default : 'env-beta'
    appBearerToken: 'AAAAAAAAAAAAAAAAAAAAAM%2FsPQEAAAAAYa16T%2BFIkXX9fdO9xYdUBVX1wi8%3DY2ialfV498fCONhbWsTW4bo4gaWuJnkL7eZq5CRpjfOFhWVmS5',
    app
});

//Register your webhook url - just needed once per URL
userActivityWebhook.register().catch(err => {
  console.log('err');
  console.log(err);
});;

// Subscribe for a particular user activity
// userActivityWebhook.subscribe({
//     userId: '316270387',
//     accessToken: '316270387-F1jRV5VeBoWkcz1fTyQCRnxEZErvgsJ2TSrER6cm',
//     accessTokenSecret: 'tvl0LHycdYl3SWbkpFSHqPCsSXxmsOZ10ccq36nR5fuuA'
// })
// .then(function (userActivity) {
//     userActivity
//     .on('favorite', (data) => console.log (data.id + ' - favorite'))
//     .on ('tweet_create', (data) => console.log (data.id + ' - tweet_create'))
//     .on ('follow', (data) => console.log (data.id + ' - follow'))
//     .on ('mute', (data) => console.log (data.id + ' - mute'))
//     .on ('revoke', (data) => console.log (data.id + ' - revoke'))
//     .on ('direct_message', (data) => console.log (data.id + ' - direct_message'))
//     .on ('direct_message_indicate_typing', (data) => console.log (data.id + ' - direct_message_indicate_typing'))
//     .on ('direct_message_mark_read', (data) => console.log (data.id + ' - direct_message_mark_read'))
//     .on ('tweet_delete', (data) => console.log (data.id + ' - tweet_delete'))
//
//     // console.log('successfully subscribed')
// }).catch(err => {
//   console.log('err');
//   console.log(err.body);
// });

// Unsubscribe for a particular user activity
userActivityWebhook.unsubscribe({
    userId: '316270387',
    accessToken: '316270387-F1jRV5VeBoWkcz1fTyQCRnxEZErvgsJ2TSrER6cm',
    accessTokenSecret: 'tvl0LHycdYl3SWbkpFSHqPCsSXxmsOZ10ccq36nR5fuuA'
})
.then(function (ret) {
    console.log('unsubscribed: ' + ret)
}).catch(err => {
  console.log('err on unsubscribe');
  console.log(err.body);
});

// Unsubscribe for a particular user activity
userActivityWebhook.getWebhooks()
.then(function (ret) {
    console.log('webhooks: ' + ret)
}).catch(err => {
  console.log('err on getWebhooks');
  console.log(err.body);
});

// listen to any user activity
userActivityWebhook.on ('event', (event, userId, data) => console.log (userId + ' - favorite'));

// listen to unknown payload (in case of api new features)
userActivityWebhook.on ('unknown-event', (rawData) => console.log (rawData));


// app.post('/', (req, res) => {
//   console.log("logginggggg: " + req);
// })

app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`)
})
