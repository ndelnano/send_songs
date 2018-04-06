'use strict';

var request = require('request');
 
exports.handler = function(event, context, callback) {
    
    //let challenge = event.queryStringParameters['hub.challenge'];
    let challenge = false;
    
    // The output from a Lambda proxy integration must be 
    // of the following JSON object. The 'headers' property 
    // is for custom response headers in addition to standard 
    // ones. The 'body' property  must be a JSON string. For 
    // base64-encoded payload, you must also set the 'isBase64Encoded'
    // property to 'true'.
    /*
    var response = {
        statusCode: responseCode,
        headers: {
            "x-custom-header" : "my custom header value"
        },
        body: JSON.stringify(responseBody)
    };
    */
    
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

    // Create the payload for a basic text message
    response = {
      "text": `You sent the message: "${received_message.text}"!`
    }
  }  
  
  // Sends the response message
  callSendAPI(sender_psid, response);  
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

