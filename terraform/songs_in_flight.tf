resource "aws_dynamodb_table" "songs_in_flight-table" {
  name           = "${var.DYNAMO_SONGS_IN_FLIGHT_TABLE_NAME}"
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
