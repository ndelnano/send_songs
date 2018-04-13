provider "aws" {
  region     = "us-east-1"
}

variable "region" {
  default = "us-east-1"
}

variable "PAGE_ACCESS_TOKEN" {
}

variable "CHALLENGE_SECRET" {
}

variable "DYNAMO_SONGS_IN_FLIGHT_TABLE_NAME" {
  default = "songs_in_flight-tf"
}

variable "DYNAMO_USERS_TABLE_NAME" {
  default = "users-tf"
}

variable "SPOTIFY_CLIENT_ID" {
}

variable "SPOTIFY_CLIENT_SECRET" {
}
