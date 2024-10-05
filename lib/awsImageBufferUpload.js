
var aws = require('aws-sdk');
var request = require('request');
var fs = require('fs')
var isCorrupted = require('is-corrupted-jpeg');

aws.config.update({
  // Your SECRET ACCESS KEY from AWS should go here,
  secretAccessKey: env.AWS.SECRET_ACCESS_KEY,
  // Not working key, Your ACCESS KEY ID from AWS should go here,
  accessKeyId: env.AWS.SECRET_ACCESS_ID,
  region: env.AWS.REGION_NAME // region of your bucket
});

var s3 = new aws.S3();

let uploadImageBuffer = (fileContent, callback) => {
    console.log("fileContent :",fileContent);
    
            const params = {
              Bucket: env.AWS.BUCKET_NAME, // pass your bucket name
              Key: "pdf _" + new Date().getTime()+".pdf", // file will be saved as testBucket/contacts.csv
              ACL: 'public-read',
              Body:fileContent,
              ContentEncoding: 'base64'
          };
          s3.upload(params,async (err,result)=>{
              console.log("err,result :",err,result);
              
            if(err)
            callback(err,{})
            else
            callback(err,result)
          } 
          );
         
}
module.exports = {
    uploadImageBuffer
}