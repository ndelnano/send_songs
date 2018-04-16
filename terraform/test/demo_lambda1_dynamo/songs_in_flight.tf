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

  tags {
    Name        = "dynamodb-table-songs_in_flight"
      Environment = "production"
  }
}
