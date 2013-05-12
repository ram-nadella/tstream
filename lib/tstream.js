var _ = require('lodash'),
    OAuth = require('oauth'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    TweetParser = require('./tweet-parser');

function TStream(config) {

    EventEmitter.call(this);

    var default_config = {
        consumer_key: null,
        consumer_secret: null,
        access_token_key: null,
        access_token_secret: null,
        urls: {
            request_token_url: 'https://api.twitter.com/oauth/request_token',
            access_token_url: 'https://api.twitter.com/oauth/access_token',
            authenticate_url: 'https://api.twitter.com/oauth/authenticate',
            authorize_url: 'https://api.twitter.com/oauth/authorize',
            stream_base: 'https://stream.twitter.com/1.1',
            user_stream_base: 'https://userstream.twitter.com/1.1',
            site_stream_base: 'https://sitestream.twitter.com/1.1'
        },
        headers: {
            'Accept': '*/*',
            // 'Connection': 'close',
            'User-Agent': 'tstream'
        }
    };

    this.config = _.extend(default_config, config);

    // oauth init
    this.oauth = new OAuth.OAuth(
        this.config.urls.request_token_url,
        this.config.urls.access_token_url,
        this.config.consumer_key,
        this.config.consumer_secret,
        '1.0', null, 'HMAC-SHA1', null,
        this.config.headers
    );

};

util.inherits(TStream, EventEmitter);

TStream.prototype.stream = function(method, params, callback) {

    var self = this;

    // Initialize the parser that will handler the response
    // from the Twitter streaming endpoint
    var parser = new TweetParser();

    if (typeof params === 'function') {
        callback = params;
        params = null;
    }

    // construct the url of the streaming endpoint
    var streaming_endpoint_prefix = '';
    if (method === 'user' || method === 'site') {
        streaming_endpoint_prefix = this.config.urls[method+'_stream_base'];
    } else {
        streaming_endpoint_prefix = this.config.urls.stream_base;
    }
    var streaming_endpoint = streaming_endpoint_prefix + '/' + escape(method) + '.json';

    var default_params = {
        'stall_warnings': null
    }

    params = _.extend(default_params, params);

    // fire off the request
    var request = this.oauth.post(
        streaming_endpoint,
        this.config.access_token_key,
        this.config.access_token_secret,
        params,
        null
    );

    request.on('error', function(error) {
        self.emit('error', error);
    });

    request.on('response', function(response) {

        if(response.statusCode > 200) {
            self.emit('error', new Error('HTTP ' + response.statusCode));
        }

        response.on('data', function(chunk) {
            parser.parse(chunk);
        });

        response.on('error', function(error) {
            self.emit('error', error);
        });

        response.on('end', function() {
            self.emit('end', 'Response ended');
        });

        response.on('close', function() {
            self.emit('close', 'Connection closed');
        });

    });

    request.end();

    // the parser will parse the chunks of data in the response
    // and emit events, the data returned by twitter may not always
    // be just tweets
    parser.on('tweet', function(tweet) {
        self.emit('data', tweet);
    });

    // handle the non-tweet events in the stream
    parser.on('special', function(data) {
        self.emit(data.type, data.meta);
    });

    if (typeof callback === 'function') {
        callback(self);
    }

}

module.exports = TStream;