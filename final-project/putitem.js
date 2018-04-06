var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});

var dynamodb = new AWS.DynamoDB();

var params = {
  Item: {
    "user-time": {
      S: "41"
    }, 
    "TimeToLive": {
      N: "1522964380"
    }, 
    "song_uri": {
      S: "5xKA9Tw3aPiu7rVGWGxvgw"
    },
    "sender_psid": {
      S: "1621940424591539"
    }
  },
  ReturnConsumedCapacity: "NONE", 
  TableName: "songs_in_flight"
}

dynamodb.putItem(params, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});
