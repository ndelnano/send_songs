resource "aws_dynamodb_table" "songs_in_flight-table" {
  name           = "songs_in_flight-tf"
    read_capacity  = 3
    write_capacity = 3
    hash_key       = "user-time"
    stream_enabled = true
    stream_view_type = "OLD_IMAGE"

    attribute {
      name = "user-time"
        type = "S"
    }

  ttl {
    attribute_name = "TimeToLive"
      enabled = true
  }

/* Must be left out by definition, but leaving here for documentation
  attribute {
    name = "post_msg"
      type = "S"
  }

  attribute {
    name = "sender_name"
      type = "S"
  }

  attribute {
    name = "receiver_name"
      type = "S"
  }

  attribute {
    name = "sender_psid"
      type = "S"
  }

  attribute {
    name = "receiver_psid"
      type = "S"
  }

  attribute {
    name = "song_uri"
      type = "S"
  }

  attribute {
    name = "song_url"
      type = "S"
  }

  attribute {
    name = "trips_through_database"
      type = "N"
  }
*/

  tags {
    Name        = "dynamodb-table-songs_in_flight"
      Environment = "production"
  }
}
