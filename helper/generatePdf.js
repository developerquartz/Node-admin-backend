var pdf = require('html-pdf');
const {uploadImageBuffer} = require('../lib/awsImageBufferUpload')

var options = { format: 'A4' };

let generatePdf = (html,callback) => {
    try {
  
    pdf.create(html,options).toBuffer(callback
        // function(err, buffer){
        // if(err)
        // callback(err,{})
        // else {
        // console.log('This is a buffer:', buffer);
        // uploadImageBuffer(buffer,callback)
        // }
    //   }
      );
    } catch (error) {
        callback(error,{})
    }
}

module.exports = {
    generatePdf
}