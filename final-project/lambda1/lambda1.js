'use strict';

// TOOD: help command that echos options
var request = require('request');
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB();

let PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

exports.handler = function(event, context, callback) {

  //let challenge = event.queryStringParameters['hub.challenge'];
  let challenge = false;

  let secret = process.env.CHALLENGE_SECRET;
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

      let name_text = text.match(name_regex)
      let pre_text = text.match(pre_regex)
      let post_text = text.match(post_regex)

      if (name_text) {
        name_text = name_text[0]
        name_text = name_text.substring(name_text.indexOf('"')+1, name_text.lastIndexOf('"'))
      }
      else {
        name_text = 'none'
      }

      console.log("Receiver name: " + name_text)

      if (pre_text) {
        pre_text = pre_text[0]
        pre_text = pre_text.substring(pre_text.indexOf('"')+1, pre_text.lastIndexOf('"'))
      }
      else {
        pre_text = ''
      }

      //  Empty string values cannot be inserted into Dynamo, so set
      //  empty values to 'none', and check for this value when using them
      if (post_text) {
        post_text = post_text[0]
        post_text = post_text.substring(post_text.indexOf('"')+1, post_text.lastIndexOf('"'))
      }
      else {
        post_text = 'none'
      }

      getUserNamesFromDynamo(url, uid, sender_psid, pre_text, post_text, name_text, verifySongInSpotifyApi)

    }
    else {
      response = {
        "text": `Not a recognized opcode. Echoing msg. You sent the message: "${text}"!`
      }
      callSendAPI(sender_psid, response);
    }
  }
}

function putSongInDynamo(url, track_uri, sender_psid, receiver_psid, sender_name, receiver_name, pre_msg, post_msg) {
  // TODO: change me! var seconds_in_five_min = 5*60
  var seconds_in_five_min = -1000
  var time_number = Math.round(Date.now()/1000) + seconds_in_five_min
  var time = String(time_number)

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
        S: receiver_psid
      },
      "sender_name": {
        S: sender_name
      },
      "receiver_name": {
        S: receiver_name
      },
      "post_msg": {
        S: post_msg
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
    else {
      let response = {
        "text": sender_name + ": " + pre_msg + " " + url 
      }
      callSendAPI(receiver_psid, response);
      console.log(data);           // successful response
    }
  });
}

function verifySongInSpotifyApi(url, uid, sender_psid, receiver_psid, sender_name, receiver_name, pre_msg, post_msg) {
  let response
  request({
    "uri": url,
    "method": "GET"
  }, (err, res, body) => {
    if (!err) {
      let msg

      if (res.statusCode == 200) {
        msg = "Verified " + url + " song with spotify API."
        putSongInDynamo(url, uid, sender_psid, receiver_psid, sender_name, receiver_name, pre_msg, post_msg)
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

function getUserNamesFromDynamo(url, uid, sender_psid, pre_text, post_text, receiver_name, f) {

  let receiver_query_params = {
    TableName: "users",
    IndexName: "full_name-index",
    KeyConditionExpression: "full_name = :receiver_name",
    ExpressionAttributeValues: {
      ":receiver_name": {S: receiver_name}
    },
    ProjectionExpression: "full_name, psid"
  }

  let sender_query_params = {
    AttributesToGet: [
      "psid",
      "full_name"
    ],
    TableName : 'users',
    Key : { 
      "psid" : {
        "S" : sender_psid
      }
    }
  }
  console.log("getUserNamesFromDynamo")

  // Lookup receiver by name, and if successful, lookup sender name, and proceed to sending message out
  // On failure of receiver lookup by name, send msg notifying sender and end execution
  dynamodb.query(receiver_query_params, function(err, receiver_lookup_result) {
    if (err) {
      console.log('FAILED TO GET RECEIVER INFO VIA NAME LOOKUP FROM DYNAMO')
      console.log(err); // an error occurred
    } 
    else {
      dynamodb.getItem(sender_query_params, function(err, sender_lookup_result) {
        if (err) {
          console.log('FAILED TO GET SENDER NAME VIA PSID LOOKUP FROM DYNAMO')
          console.log(err); // an error occurred
        } 
        else {
          // TODO rid this hack, break does not work in loop below
          let bla = 0
          receiver_lookup_result.Items.forEach(function(element, index, array) {
            // TODO fix this here to support many users with same name
            // Use the first name that appears
            // Proceed handling request          
            if (bla == 0) {
              bla++
              f(url, uid, sender_psid, element.psid.S, sender_lookup_result.Item.full_name.S, element.full_name.S, pre_text, post_text)
            }
            else
              bla++
          });
          // If user wasn't found (forEach closure doesn't execute)
          if (bla == 0) {
            let response = {
              "text": "Could not locate user"
            }
            callSendAPI(sender_psid, response);
          }
        }
      });
    }
  });

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
