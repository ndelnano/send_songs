resource "aws_dynamodb_table" "users-table" {
  name           = "${var.DYNAMO_USERS_TABLE_NAME}"

  read_capacity  = "${var.DYNAMO_USERS_READ_CAPACITY}"
  write_capacity = "${var.DYNAMO_USERS_WRITE_CAPACITY}"

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
   write_capacity     = "${var.DYNAMO_USERS_NAME_INDEX_WRITE_CAPACITY}"
    read_capacity      = "${var.DYNAMO_USERS_NAME_INDEX_READ_CAPACITY}"
    projection_type    = "INCLUDE"
    non_key_attributes = ["full_name"]
  }

  tags {
    Name        = "dynamodb-users-table"
    Environment = "production"
  }
}
