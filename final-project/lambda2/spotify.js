var SpotifyWebApi = require('spotify-web-api-node');

// credentials are optional
var spotifyApi = new SpotifyWebApi({
  clientId : '12389b3e23114f0f9d278063ae5bbbd4',
  clientSecret : '96d55481dbbe45c3920555771709b41f'
});

spotifyApi.setAccessToken('BQDIe5LnMGBxMliNejjFtgulvEepuQdwJTvOqjj6AdPnYvGZxZo0V1and7w00l7i7QETIz79EmGnQng-nLkv8iHwB-7zt8dNh0-jZaOJxrimItoKVT2zhHIYG49karc4DpklRhwW6IEIo2_vpLwT2rKXgaSMu_S06xrySFz0vP9CKGC-hb3pXfteAD9pUY9wwprntQLc0mIsmxsGYBm9QXckkYMf');
spotifyApi.setRefreshToken('AQBrFb2y17YqOgu5YSMpIH4q-UkgdTY7Ap15RKTvV08YA1SqOdPMN8p-Ui560SETgjR5N5m3-uhBFQy7WjXAI6n6jUhQyqlYq9k6bMYpt-1l-NI1TfDPSXYJCDNRBuxuKic');

var uri = '7JuDJDivrWU09rMVpcR1t7'

spotifyApi.refreshAccessToken()
  .then(function(data) {
    console.log('The access token has been refreshed!');

    // Save the access token so that it's used in future calls
    spotifyApi.setAccessToken(data.body['access_token']);

    spotifyApi.getMyRecentlyPlayedTracks({}, function(err, data) {
      if (err) {
        console.error('Something went wrong!', err);
      } else {
        for(var i in data.body.items) {
          if(data.body.items[i].track.uri.indexOf(uri) > -1) {
          }
          console.log(data.body.items[i].track.name + ' listened to')
        }
      }
    })
  }, function(err) {
    console.log('Could not refresh access token', err);
  });

