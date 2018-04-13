resource "aws_dynamodb_table" "users-table" {
  name           = "users-tf"

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

/* Must be left out by definition, but leaving here for documentation
  attribute {
    name = "auth_token"
    type = "S"
  }

  attribute {
    name = "refresh_token"
    type = "S"
  }
*/

  global_secondary_index {
    name               = "full_name-index"
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
