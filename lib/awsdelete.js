var aws = require('aws-sdk');

aws.config.update({
  // Your SECRET ACCESS KEY from AWS should go here,
  secretAccessKey: env.AWS.SECRET_ACCESS_KEY,
  // Not working key, Your ACCESS KEY ID from AWS should go here,
  accessKeyId: env.AWS.SECRET_ACCESS_ID,
  region: env.AWS.REGION_NAME // region of your bucket
});

var s3 = new aws.S3();

module.exports.deleteFromAWS = (keyimage) => {
  var forimage = keyimage.split("/");
  var n = forimage.length;
  keyimage = forimage[n - 1];
  var params = {
    Bucket: env.AWS.BUCKET_NAME,
    Key: keyimage
  };
  s3.deleteObject(params, function (err, data) {
    if (err) {
      console.log(err, err.stack);
    } // an error occurred
    else {
      console.log("success");
    } // successful response
    /*
    data = {
    }
    */
  });
}
