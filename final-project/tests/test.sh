#!/bin/bash

# Sends fb_msg.json as POST request to API Gateway at endpoint $1
curl -H "Content-Type: application/json" --data @fb_msg.json $1

