resource "aws_api_gateway_rest_api" "fb_messenger_api" {
  name        = "FbMessangerAPI"
  description = "This is my API for receiving FB Messenger webhook events"
}

resource "aws_api_gateway_resource" "message_received" {
  rest_api_id = "${aws_api_gateway_rest_api.fb_messenger_api.id}"
  parent_id = "${aws_api_gateway_rest_api.fb_messenger_api.root_resource_id}"
  path_part = "message-received"
}

resource "aws_api_gateway_method" "message-received_all_methods" {
  rest_api_id = "${aws_api_gateway_rest_api.fb_messenger_api.id}"
  resource_id = "${aws_api_gateway_resource.message_received.id}"
  http_method = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "message-received_api_method-integration" {
  rest_api_id = "${aws_api_gateway_rest_api.fb_messenger_api.id}"
  resource_id = "${aws_api_gateway_resource.message_received.id}"
  http_method = "${aws_api_gateway_method.message-received_all_methods.http_method}"
  type = "AWS_PROXY"
  uri = "arn:aws:apigateway:${var.region}:lambda:path/2015-03-31/functions/${aws_lambda_function.lambda1.arn}/invocations"
  integration_http_method = "POST"
}

resource "aws_api_gateway_deployment" "api_deployment_dev" {
  depends_on = [
    "aws_api_gateway_method.message-received_all_methods",
    "aws_api_gateway_integration.message-received_api_method-integration"
  ]
  rest_api_id = "${aws_api_gateway_rest_api.fb_messenger_api.id}"
  stage_name = "dev"
}

resource "aws_api_gateway_deployment" "api_deployment_prod" {
  depends_on = [
    "aws_api_gateway_method.message-received_all_methods",
    "aws_api_gateway_integration.message-received_api_method-integration"
  ]
  rest_api_id = "${aws_api_gateway_rest_api.fb_messenger_api.id}"
  stage_name = "api"
}

output "dev_url" {
  value = "https://${aws_api_gateway_deployment.api_deployment_dev.rest_api_id}.execute-api.${var.region}.amazonaws.com/${aws_api_gateway_deployment.api_deployment_dev.stage_name}"
}

output "prod_url" {
  value = "https://${aws_api_gateway_deployment.api_deployment_prod.rest_api_id}.execute-api.${var.region}.amazonaws.com/${aws_api_gateway_deployment.api_deployment_prod.stage_name}"
}
