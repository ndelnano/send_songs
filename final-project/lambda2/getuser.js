var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});

var dynamodb = new AWS.DynamoDB();
var params = {
  AttributesToGet: [
    "psid",
    "auth_token",
    "refresh_token"
  ],
  TableName : 'users',
  Key : { 
    "psid" : {
      "S" : '1621940424591539'
    }
  }
}

dynamodb.getItem(params, function(err, data) {
  if (err) {
    console.log(err); // an error occurred
  } 
  else {
    console.log(data.Item.refresh_token.S);
    console.log(data.Item.auth_token.S);
    console.log(data.Item.psid.S);
  }
});

