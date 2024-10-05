var winston = require('winston');
require('winston-daily-rotate-file');

var setting_detail = {
    is_debug_log: true
};

var transport = new (winston.transports.DailyRotateFile)({
    filename: './logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD-HH',
    maxSize: '100m'
});


const logger = winston.createLogger({
    transports: [
        transport
    ]
});


module.exports.log = function (value) {
    if (setting_detail.is_debug_log) {
        logger.log('silly', "127.0.0.1 - there's no place like home");
        logger.info(value);
        console.log(value)
    }
}

module.exports.error = function (value) {
    if (setting_detail.is_debug_log) {
        // console.log(value);
        logger.error(value);
    }
}



