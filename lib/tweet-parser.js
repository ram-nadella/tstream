// TweetParser

// Parse the response from Twitter stream which is emitted in
// chunks and split at the right place and provide the tweet JSON

var EventEmitter = require('events').EventEmitter,
    util = require('util');

TweetParser = function() {
    EventEmitter.call(this);
    this.buffer = new Buffer('');
};

util.inherits(TweetParser, EventEmitter);

TweetParser.prototype.init_buffer = function(data) {
    data = (typeof data === 'undefined') ? '' : data;
    this.buffer = new Buffer(data);
};


// TODO: evaluate the delimited params and using the limits for parsing
// https://dev.twitter.com/docs/streaming-apis/processing#delimited


// Parse the data buffer that was received in the reponse
TweetParser.prototype.parse = function(data_buffer) {
    this.buffer = Buffer.concat([this.buffer, data_buffer]);
    var data = this.buffer.toString();
    var tweets = [];

    // Twitter might send newlines to keep the connection open
    // in cases where there is no data to transmit
    // if the chunk that was received is just a new line
    // then do nothing
    if (data === '\n') {
        return;
    }

    // If the emitted data from the response represents exactly one
    // tweet then just emit an event that contains the tweet as the
    // payload, otherwise save what was received in a buffer and parse after more data
    // is received

    var matches = null;
    var parts = null;
    if (matches = data.match(/^({.*})\r\n$/)) {
        // single tweet
        tweets.push(matches[1]);
        this.init_buffer();
    } else if (parts = data.split('\r\n')) {
        // more than one tweet
        tweets = parts.splice(0, parts.length-1);

        // re-init the buffer with either an empty string
        // or part of a tweet
        this.init_buffer(parts[0]);
    }

    this.notifyAboutTweets(tweets);

};

// take the processed tweets and emit events
TweetParser.prototype.notifyAboutTweets = function(tweets) {

    if (typeof tweets === "undefined" || tweets.length === 0) {
        return;
    }

    var self = this;

    // the processed reponse may not always represent a tweet
    // https://dev.twitter.com/docs/streaming-apis/messages

    tweets.forEach(function(tweet_text) {
        try {

            var tweet = JSON.parse(tweet_text);

            if (tweet.hasOwnProperty('text') && tweet.hasOwnProperty('id')) {
                self.emit('tweet', tweet);
            } else if (tweet.hasOwnProperty('disconnect')) {
                self.emit('special', { type: 'disconnect', meta: tweet.disconnect});
            } else if (tweet.hasOwnProperty('limit')) {
                self.emit('special', { type: 'limit', meta: tweet.limit });
            } else if (tweet.hasOwnProperty('status_withheld')) {
                self.emit('special', { type: 'status_withheld', meta: tweet.status_withheld });
            } else if (tweet.hasOwnProperty('scrub_geo')) {
                self.emit('special', { type: 'scrub_geo', meta: tweet.scrub_geo });
            } else if (tweet.hasOwnProperty('delete')) {
                self.emit('special', { type: 'delete', meta: tweet['delete'] });
            } else if (tweet.hasOwnProperty('warning')) {
                self.emit('special', { type: 'warning', meta: tweet.warning });
            } else if (tweet.hasOwnProperty('event') && tweet.hasOwnProperty('target_object')) {
                self.emit('special', { type: 'user-event', meta: tweet });
            } else {
                self.emit('special', { type: 'unknown', reason: 'unknown', data: tweet });
            }
        } catch(e) {
            console.log('Error JSON decoding text: ' + tweet_text + ' Error message: ' + e.message);
        }
    });
};

module.exports = TweetParser;