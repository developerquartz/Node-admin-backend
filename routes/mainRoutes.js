const moduleConfig = require('../config/moduleConfig');

module.exports = function (app) {
    // importing routes files for routes /////

    const store = require('./store');
    app.use('/authenticationservice/api/v1/store', store);

    const faq = require('./faq');
    app.use('/authenticationservice/api/v1/faq', faq);

    const promocode = require('./promocode');
    app.use('/authenticationservice/api/v1/promocode', promocode);

    const content = require('./content');
    app.use('/authenticationservice/api/v1/content', content);

    const pages = require('./pages');
    app.use('/authenticationservice/api/v1/pages', pages);

    const user = require('./user');
    app.use('/authenticationservice/api/v1/user', user);

    const vendor = require('./vendor');
    app.use('/authenticationservice/api/v1/vendor', vendor);

    const driver = require('./driver');
    app.use('/authenticationservice/api/v1/driver', driver);

    const scripts = require('./scripts');
    app.use('/authenticationservice/api/v1/script', scripts);

    const address = require('./address');
    app.use('/authenticationservice/api/v1/address', address);

    const card = require('./card');
    app.use('/authenticationservice/api/v1/card', card);

    const order = require('./order');
    app.use('/authenticationservice/api/v1/order', order);

    const setting = require('./setting');
    app.use('/authenticationservice/api/v1/setting', setting);

    const promotion = require('./promotion');
    app.use('/authenticationservice/api/v1/promotion', promotion);

    const category = require('./category');
    app.use('/authenticationservice/api/v1/category', category);

    const addon = require('./addon');
    app.use('/authenticationservice/api/v1/addon', addon);

    const cuisine = require('./cuisine');
    app.use('/authenticationservice/api/v1/cuisine', cuisine);

    const businessType = require('./businessType');
    app.use('/authenticationservice/api/v1/businessType', businessType);

    const product = require('./product');
    app.use('/authenticationservice/api/v1/product', product);

    const attribute = require('./attribute');
    app.use('/authenticationservice/api/v1/attribute', attribute);

    const attributeTerm = require('./attributeTerm');
    app.use('/authenticationservice/api/v1/term', attributeTerm);

    const file = require('./file');
    app.use('/authenticationservice/api/v1/file', file);

    const docTemplate = require('./docTemplate');
    app.use('/authenticationservice/api/v1/doctemplate', docTemplate);

    const superAdmin = require('./superAdmin')
    app.use('/authenticationservice/api/v1/super-admin', superAdmin);

    const terminology = require('./terminology');
    app.use('/authenticationservice/api/v1/terminology', terminology);

    moduleConfig.forEach(element => {
        if (element.status && element.route) {
            let path = require('../module/' + element.type);
            app.use('/authenticationservice/api/' + element.apiVersion + '/' + element.routeName, path);
        }
    });

};