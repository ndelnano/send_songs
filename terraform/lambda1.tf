resource "aws_iam_role" "iam_lambda1" {
  name = "iam_lambda1"

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

resource "aws_iam_policy" "policy_lambda1" {
    name        = "lambda1-policy"
    description = "Iam policy for lambda1"
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
				"dynamodb:Query",
				"dynamodb:PutItem",
				"dynamodb:UpdateItem"
			],
			"Resource": "${aws_dynamodb_table.users-table.arn}"
		},
    {
			"Effect": "Allow",
			"Action": [
				"dynamodb:Query"
			],
			"Resource": "arn:aws:dynamodb:${var.region}:${var.accountId}:table/${var.DYNAMO_USERS_TABLE_NAME}/index/${var.USERS_NAME_INDEX}"
		},
    {
			"Effect": "Allow",
			"Action": [
				"dynamodb:PutItem"
			],

			"Resource": "${aws_dynamodb_table.songs_in_flight-table.arn}"
		}
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "attach-lambda1" {
    role       = "${aws_iam_role.iam_lambda1.name}"
    policy_arn = "${aws_iam_policy.policy_lambda1.arn}"
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.lambda1.arn}"
  principal     = "apigateway.amazonaws.com"

  source_arn = "arn:aws:execute-api:${var.region}:${var.accountId}:${aws_api_gateway_rest_api.fb_messenger_api.id}/*/${aws_api_gateway_method.message-received_all_methods.http_method}${aws_api_gateway_resource.message_received.path}"
}

resource "aws_lambda_function" "lambda1" {
  filename         = "code/lambda1.zip"
  function_name    = "lambda1"
  role             = "${aws_iam_role.iam_lambda1.arn}"
  handler          = "lambda1.handler"
  source_code_hash = "${base64sha256(file("code/lambda1.zip"))}"
  runtime          = "nodejs6.10"

  environment {
    variables = {
      CHALLENGE_SECRET = "${var.CHALLENGE_SECRET}",
      PAGE_ACCESS_TOKEN = "${var.PAGE_ACCESS_TOKEN}",
      DYNAMO_USERS_TABLE_NAME = "${var.DYNAMO_USERS_TABLE_NAME}",
      DYNAMO_SONGS_IN_FLIGHT_TABLE_NAME = "${var.DYNAMO_SONGS_IN_FLIGHT_TABLE_NAME}"
    }
  }
}
