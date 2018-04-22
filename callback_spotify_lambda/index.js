var request = require('request');
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB();

let USERS_TABLE_NAME = process.env.DYNAMO_USERS_TABLE_NAME;

exports.handler = (event, context, callback) => {
  var client_id = process.env.client_id
  var client_secret = process.env.client_secret
  var redirect_uri = process.env.redirect_uri

  var code = event["queryStringParameters"]['code']

  if (event["queryStringParameters"]['state'] === null) {
    console.error('state mismatch!!!')
  }
  else {
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
          refresh_token = body.refresh_token;

        var random_code = generateRandomString(16);
        var responseBody = {
          message: `Use this code to register. Follow the instructions on the Send Songsss Facebook page. Code: ${random_code}`
        };

        insertRandomCodeIntoUsersTable(random_code, access_token, refresh_token)

        var response = {
          statusCode: 200,
          body: JSON.stringify(responseBody)
        };

        callback(null, response);

      } else {
        console.error('ERROR from spotify API trying to get tokens')
      }
    });


  }

};

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

/* 
 * Since PSID is PK of users table and it must be filled, set random 16 digit code
 * as PSID. This will be overwritten with the user's PSID when the user
 * sends the random code to the bot.
 */
function insertRandomCodeIntoUsersTable(registration_code, auth_token, refresh_token) {
  var params = {
    Item: {
      "psid": {
        S: registration_code
      },
      "auth_toke": {
        S: auth_token
      }, 
      "refresh_token": {
        S: refresh_token
      } 
    },
    ReturnConsumedCapacity: "NONE", 
    TableName: USERS_TABLE_NAME
  }

  dynamodb.putItem(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else {
      console.log(`Successful insertion of ${registration_code} into users table`);
    }
  });
}
