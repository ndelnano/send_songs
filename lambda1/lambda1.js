'use strict';

// TOOD: help command that echos options
var request = require('request');
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB();

let PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

let USERS_TABLE_NAME = process.env.DYNAMO_USERS_TABLE_NAME;
let SONGS_IN_FLIGHT_TABLE_NAME = process.env.DYNAMO_SONGS_IN_FLIGHT_TABLE_NAME;

exports.handler = function(event, context, callback) {
    let response_msg = '';
    let responseCode = 200;

  /* TODO CHECK IF PSID EXISTS IN DB (user is already registered or not, and if not, send them link to join */

  // Handle GET request for FB webhook verification event
  if (event['queryStringParameters']) {
    let mode = event['queryStringParameters']['hub.mode'];
    let token = event['queryStringParameters']['hub.verify_token'];
    let challenge = event['queryStringParameters']['hub.challenge'];

    let VERIFY_TOKEN = process.env.CHALLENGE_SECRET;
    // If request is verification request from FB Messenger
    // This happens when the webhook URL is FIRST registered with FB
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        response_msg = challenge;
      }
      else {
        responseCode = 403
        console.log('ERROR registering webhook')
      }

      var response = {
        statusCode: responseCode,
        body: challenge
      };

      callback(null, response)
    } 
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

    var responseBody = {
      message: response_msg
    };

    var response = {
      statusCode: responseCode,
      body: JSON.stringify(responseBody)
    };

    console.log('sending http response')
    callback(null, response);
  }
};

// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;

  // Check if the message contains text
  if (received_message.text) {    
    let text = received_message.text

    if (text.substring(0,8) === 'register') {
      let name_regex = /name:"[^"]+"/g
      let code_regex = /code:"[^"]+"/g

      let name_text = text.match(name_regex)
      let code_text = text.match(code_regex)

      if (name_text) {
        name_text = name_text[0]
        name_text = name_text.substring(name_text.indexOf('"')+1, name_text.lastIndexOf('"'))
      }
      else {
        name_text = 'none'
      }

      if (code_text) {
        code_text = code_text[0]
        code_text = code_text.substring(code_text.indexOf('"')+1, code_text.lastIndexOf('"'))
      }
      else {
        code_text = ''
      }

      registerUser(sender_psid, code_text, name_text)
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
      response = "Not a recognized opcode. Echoing msg. You sent the message: " + text + "!"
      sendFBMessage(sender_psid, response);
    }
  }
}

function putSongInDynamo(url, track_uri, sender_psid, receiver_psid, sender_name, receiver_name, pre_msg, post_msg) {
  /* 
   * Set TTL to a value that will expire instantly, to support
   * the case where the receiver has listened to the song within
   * their last 50 plays, and it appears on the first call to recently played.
   */
  var negative_time = -1000
  var time_number = Math.round(Date.now()/1000) + negative_time
  var time = String(time_number)
  var time_now = String(Math.round(Date.now()/1000))

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
      "time_sent": {
        S: time_now
      }
    },
    ReturnConsumedCapacity: "NONE", 
    TableName: SONGS_IN_FLIGHT_TABLE_NAME
  }

  dynamodb.putItem(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else {
      let response = sender_name + ": " + pre_msg + " " + url 
      sendFBMessage(receiver_psid, response);
      console.log(data);           // successful response
      console.log('Successful insertion of data into SONGS_IN_FLIGHT_TABLE_NAME');
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

      sendFBMessage(sender_psid, msg);
    }
    else {
      console.log("Unable to send message:" + err);
      response = "Error sending request to Spotify (NOT 404)"
      sendFBMessage(sender_psid, response)
    }
  });
}

function getUserNamesFromDynamo(url, uid, sender_psid, pre_text, post_text, receiver_name, f) {

  let receiver_query_params = {
    TableName: USERS_TABLE_NAME,
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
    TableName : USERS_TABLE_NAME,
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
            let response = "Could not locate user"
            sendFBMessage(sender_psid, response);
          }
        }
      });
    }
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

// Sends response messages via the Send API
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
      console.log("Unable to send message:" + err);
    }
  }); 
}

/*
 * Deletes record from users table with random code as psid (artifact of the registration process) -- (PK's cannot be modified, so must delete and re-insert)
 * Get spotify tokens from old record, and insert into new record using psid and full_name specified by user in registration message
 */
function registerUser(psid, registration_code, name) {
  let lookup_query_params = {
    AttributesToGet: [
      "auth_token",
      "refresh_token"
    ],
    TableName : USERS_TABLE_NAME,
    Key : { 
      "psid" : {
        "S" : registration_code
      }
    }
  }

  dynamodb.getItem(lookup_query_params, function(err, sender_lookup_result) {
    if (err) {
      console.log('Failed to lookup with registration code')
    } 
    else {  
      var params = {
        Item: {
          "psid": {
            S: psid 
          },
          "full_name": {
            S: name
          }, 
          "auth_token": {
            S: sender_lookup_result.Item.auth_token.S
          }, 
          "refresh_token": {
            S: sender_lookup_result.Item.refresh_token.S
          } 
        },
        ReturnConsumedCapacity: "NONE", 
        TableName: USERS_TABLE_NAME
      }

      dynamodb.putItem(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
          console.log(`Successful insertion of ${name} into users table`);
          console.log('Deleting record leftover from registration')

          var docClient = new AWS.DynamoDB.DocumentClient();
          var params = {
            TableName: USERS_TABLE_NAME,
            Key:{
              "psid":registration_code
            },
            ConditionExpression:"psid = :val",
            ExpressionAttributeValues: {
              ":val": registration_code
            }
          };

          docClient.delete(params, function(err, data) {
            if (err) {
              console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
              console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
              sendFBMessage(psid, 'You are now registered!')
            }
          });
        }
      });

    }
  });
}
