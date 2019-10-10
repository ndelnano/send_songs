# Send Songs

A text based chat application built on Facebook Messenger and AWS to let you share Spotify songs with friends and be notified in real-time after they play them.

Interacting with this application involves sending predefined commands to a Facebook bot page. The commands and their structure are defined in `fb_page_description.txt`.

### How to create and deploy this application
  1. Configure Spotify developer application
  2. Configure Facebook Messenger bot page
  3. Run `sh build.sh` in root directory
  3. Run terraform -- the API endpoint for the FB Messenger webhook is an output variable
    --This project uses terraform remote state. Before running Terraform, edit terraform/remote_state.tf to point to an S3 bucket of your own.
    --Also provide values for the variables defined in variables.tf
  4. Configure FB Webhook for 'Message received' events, using API endpoint from output variables by Terraform in step 3, with '/message-received' appended to it
  5. Create API Gateway + 2 Lambda functions described under Milestones that are not included in Terraform config
    --The API endpoint for the lambda function in the register_lambda/ dir should be distributed in the FB Page description as users will use it in the registration flow.

### Milestones (in order of priority)
- [x] 1-1 user song sharing
- [ ] Terraform configuration
  - [x] Remote State (S3)
  - [x] API Gateway
  - [x] Lambda 1
  - [x] Lambda 2
  - [x] DynamoDB tables (users, songs_in_flight)
  - [x] IAM policies
  - [ ] API Gateway and Lambda functions for Spotify API authorization

### How does it work?
Spotify exposes an API endpoint for [recently played songs by a user](https://developer.spotify.com/web-api/web-api-personalization-endpoints/get-recently-played/). Using this data, its possible to know when a user plays a song that has been shared with them by a friend. 

A form of backoff is used when calling Spotify's recently played endpoint for a recipient of a song request. For the first hour, the Spotify API is called every 5 minutes. After this, and until a week has passed, the API is called once ever 1 hour. This is dictated by setting the DynamoDB record's TTL field appropriately.

![Song Sharing Architecture](diagrams/Message_Sending_Architecture.png?raw=true "Song Sharing Architecture")

### Spotify API Registration
This is done with the Authorizaton Code flow documented [here](https://github.com/spotify/web-api-auth-examples) by Spotify.
Users register with the Spotify API through API Gateway and a series of (2) Lambda functions. The first Lambda function redirects to the Spotify Auth flow and serves the user a Spotify login page, which is supplied with a callback URL connected to the second Lambda. Upon completion, this login page "calls back" to the second Lambda function, which gives the user a 16 digit code. The user is expected to send this code to the FB Page bot to complete registration.

### How DynamoDB is used
DynamoDB is used as a queue to connect the two lambda functions that my application invokes. The first lambda function responds to FB Messenger messages, and will insert a record into a DynamoDB table when a song sharing request is received. The application should not immediately call the Spotify API to determine if the song has been played--it should atleast wait until time equal to the song duration has passed, giving the receiving user a chance to play the song. The DynamoDB record will contain a TTL field approximately equal to the song duration, and the second lambda function which calls the Spotify API will be listening to the DynamoDB table stream. When the record's TTL expires, the lambda function will be invoked and will check if the receiving user has played the song. If so, the request is complete, and if not, the record will be re-added to the DynamoDB table with an updated TTL.

### Tests
Currently only one testing mechanism is in place. In tests/, there is a shell script and a json file representing a sample FB Messenger 'Message received' POST request. The shell script uses `curl` to POST the sample FB Messenger webhook event to an API endpoint, which is supplied as an argument to the script.
