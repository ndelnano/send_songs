# H1
Send Songs

### H3
Milestones and TODO (in order of priority)
- [x] 1-1 user song sharing
- [ ] Terraform configuration -- still working out some kinks
  - [x] API Gateway
  - [x] Lambda 1
  - [x] Lambda 2
  - [x] DynamoDB tables (users, songs_in_flight)
  - [x] IAM policies
  - [ ] EC2
- [ ] Registration Process
- [ ] Support group song sharing
- [ ] Fine tune TTL parameters, # of retries
- [ ] Load Test (Bees with Machine Guns)

### H3
How does it work?
Spotify exposes an API endpoint for [recently played songs by a user](https://developer.spotify.com/web-api/web-api-personalization-endpoints/get-recently-played/). Using this data, its possible to know when a user plays a song that has been shared with them by a friend. 

![Song Sharing Architecture](Message_Sending_Architecture.png?raw=true "Song Sharing Architecture")

### H3
Spotify API Registration
Registration with my Spotify developer application is done through a webserver run on Amazon EC2. After a user yields permission to my application to view their recently played songs on Spotify, a user may begin interacting with my Facebook messenger bot. The registration flow has yet to be constructed and the precise details of this process will be revealed after its completion.

**There are some nuiances to the registration process and how Facebook idenifies users relative to my bot page that require the structure described below. I am intentionally not explaining these details currently as they are nuianced and I am hoping to simplify them when I complete that portion of my project.**
![Registration Architecture](Registration_Architecture.png?raw=true "Registration Architecture")


### H3
How DynamoDB is used
DynamoDB is used as a queue to connect the two lambda functions that my application invokes. The first lambda function responds to FB Messenger messages, and will insert a record into a DynamoDB table when a song sharing request is received. The application should not immediately call the Spotify API to determine if the song has been played--it should atleast wait until time equal to the song duration has passed, giving the receiving user a chance to play the song. The DynamoDB record will contain a TTL field approximately equal to the song duration, and the second lambda function which calls the Spotify API will be listening to the DynamoDB table stream. When the record's TTL expires, the lambda function will be invoked and will check if the receiving user has played the song. If so, the request is complete, and if not, the record will be re-added to the DynamoDB table with an updated TTL.
