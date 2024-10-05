const addressTable = require('../models/addressTable');

module.exports = {

    getAddressList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, fields } = req.body;
            var pageSize = limit || 999999;
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;
            let obj = {};

            if (fields && fields.length > 0) {
                fields.forEach(element => {
                    if (element.fieldName && element.fieldValue) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }

            let count = await addressTable.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            addressTable.getAddressList(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        }
        catch (err) {
            console.log("err", err);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getUserAddressList: async (req, res) => {
        try {
            let user = req.user;

            addressTable.getUserAddress(user._id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata.length === 0) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', []));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userAddAddress: async (req, res) => {
        try {
            let data = req.body;
            const user = req.user;
            data.user = user._id;

            if (!data.address) {
                return res.json(helper.showValidationErrorResponse('LOCATION_IS_REQUIRED'));
            }

            if (!data.addressLocation) {
                return res.json(helper.showValidationErrorResponse('LOCATION_LAT_LNG_IS_REQUIRED'));
            }

            data.addressLocation = { type: "Point", coordinates: [data.addressLocation.lng, data.addressLocation.lat] };

            if (!data.area) {
                return res.json(helper.showValidationErrorResponse('AREA_IS_REQUIRED'));
            }

            // if (!data.houseNo) {
            //     return res.json(helper.showValidationErrorResponse('HOUSE_NO_IS_REQUIRED'));
            // }

            // if (!data.landmark) {
            //     return res.json(helper.showValidationErrorResponse('LANDMARK_IS_REQUIRED'));
            // }

            if (!data.addressType) {
                return res.json(helper.showValidationErrorResponse('ADDRESS_TYPE_IS_REQUIRED'));
            }

            if (data.default) {
                var updateDefaultFlase = await addressTable.updateOthertAddressFalse(data);
            } else {
                data.default = false
            }

            addressTable.addAddress(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userAddAddressByAdmin: async (req, res) => {
        try {
            let data = req.body;

            if (!data.user) {
                return res.json(helper.showValidationErrorResponse('USER_ID_IS_REQUIRED'));
            }

            if (!data.address) {
                return res.json(helper.showValidationErrorResponse('LOCATION_IS_REQUIRED'));
            }

            if (!data.addressLocation) {
                return res.json(helper.showValidationErrorResponse('LOCATION_LAT_LNG_IS_REQUIRED'));
            }

            data.addressLocation = { type: "Point", coordinates: [data.addressLocation.lng, data.addressLocation.lat] };

            if (!data.area) {
                return res.json(helper.showValidationErrorResponse('AREA_IS_REQUIRED'));
            }

            // if (!data.houseNo) {
            //     return res.json(helper.showValidationErrorResponse('HOUSE_NO_IS_REQUIRED'));
            // }

            // if (!data.landmark) {
            //     return res.json(helper.showValidationErrorResponse('LANDMARK_IS_REQUIRED'));
            // }

            if (!data.addressType) {
                return res.json(helper.showValidationErrorResponse('ADDRESS_TYPE_IS_REQUIRED'));
            }

            addressTable.addAddress(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userGetAddressDetails: async (req, res) => {
        try {
            var addressId = req.params._id;

            if (!addressId) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            addressTable.getAddressById(addressId, (err, resdata) => {
                if (err || resdata === null) {
                    res.json(helper.showSuccessResponse('NO_DATA_FOUND', []));
                } else {
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });

        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userUpdateAddress: async (req, res) => {
        try {
            let data = req.body;

            if (!data.user) {
                const user = req.user;
                data.user = user._id;
            }

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!data.address) {
                return res.json(helper.showValidationErrorResponse('LOCATION_IS_REQUIRED'));
            }

            if (!data.addressLocation) {
                return res.json(helper.showValidationErrorResponse('LOCATION_LAT_LNG_IS_REQUIRED'));
            }

            data.addressLocation = { type: "Point", coordinates: [data.addressLocation.lng, data.addressLocation.lat] };

            if (!data.area) {
                return res.json(helper.showValidationErrorResponse('AREA_IS_REQUIRED'));
            }

            // if (!data.houseNo) {
            //     return res.json(helper.showValidationErrorResponse('HOUSE_NO_IS_REQUIRED'));
            // }

            // if (!data.landmark) {
            //     return res.json(helper.showValidationErrorResponse('LANDMARK_IS_REQUIRED'));
            // }

            if (!data.addressType) {
                return res.json(helper.showValidationErrorResponse('ADDRESS_TYPE_IS_REQUIRED'));
            }

            var getAddressDetails = await addressTable.getAddressByIdAsync(data._id);

            if (getAddressDetails == null) {
                return res.json(helper.showValidationErrorResponse('ADDRESS_IS_NOT_VALID'));
            }

            if (data.default) {
                var updateDefaultFlase = await addressTable.updateOthertAddressFalse(data);
            } else {
                data.default = false
            }

            addressTable.updateAddress(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_UPDATED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userUpdateDefaultAddress: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data.user = user._id;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            var updateDefaultFlase = await addressTable.updateOthertAddressFalse(data);
            var updateDefault = await addressTable.updateDefaultTrue(data);

            res.json(helper.showSuccessResponse('DATA_UPDATED_SUCCESS', updateDefault));

        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userRemoveAddress: async (req, res) => {
        try {
            var data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            addressTable.removeAddress(data._id, (err, resdata) => {
                if (err || resdata == null) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });

        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}