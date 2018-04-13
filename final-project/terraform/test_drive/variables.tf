provider "aws" {
  region     = "us-east-1"
}
variable "region" {
  default = "us-east-1"
}

variable "DYNAMO_USERS_TABLE_NAME" {
  default = "users-tf"
}

variable "DYNAMO_SONGS_IN_FLIGHT_TABLE_NAME" {
  default = "songs_in_fight-tf"
}


