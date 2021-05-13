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
    accessToken: '',
    accessTokenSecret: '',
    environment: 'development', //default : 'env-beta'
    app
});

//Register your webhook url - just needed once per URL
userActivityWebhook.register();

//Subscribe for a particular user activity
userActivityWebhook.subscribe({
    userId: 'hayfiz',
    accessToken: '316270387-F1jRV5VeBoWkcz1fTyQCRnxEZErvgsJ2TSrER6cm',
    accessTokenSecret: 'tvl0LHycdYl3SWbkpFSHqPCsSXxmsOZ10ccq36nR5fuuA'
})
.then(function (userActivity) {
    userActivity
    .on('favorite', (data) => console.log (userActivity.id + ' - favorite'))
    .on ('tweet_create', (data) => console.log (userActivity.id + ' - tweet_create'))
    .on ('follow', (data) => console.log (userActivity.id + ' - follow'))
    .on ('mute', (data) => console.log (userActivity.id + ' - mute'))
    .on ('revoke', (data) => console.log (userActivity.id + ' - revoke'))
    .on ('direct_message', (data) => console.log (userActivity.id + ' - direct_message'))
    .on ('direct_message_indicate_typing', (data) => console.log (userActivity.id + ' - direct_message_indicate_typing'))
    .on ('direct_message_mark_read', (data) => console.log (userActivity.id + ' - direct_message_mark_read'))
    .on ('tweet_delete', (data) => console.log (userActivity.id + ' - tweet_delete'))
});

//listen to any user activity
userActivityWebhook.on ('event', (event, userId, data) => console.log (data + ' - favorite'));

//listen to unknown payload (in case of api new features)
userActivityWebhook.on ('unknown-event', (rawData) => console.log (rawData));


// app.get('/', (req, res) => {
//   res.send('Hello World!')
// })

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
