# tstream

Twitter streaming API client

* API compliant with ntwitter

ntwitter is a great Twitter client, does a whole log of things, but hasn't seen updates in
nearly a year and their streaming API implementation is very  limited.

tstream goes a step further and let's you listen to a lot more events

Almost all the message types listed here are fired as events

https://dev.twitter.com/docs/streaming-apis/messages#Stall_warnings_warning

eg. disconnect

Twitter will pass this message in the HTTP stream
```json
{
  "disconnect":{
    "code": 4,
    "stream_name":"< A stream identifier >",
    "reason":"< Human readable status message >"
  }
}
```

You can listen to it in your code as follows
`stream.on("disconnect", function(data){});`

data will contain what Twitter sent as the "disconnect" object

Stall warnings is another useful one, listen to a "warning" event

If you are dealing with user streams, listen to a "user-event" to be
notified about all the events listed here
https://dev.twitter.com/docs/streaming-apis/messages#Events_event

## Usage

```js
var TStream = require('tstream'),
    config = require('./config.js');

var tstream = new TStream(config.twitter);
tstream.stream('statuses/filter', {'track': ['what']}, function(stream) {
    stream.on('data', function(tweet) {
        console.log(tweet.text);
    });
    stream.on('error', function(error) {
        console.log('stream error - ' + error.message);
    });
    stream.on('disconnect', function(data) {
        console.log(data);
    });
    stream.on('end', function() {
        console.log('stream ended');
    });
});
```

Pass an object that contains "consumer_key", "consumer_secret", "access_token_key", "access_token_secret" to the TStream constructor. The example code above assumes there is a file in the same directory, called config.js that exports a config object that has a twitter key which again is an object that contains the credentials (access_token etc)

* TODO: write better docs
