#!/bin/bash

cd lambda1 
zip -r ../terraform/code/lambda1.zip lambda1.js node_modules

cd ../lambda2
zip -r ../terraform/code/lambda2.zip lambda2.js node_modules

cd ..
