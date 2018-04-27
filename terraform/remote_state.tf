terraform {
  backend "s3" {
    bucket = "ndelnano-send-songs"
    key    = "remote-state"
    region = "us-east-1"
  }
}
