var multer = require('multer');
var multerS3 = require('multer-s3');
var aws = require('aws-sdk');

aws.config.update({
  // Your SECRET ACCESS KEY from AWS should go here,
  secretAccessKey: env.AWS.SECRET_ACCESS_KEY,
  // Not working key, Your ACCESS KEY ID from AWS should go here,
  accessKeyId: env.AWS.SECRET_ACCESS_ID,
  region: env.AWS.REGION_NAME // region of your bucket
});



var s3 = new aws.S3();

// function awsConfig() {
//   aws.config.update({
//     // Your SECRET ACCESS KEY from AWS should go here,
//     secretAccessKey: env.AWS.SECRET_ACCESS_KEY,
//     // Not working key, Your ACCESS KEY ID from AWS should go here,
//     accessKeyId: env.AWS.SECRET_ACCESS_ID,
//     region: env.AWS.REGION_NAME // region of your bucket
//   });
//    s3 = new aws.S3();
//    return s3;
// }
var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: env.AWS.BUCKET_NAME,
    contentLength: 500000000,
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + file.originalname)
    }
  })
});

module.exports = upload;