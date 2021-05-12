const express = require('express');
const bodyParser = require ('body-parser');
const twitterWebhooks = require('twitter-webhooks');
const https = require ('https');

const app = express()
app.use(bodyParser.json());

const localPort = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(process.env.PORT || localPort, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
