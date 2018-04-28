resource "aws_dynamodb_table" "songs_in_flight-table" {
  name           = "${var.DYNAMO_SONGS_IN_FLIGHT_TABLE_NAME}"
    read_capacity  = "${var.DYNAMO_SONGS_IN_FLIGHT_READ_CAPACITY}"
    write_capacity = "${var.DYNAMO_SONGS_IN_FLIGHT_WRITE_CAPACITY}"

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
