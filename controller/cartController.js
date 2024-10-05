const cart = require('../models/cartTable.js');
const Product = require('../models/productsTable');
const { v4: uuidv4 } = require('uuid');

module.exports = {

    getCartList: async (req, res) => {
        try {
            let cart_key = req.params.cart_key;
            cart.getCartByKey(cart_key, (err, resdata) => {
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
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addcartData: async (req, res) => {
        try {
            let data = req.body;

            if (data.cart_key == null) {
                data.cart_key = uuidv4();
            }

            const getProduct = await Product.getProductByIdAsync(data.product);
            data.price = getProduct.price;
            data.name = getProduct.name;
            data.productImage = getProduct.featured_image.link;
            data.lineTotal = helper.roundNumber(data.price * data.quantity);

            cart.addcart(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getcartDetailsById: async (req, res) => {

        try {
            var cart_id = req.params._id;

            if (!cart_id) {
                return res.json(helper.showValidationErrorResponse('cart_ID_REQUIRED'));
            }

            cart.getcartById(cart_id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('cart_DETAIL', resdata));
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updatecartData: async (req, res) => {
        try {
            var data = req.body;

            if (!data.cartId) {
                return res.json(helper.showValidationErrorResponse('cart_ID_IS_REQUIRED'));
            }

            const getCart = await cart.getcartByIdAsync(data.cartId);

            const getProduct = await Product.getProductByIdAsync(getCart.product);
            data.price = getProduct.price;
            data.lineTotal = helper.roundNumber(data.price * data.quantity);

            cart.updatecart(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_UPDATED', resdata));
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    removecartData: async (req, res) => {
        try {
            var data = req.body;

            if (!data.cartId) {
                return res.json(helper.showValidationErrorResponse('cart_ID_IS_REQUIRED'));
            }

            cart.removecart(data.cartId, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DELETED_SUCCESS', resdata));
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}