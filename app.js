//required module
const i18n = require('./config/i18n');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const sticky = require('sticky-session');
const cluster = require('cluster');
const cookieParser = require('cookie-parser');
//const session = require('express-session')
const logger = require('morgan');
const compression = require('compression')
const EventEmitter = require('events');
app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '150mb' }));
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '150mb'
}));
require('dotenv').config();
app.use(i18n);
const eventEmitter = new EventEmitter();
app.set('eventEmitter', eventEmitter);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
// app.use(session({
//   secret: 'azsasasas',
//   resave: true,
//   saveUninitialized: true,
//   cookie: { maxAge: 10000 }
// }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use("/public", express.static(__dirname + '/public'));
//app.use(compression({ level: 9, threshold: 0 }));
//////////////// port define /////////////////////////////////////
app.set('port', process.env.PORT || 3093);
const http = require('http').createServer(app);

http.listen(process.env.PORT || 3093, () => {
  console.log(`Server running at :` + (process.env.PORT || 3093));
});
// if (!sticky.listen(http, app.get('port'))) {

//   http.once('listening', function () {
//     console.log('Server started on port ' + app.get('port'));
//   });

//   if (cluster.isMaster) {

//     var numWorkers = require('os').cpus().length;

//     //console.log('Master cluster setting up ' + numWorkers + ' workers...');

//     for (var i = 0; i < numWorkers; i++) {
//       cluster.fork();
//     }
//     //console.log('Main server started on port ' + app.get('port'));

//     cluster.on('online', function (worker) {
//       console.log('Worker ' + worker.process.pid + ' is online');
//     });
//   }
// }
// else {
//   console.log('- Child server started on port ' + app.get('port') + ' case worker id=' + cluster.worker.id);
// }

const NODE_ENV = process.env.NODE_ENV;
env = require('./config/env-stagging');

if (NODE_ENV === 'production') {
  env = require('./config/env');
}

//****Database connection mongodb using mongoose */
const mongoAtlasUri = env.mongoAtlasUri;
console.log(mongoAtlasUri);
mongoose.connect(mongoAtlasUri, { useCreateIndex: true, useFindAndModify: false, useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = global.Promise;
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once("open", function callback() {
  console.log("Db atlas Connected");
});
helper = require('./helper/helper');
//firebase
//require('./firebase/firebaseMain')(app);
//all routes
require('./routes/mainRoutes')(app);

let agenda2 = require('./cron/agenda');

(async function () { // IIFE to give access to async/await
  await agenda2.start();
  //agenda2.schedule("in 24 hours", "checkScheduleDriver");
  await agenda2.every("* * * * *", "checkerExpirePromocode");

})();



