var request = require('request');

exports.handler = (event, context, callback) => {
  var client_id = process.env.client_id
  var client_secret = process.env.client_secret
  var redirect_uri = process.env.redirect_uri

  var code = event["queryStringParameters"]['code']
  console.log('CODE ' + code)

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

        console.log(access_token);
        console.log(refresh_token);

        var random_code = generateRandomString(16);
        var responseBody = {
          message: `Use this code to register. Follow the instructions on the Send Songsss Facebook page. Code: ${random_code}`
        };

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
