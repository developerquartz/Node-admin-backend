const File = require('../models/fileTable.js');
const upload = require('../lib/awsimageupload.js');
const deletImg = require('../lib/awsdelete')
const imageUpload = upload.any();
const deleteaws = require('../lib/awsdelete.js');
const ObjectId = require('objectid')
const Config = require('../config/constants.json');

module.exports = {

    addFileData: async (req, res) => {
        try {
            imageUpload(req, res, async (err, some) => {
                let data = req.body;
                
                if (req.store && req.store.storeId)
                    data.store = req.store.storeId

                if (data.type && !Config.FILE_TYPE.includes(data.type)) {
                    return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
                }

                const file = req.files;
                
                if (!file) {
                    return res.json(helper.showValidationErrorResponse('IMAGE_IS_REQUIRED'));
                }

                if (err) {
                    return res.json(helper.showAWSImageUploadErrorResponse('IMAGE_UPLOAD_ERROR', err.message));
                }
                if (!req.files[0].location) {
                    return res.json(helper.showAWSImageUploadErrorResponse('IMAGE_UPLOAD_ERROR', "File location not found"));
                }
                data.link = req.files[0].location ;

                File.addFile(data, (err, resdata) => {
                    if (err) {
                        console.log("err", err);
                        return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        let resdatas = helper.showSuccessResponse('IMAGE_UPLOAD_SUCCESS', resdata);
                        res.json(resdatas);
                    }
                });
            });
        }
        catch (err) {
            console.log("err", err);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getImageList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, fields, search } = req.body
            let pageSize = limit || 10;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || -1;
            let paged = page || 1;

            let obj = {};
            if (req.store && req.store.storeId)
                obj.store = req.store.storeId

            if (fields && fields.length > 0) {
                fields.forEach(element => {
                    if (element.fieldName && element.fieldValue) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }

            // if (!obj.hasOwnProperty("status")) {
            //     obj.status = { $ne: "archived" };
            // }

            if (search) {
                obj['$and'] = [];
                obj['$and'].push({ code: { $regex: search || '', $options: 'i' } })
            }

            let count = await File.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            File.geFileWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        }
        catch (err) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getFileDetailsById: async (req, res) => {
        try {
            var file_id = req.params._id;

            if (!file_id) {
                return res.json(helper.showValidationErrorResponse('ID_REQUIRED'));
            }

            File.getFileById(file_id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('FILE_DETAIL', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateFileData: async (req, res) => {
        try {
            imageUpload(req, res, async (err, some) => {

                let data = req.body;

                const file = req.files;

                // if (!file) {
                //     return res.json(helper.showValidationErrorResponse('IMAGE_IS_REQUIRED'));
                // }

                // if (err) {
                //     return res.json(helper.showAWSImageUploadErrorResponse('IMAGE_UPLOAD_ERROR', err.message));
                // }
                if (file)
                    data.link = req.files[0].location;

                if (!data._id) {
                    return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
                }

                File.updateFile(data, (err, resdata) => {
                    if (err) {
                        return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        return res.json(helper.showSuccessResponse('DATA_UPDATED', resdata));
                    }
                });
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    removeFileData: async (req, res) => {
        try {
            var data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            File.getFileByIdAsync(data._id, async (err, result) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                }
                else {
                    await deleteaws.deleteFromAWS(result.link)
                    await File.removeFile(data._id, async (err, resdata) => {
                        if (err) {
                            return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        } else {
                            return res.json(helper.showSuccessResponse('DELETED_SUCCESS', resdata));
                        }
                    });
                }
            })

            // File.removeFile(data._id, (err, resdata) => {
            //     if (err) {
            //         return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            //     } else {
            //         return res.json(helper.showSuccessResponse('DELETED_SUCCESS', resdata));
            //     }
            // });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    viewImage: async (req, res) => {
        try {
            let a = {};
            let imgPath = "https://mnc.s3.us-east-2.amazonaws.com/1606465437959juices.png";
            request(imgPath, { encoding: null }, function (err, response, body) {
                if (err) {
                    console.log("err", err);
                } else {
                    res.statusCode = response.statusCode;
                    res.writeHead(res.statusCode, { 'Content-Type': 'image/png' });
                    res.write(body);
                    res.end();
                }
            });
        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateStatus: async (req, res) => {
        try {
            let data = req.body;

            if (data._id.length === 0) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

            let ids = [];
            data._id.forEach(element => {
                ids.push(ObjectId(element));
            });

            data._id = ids;
            let update = {};
            update.status = data.status;

            File.updateStatusByIds(data, update, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}