'use strict';

var request = require('request');
var AWS = require('aws-sdk');

var SpotifyWebApi = require('spotify-web-api-node');

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

      //handleMessage(sender_psid);
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
    TableName : 'users',
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
    clientId : '12389b3e23114f0f9d278063ae5bbbd4',
    clientSecret : '96d55481dbbe45c3920555771709b41f'
  });

  spotifyApi.setAccessToken(auth_token)
  spotifyApi.setRefreshToken(refresh_token)
  spotifyApi.refreshAccessToken()
    .then(function(data) {
      console.log('The access token has been refreshed!');

      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);

      spotifyApi.getMyRecentlyPlayedTracks({}, function(err, data) {
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
            handleMessage(record.dynamodb.OldImage.sender_psid.S, 'receiver listened to ' + song_name)
          }
          else {
            console.log('RECEIVER DID NOT LISTEN TO SONG sent at: ' + record.dynamodb.OldImage.TimeToLive)
            handleMessage(record.dynamodb.OldImage.sender_psid.S, 'receiver DID NOT listen to song')
            if (Number(record.dynamodb.OldImage.trips_through_database.S) < 2) {
              readdSongToDynamoAndSetNewTTL(record)
              console.log('READDING SONG TO DYNAMO')
              handleMessage(record.dynamodb.OldImage.sender_psid.S, 'Readding song to Dynamo')
            }
            else {
              console.log('NOT READDING SONG TO DYNAMO, STOPPING HERE')
              handleMessage(record.dynamodb.OldImage.sender_psid.S, 'User hasnt listened 3 times, ending here')
            }
          }

        }
      })
    }, function(err) {
      console.log('Could not refresh access token', err);
    });
}

function handleMessage(sender_psid, message) {
  let response;
  response = {
    "text": message
  }

  // Sends the response message
  callSendAPI(sender_psid, response);
}

function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  let PAGE_ACCESS_TOKEN = 'EAADQIisgoPsBAF2P4pDV4HBD2bG45ZAU93EEYIGLkK9mLZBoJabS64S5O2YrlbcGGByoAAhLjhWXXtTTQ9ZBc5M0fVn752wMbHeuACqfWDlZCE9ZAbD8VU738YQHQxP2SGTcfztH1EBpFM4B72WkMKvmFfJBhL2xvHUttxKe3cAZDZD';

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
function readdSongToDynamoAndSetNewTTL(record) {
  // TODO change my value here
  var seconds_in_five_min = 60 * 5
  var time_number = Math.round(Date.now()/1000) + seconds_in_five_min
  var time = String(time_number)

  // Increment trips through DB
  // TODO: Only send song through X times, for now 3 times total
  var trips_through_db = String(Number(record.dynamodb.OldImage.trips_through_database.S) + 1)

  var params = {
    Item: {
      // TODO: when user-time changes to user_time, use the value from record to avoid pk conflicts
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
      "trips_through_database": {
        S: trips_through_db
      }
    },
    ReturnConsumedCapacity: "NONE", 
    TableName: "songs_in_flight"
  }

  dynamodb.putItem(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });

}
