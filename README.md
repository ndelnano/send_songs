# Send Songs

### How to create and deploy this application
These details are a work in progress, but upon project completion will look like the following:
  1. Configure Spotify developer application
  2. Configure Facebook Messenger bot page
  3. Run terraform -- the API endpoint for the FB Messenger webhook is an output variable
  4. Configure FB Webhook for 'Message received' events, using API endpoint from output variables by Terraform in step 3
  5. Create API Gateway + 2 Lambda functions described under Milestones that are not included in Terraform config
    --The API endpoint for the lambda function in the register_lambda/ dir should be distributed in the FB Page description as users will use it to sign up.

### Milestones (in order of priority)
- [x] 1-1 user song sharing
- [ ] Terraform configuration
  - [x] API Gateway
  - [x] Lambda 1
  - [x] Lambda 2
  - [x] DynamoDB tables (users, songs_in_flight)
  - [x] IAM policies
  - [ ] API Gateway and Lambda functions for Spotify API authorization
  - [ ] Remote State (S3)
- [x] Registration Process
- [x] Fine tune TTL parameters, # of retries to Spotify recently played API per song share request
- [ ] Support group song sharing
- [ ] Load Test (Bees with Machine Guns)

I do not currently plan to write Terraform for an API Gateway API and two lambda functions that handle Spotify authentication, unless time permits. If you would like to run this application, you are repsonsible for handling Spotify API user authorization and inserting the following fields into the users Dynamo DB table: spotify access token, spotify refresh token. Setting this infrastructure up requires the following steps: Create API Gateway + lambda function with code from register_lambda/, which redirects user to Spotify auth flow (follow steps for permitting a 302 redirect [here](https://kennbrodhagen.net/2016/04/02/how-to-return-302-using-api-gateway-lambda/). Set the callback URL sent to Spotify to the location of the second API Gateway + lambda function config. This endpoint and lambda function will be invoked upon user completion of Spotify auth flow. Create this lambda using the code from callback_spotify_lambda/. The environment variables that these lambda functions require are documented in the respective lambda function file in each of these directories.

The reason that I have not codified this infrastructure is because I was unable to locate Terraform documentation for setting 'Header Mappings' for the API Gateway Integration Response. 

### How does it work?
Spotify exposes an API endpoint for [recently played songs by a user](https://developer.spotify.com/web-api/web-api-personalization-endpoints/get-recently-played/). Using this data, its possible to know when a user plays a song that has been shared with them by a friend. 

A form of backoff is used when calling Spotify's recently played endpoint for a recipient of a song request. For the first hour, the Spotify API is called every 5 minutes. After this, and until a week has passed, the API is called once ever 1 hour. This is dictated by setting the DynamoDB record's TTL field appropriately.

![Song Sharing Architecture](diagrams/Message_Sending_Architecture.png?raw=true "Song Sharing Architecture")

### Spotify API Registration
Users register with the Spotify API through API Gateway and a series of (2) Lambda functions. The first Lambda function redirects to the Spotify Auth flow and serves the user a Spotify login page, which is supplied with a callback URL connected to the second Lambda. Upon completion, this login page "calls back" to the second Lambda function, which gives the user a 16 digit code. The user is expected to send this code to the FB Page bot to complete registration.

### Why a 16 digit code?
I must link the identity of a user on Spotify (their auth tokens) with their PSID (page scoped ID) issued by Facebook Messenger when the FB user interacts with my page. This mechanism allows me to do so. I also require that the user specify their full name when registering with the 16 digit code. This is because this program is a text-based chat bot, and a sender must include the recipients name in order to send a message to them.
![Registration Architecture](diagrams/Registration_Architecture.png?raw=true "Registration Architecture")


### How DynamoDB is used
DynamoDB is used as a queue to connect the two lambda functions that my application invokes. The first lambda function responds to FB Messenger messages, and will insert a record into a DynamoDB table when a song sharing request is received. The application should not immediately call the Spotify API to determine if the song has been played--it should atleast wait until time equal to the song duration has passed, giving the receiving user a chance to play the song. The DynamoDB record will contain a TTL field approximately equal to the song duration, and the second lambda function which calls the Spotify API will be listening to the DynamoDB table stream. When the record's TTL expires, the lambda function will be invoked and will check if the receiving user has played the song. If so, the request is complete, and if not, the record will be re-added to the DynamoDB table with an updated TTL.

### Tests
Currently only one testing mechanism is in place. In tests/, there is a shell script and a json file representing a sample FB Messenger 'Message received' POST request. The shell script uses `curl` to POST the sample FB Messenger webhook event to an API endpoint, which is supplied as an argument to the script.
