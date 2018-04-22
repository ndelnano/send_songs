'use strict';

var request = require('request');
var AWS = require('aws-sdk');

var SpotifyWebApi = require('spotify-web-api-node');

let SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
let SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
let PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

let USERS_TABLE_NAME = process.env.DYNAMO_USERS_TABLE_NAME;
let SONGS_IN_FLIGHT_TABLE_NAME = process.env.DYNAMO_SONGS_IN_FLIGHT_TABLE_NAME;

AWS.config.update({region:'us-east-1'});
var dynamodb = new AWS.DynamoDB();

console.log('Loading function');

exports.handler = (event, context, callback) => {
  event.Records.forEach((record) => {
    console.log('EVENT NAME: ' + record.eventName)
    if (record.eventName == 'REMOVE') {
      console.log('DynamoDB Record: %j', record.dynamodb);

      console.log('FIELDS OF RECORD: %j', record.dynamodb.OldImage.TimeToLive.N);
      let song_uri = record.dynamodb.OldImage.song_uri.S;
      let sender_psid = record.dynamodb.OldImage.sender_psid.S;
      let receiver_psid = record.dynamodb.OldImage.receiver_psid.S;

      getReceiverSpotifyTokens(record, song_uri)
      //let receiver_not_listened_psid = record.dynamodb.OldImage.song_uri.S;
      //let receiver_listened_psid = record.dynamodb.OldImage.song_uri.S;

      //sendFBMessage(sender_psid);
    }
  });
  callback(null, `Successfully processed ${event.Records.length} records.`);
};

function getReceiverSpotifyTokens(record) {
  var params = {
    AttributesToGet: [
      "psid",
      "auth_token",
      "refresh_token"
    ],
    TableName : USERS_TABLE_NAME,
    Key : { 
      "psid" : {
        "S" : record.dynamodb.OldImage.receiver_psid.S
      }
    }
  }

  dynamodb.getItem(params, function(err, data) {
    if (err) {
      console.log('FAILED TO RETREIVE USER FROM DYNAMO')
      console.log(err); // an error occurred
    } 
    else {
      let refresh_token = data.Item.refresh_token.S;
      let auth_token = data.Item.auth_token.S;

      callRecentlyPlayedForUser(record, auth_token, refresh_token)
    }
  });

}

function callRecentlyPlayedForUser(record, auth_token, refresh_token) {
  var spotifyApi = new SpotifyWebApi({
    clientId : SPOTIFY_CLIENT_ID,
    clientSecret : SPOTIFY_CLIENT_SECRET
  });

  spotifyApi.setAccessToken(auth_token)
  spotifyApi.setRefreshToken(refresh_token)
  spotifyApi.refreshAccessToken()
    .then(function(data) {
      console.log('The access token has been refreshed!');

      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);

      // Use max value for limit
      spotifyApi.getMyRecentlyPlayedTracks({limit: 50}, function(err, data) {
        if (err) {
          console.error('Something went wrong!', err);
        } else {
          var listened = false
          var song_name

          for(var i in data.body.items) {
            if (data.body.items[i].track.uri.indexOf(record.dynamodb.OldImage.song_uri.S) > -1) {
              song_name = data.body.items[i].track.name
              listened = true
            }
          }

          if (listened) {
            console.log(song_name + ' RECEIVER LISTENED TO SONG')
            sendFBMessage(record.dynamodb.OldImage.sender_psid.S, record.dynamodb.OldImage.receiver_name.S + ' listened to ' + song_name)
            // Release post-message if there is one
            if (record.dynamodb.OldImage.post_msg.S != 'none') {
              sendFBMessage(record.dynamodb.OldImage.receiver_psid.S, record.dynamodb.OldImage.sender_name.S + ' says "' + record.dynamodb.OldImage.post_msg.S + '" about "' + song_name + '"')
            }
          }
          else {
            var time_now = Math.round(Date.now()/1000)
            var time_sent = Number(record.dynamodb.OldImage.time_sent.S)
            var seconds_in_hour = 60*60
            var seconds_in_day = 60*60*24
            var seconds_in_week = 7*60*60*24
            var seconds_in_five_min = 5*60

            // If under an hour since song was sent, set TTL to 5 min
            if ((time_now - time_sent) <= seconds_in_hour) {
              console.log('READDING SONG TO DYNAMO')
              readdSongToDynamoAndSetNewTTL(record, seconds_in_five_min)
            }
            // If under a week since song was sent, set TTL to 1 hr
            else if ((time_now - time_sent) <= seconds_in_week) {
              console.log('READDING SONG TO DYNAMO')
              readdSongToDynamoAndSetNewTTL(record, seconds_in_hour)
            }
            // Expire song sending request at 1 week
            else {
              console.log(time_now)
              console.log(time_sent)
              console.log('NOT READDING SONG TO DYNAMO, STOPPING HERE')
              // song_name is undefined here since it is only set when song shows up in recently played list...can't look up song name with URI :/
              sendFBMessage(record.dynamodb.OldImage.sender_psid.S, record.dynamodb.OldImage.receiver_name.S + ' hasnt listened to ' + record.dynamodb.OldImage.song_url.S + ' 3 times, ending here.')
            }
          }

        }
      })
    }, function(err) {
      console.log('Could not refresh access token', err);
    });
}

function sendFBMessage(receiver_psid, message) {
  let response;
  response = {
    "text": message
  }

  // Sends the response message
  callSendAPI(receiver_psid, response);
}

function callSendAPI(receiver_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": receiver_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!' + response)
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}

/*******
 * how to manage a post-reply from the receiver where they have follow up prompts for multiple songs
 * or maybe my app just does not handle this
*******/
function readdSongToDynamoAndSetNewTTL(record, ttl_offset) {
  var time_number = Math.round(Date.now()/1000) + ttl_offset
  var time = String(time_number)

  var params = {
    Item: {
      "user-time": {
        S: record.dynamodb.OldImage.sender_psid.S + '-' + time
      }, 
      "TimeToLive": {
        N: time
      }, 
      "song_uri": {
        S: record.dynamodb.OldImage.song_uri.S
      },
      "song_url": {
        S: record.dynamodb.OldImage.song_url.S
      },
      "sender_psid": {
        S: record.dynamodb.OldImage.sender_psid.S
      },
      "receiver_psid": {
        S: record.dynamodb.OldImage.receiver_psid.S
      },
      "sender_name": {
        S: record.dynamodb.OldImage.sender_name.S
      },
      "receiver_name": {
        S: record.dynamodb.OldImage.receiver_name.S
      },
      "post_msg": {
        S: record.dynamodb.OldImage.post_msg.S
      },
      "time_sent": {
        S: record.dynamodb.OldImage.time_sent.S
      }
    },
    ReturnConsumedCapacity: "NONE", 
    TableName: SONGS_IN_FLIGHT_TABLE_NAME
  }

  dynamodb.putItem(params, function(err, data) {
    if (err) {
      console.log(err, err.stack); // an error occurred
    }
    else     console.log(data);           // successful response
  });

}
