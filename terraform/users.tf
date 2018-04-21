resource "aws_dynamodb_table" "users-table" {
  name           = "${var.DYNAMO_USERS_TABLE_NAME}"

  // TODO update read and write capacity
  read_capacity  = 1
  write_capacity = 1

  hash_key       = "psid"

  attribute {
    name = "psid"
    type = "S"
  }

  attribute {
    name = "full_name"
    type = "S"
  }

  global_secondary_index {
    name               = "${var.USERS_NAME_INDEX}"
    hash_key           = "full_name"
    write_capacity     = 1
    read_capacity      = 1
    projection_type    = "INCLUDE"
    non_key_attributes = ["full_name"]
  }

  tags {
    Name        = "dynamodb-users-table"
    Environment = "production"
  }
}
