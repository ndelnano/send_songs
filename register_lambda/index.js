var querystring = require('querystring');

var client_id = process.env.client_id
var redirect_uri = process.env.redirect_uri

exports.handler = (event, context, callback) => {

  var state = 'AAAAAAAAAAAAAAAA';
  var stateKey = 'spotify_auth_state';

  var scope = 'user-read-recently-played';
  var url = 'https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    });

  context.succeed({location: url});
}
