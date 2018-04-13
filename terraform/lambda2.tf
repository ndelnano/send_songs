resource "aws_iam_role" "iam_lambda2" {
  name = "iam_lambda2"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "policy-lambda2" {
    name        = "lambda2-policy"
    description = "Iam policy for lambda2"
    policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
        ],
        "Resource": "arn:aws:logs:*:*:*"
    },
    {
			"Effect": "Allow",
			"Action": [
				"dynamodb:GetItem",
			],

			"Resource": "${aws_dynamodb_table.users-table.arn}"
		},
    {
			"Effect": "Allow",
			"Action": [
				"dynamodb:PutItem",
			],

			"Resource": "${aws_dynamodb_table.songs_in_flight-table.arn}"
		},
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:DescribeStream",
        "dynamodb:GetRecords",
        "dynamodb:GetShardIterator",
        "dynamodb:ListStreams"
      ],

			"Resource": "${aws_dynamodb_table.songs_in_flight-table.arn}"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "attach-lambda2" {
    role       = "${aws_iam_role.iam_lambda2.name}"
    policy_arn = "${aws_iam_policy.policy-lambda2.arn}"
}

resource "aws_lambda_function" "lambda2" {
  filename         = "code/lambda2.zip"
  function_name    = "lambda2"
  role             = "${aws_iam_role.iam_lambda2.arn}"
  handler          = "lambda2.handler"
  source_code_hash = "${base64sha256(file("code/lambda2.zip"))}"
  runtime          = "nodejs6.10"

  environment {
    variables = {
      PAGE_ACCESS_TOKEN = "${var.PAGE_ACCESS_TOKEN}",
      SPOTIFY_CLIENT_ID = "${var.SPOTIFY_CLIENT_ID}",
      SPOTIFY_CLIENT_SECRET = "${var.SPOTIFY_CLIENT_SECRET}",
      DYNAMO_USERS_TABLE_NAME = "${var.DYNAMO_USERS_TABLE_NAME}",
      DYNAMO_SONGS_IN_FLIGHT_TABLE_NAME = "${var.DYNAMO_SONGS_IN_FLIGHT_TABLE_NAME}"
    }
  }
}
