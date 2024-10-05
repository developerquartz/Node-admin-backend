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

// module.exports = function put_from_url(url, callback) {
//     request({
//         url: url,
//         encoding: 'binary'
//     }, function(err, res, body) {
//         if (err)
//             return callback(err, []);

//             console.log("body :",body);
//             let key = new Date().getTime() + "_" + url.split('/')[url.split('/').length -1]
//             var base64data = new Buffer(body, 'binary');

//             const params = {
//               Bucket: env.AWS.BUCKET_NAME, // pass your bucket name
//               Key: key, // file will be saved as testBucket/contacts.csv
//               ACL: 'public-read',
//               Body:base64data
//           };
//           s3.upload(params, 
//             callback
//           );
//     })
// }
module.exports = function put_from_url(url, callback) {
    let path = './uploads/image_' + new Date().getTime().toString()+".jpeg"
    download(url, path, (err,data) => {
        if (err)
        return callback(err, {});
        if(isCorrupted(path)) {
            console.log("image corrupt status : " ,isCorrupted(path));
            helper.unlinkLocalFile(path) //delete the file from local

            return callback(null,{isCorrupted:true})
        }

            const fileContent = fs.readFileSync(path);
            let key = new Date().getTime() + "_" + url.split('/')[url.split('/').length -1]

            const params = {
              Bucket: env.AWS.BUCKET_NAME, // pass your bucket name
              Key: key, // file will be saved as testBucket/contacts.csv
              ACL: 'public-read',
              Body:fileContent
          };
          s3.upload(params,async (err,result)=>{
            if(err)
            callback(err,{})
            else
            callback(err,{...result,isCorrupted:false})
          } 
          );
          
          helper.unlinkLocalFile(path) //delete the file from local


    })
}

const download = (url, path, callback) => {
  request.head(url, (err, res, body) => {
      console.log("err, res, body :",err,body)
    request(url)
      .pipe(fs.createWriteStream(path))
      .on('close', callback)
  })
}