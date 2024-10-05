var multer  = require('multer')
var uploadLocal = multer({ dest: 'uploads/' })

module.exports = uploadLocal; 