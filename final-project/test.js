'use strict';

var request = require('request');

var url = 'send_song name:"Nick Del Nano" pre:"prepare thy ears!" post:"what a tune" name:"" https://open.spotify.com/track/5VZ8Y1eQAvLc64YP4fPlBl?si=esYCwLc4Q1OBRvbg0jl2_g'
//var url = 'send_song https:/fjdkafjdsfd'
// Get URL from FB message
let url_regex = /\bhttps?:\/\/\S+/gi
var url_text = url.match(url_regex)

let post_regex = /post:"[^"]+"/g
let pre_regex = /pre:"[^"]+"/g
let name_regex = /name:"[^"]+"/g

let pre_text = url.match(pre_regex)
let post_text = url.match(post_regex)
let name_text = url.match(name_regex)

if (url_text) {
  url_text = url_text[0]
  let start_uid = url_text.lastIndexOf('/')
  let end_uid = url_text.lastIndexOf('?')
  let uid = url_text.substring(start_uid+1, end_uid)
  console.log(url_text)
  console.log(uid)
}

if (pre_text) {
  pre_text = pre_text[0]
  pre_text = pre_text.substring(pre_text.indexOf('"')+1, pre_text.lastIndexOf('"'))
  console.log(pre_text)
}

if (post_text) {
  post_text = post_text[0]
  post_text = post_text.substring(post_text.indexOf('"')+1, post_text.lastIndexOf('"'))
  console.log(post_text)
}

if (name_text) {
  name_text = name_text[0]
  name_text = name_text.substring(name_text.indexOf('"')+1, name_text.lastIndexOf('"'))
  console.log(name_text)
}

