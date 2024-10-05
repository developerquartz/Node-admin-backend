
let sendErrorResponse = function (err, res) {
    return res.status(err.status_code || 200).send({ "status": "failure", "status_code": err.status_code || 200, message: err.message, error_description: err.error_description || '', data: err.data || {} });
};

let sendSuccessResponse = function (result, res) {
    return res.status(result.status_code || 200).send({ "status": "success", "status_code": result.status_code || 200, message: result.message || 'SUCCESS!', data: result.data || {}, totalcount: result.count || 0 });
};

module.exports = {
    sendErrorResponse,
    sendSuccessResponse
}
