'use strict';

var request = require('request');
var AWS = require('aws-sdk');

let PAGE_ACCESS_TOKEN = 'EAADQIisgoPsBAF2P4pDV4HBD2bG45ZAU93EEYIGLkK9mLZBoJabS64S5O2YrlbcGGByoAAhLjhWXXtTTQ9ZBc5M0fVn752wMbHeuACqfWDlZCE9ZAbD8VU738YQHQxP2SGTcfztH1EBpFM4B72WkMKvmFfJBhL2xvHUttxKe3cAZDZD';

exports.handler = function(event, context, callback) {

  //let challenge = event.queryStringParameters['hub.challenge'];
  let challenge = false;

  let secret = 'gVo0Gju8f!NDky';
  let response_msg = '';

  if (challenge) {
    response_msg = challenge;
  } 
  else 
  {
    let body = JSON.parse(event.body);
    if (body.object === 'page') {
      body.entry.forEach(function(entry) {
        let webhook_event = entry.messaging[0];

        console.log(JSON.stringify(body))

        // Get the sender PSID
        let sender_psid = webhook_event.sender.id;

        console.log('message received: ' + webhook_event.message);

        // Check if the event is a message or postback and
        // pass the event to the appropriate handler function
        if (webhook_event.message) {
          handleMessage(sender_psid, webhook_event.message);
        }
        response_msg = 'EVENT_RECEIVED';
      });
    }
  }
  let responseCode = 200;

  var responseBody = {
    message: response_msg,
    input: event
  };

  var response = {
    statusCode: responseCode,
    body: JSON.stringify(responseBody)
  };

  console.log('sending http response')
  callback(null, response);
};

// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;

  // Check if the message contains text
  if (received_message.text) {    
    let text = received_message.text

    // TODO Use verification code and insert registration info (PSID) into dynamo
    if (text.substring(0,8) === 'register') {
      response = {
        "text": "You're asking to sign up!"
      }
      callSendAPI(sender_psid, response);
    }

    else if (text.substring(0,9) === 'send_song') {
      // Get URL from FB message
      let url_regex = /\bhttps?:\/\/\S+/gi
      let post_regex = /post:"[^"]+"/g
      let pre_regex = /pre:"[^"]+"/g
      let name_regex = /name:"[^"]+"/g

      var url = text.match(url_regex)[0];
      let start_uid = url.lastIndexOf('/')
      let end_uid = url.lastIndexOf('?')
      let uid = url.substring(start_uid+1, end_uid)

      // TODO
      // Verify recipient name exists in dynamo, send error msg if not
      // send song link and pre msg (if exists) recipient

      request({
        "uri": url,
        "method": "GET"
      }, (err, res, body) => {
        if (!err) {
          let msg

          if (res.statusCode == 200) {
            msg = "Verified " + url + " song with spotify API"
            putSongInDynamo(url, uid, sender_psid)
          }
          else {
            msg = 'Received 404 from Spotify trying to verify song link'
          }

          response = {
            "text": msg
          }
          callSendAPI(sender_psid, response);
        }
        else {
          console.log("Unable to send message:" + err);
          response = {
            "text": "Error sending request to Spotify (NOT 404)"
          }
          callSendAPI(sender_psid, response)
        }
      });

    }
    else {
      response = {
        "text": `Not a recognized opcode. Echoing msg. You sent the message: "${text}"!`
      }
      callSendAPI(sender_psid, response);
    }
  }
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
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
      console.log("Unable to send message:" + err);
    }
  }); 
}

function putSongInDynamo(url, track_uri, sender_psid) {
  var dynamodb = new AWS.DynamoDB();

  // TODO: change me! var seconds_in_five_min = 5*60
  var seconds_in_five_min = -1000
  var time_number = Math.round(Date.now()/1000) + seconds_in_five_min
  var time = String(time_number)

  // TODO: for now, use the sender psid as the listener psid also
  // Until we are able to lookup a user with a name 
  var params = {
    Item: {
      "user-time": {
        S: sender_psid + '-' + time
      }, 
      "TimeToLive": {
        N: time
      }, 
      "song_uri": {
        S: track_uri
      },
      "song_url": {
        S: url
      },
      "sender_psid": {
        S: sender_psid
      },
      "receiver_psid": {
        S: sender_psid
      },
      "trips_through_database": {
        S: '0'
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
