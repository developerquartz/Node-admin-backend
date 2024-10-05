const express = require('express');
const router = express.Router();
const Auth = require('../../middleware/auth');
const menuController = require('./controller/menuController');
const { addMenu, menuIdValidation, updateMenu, updateStatus } = require('./validation/menuValidation')

router.post('/', Auth.authAdmin, menuController.getMenuListWithFilter);
router.post('/add', Auth.authAdmin, addMenu, menuController.addMenuData);
router.get('/view/:_id', Auth.authAdmin, menuIdValidation, menuController.getMenuDetailsById);
router.post('/update', Auth.authAdmin, updateMenu, menuController.updateMenuData);
router.get('/remove/:_id', Auth.authAdmin, menuIdValidation, menuController.removeMenuData);

router.post('/updateStatus/all', Auth.authAdmin, updateStatus, menuController.updateStatus);

const { addMenuItems, menuItemIdValidation, updateMenuItem, archiveItems } = require('./validation/menuItemsValidation')

router.post('/items', Auth.authAdmin, menuController.getMenuItemsListWithFilter);
router.post('/item/add', Auth.authAdmin, addMenuItems, menuController.addMenuItems);
router.post('/item/edit', Auth.authAdmin, updateMenuItem, menuController.updateMenuItemData);
router.get('/item/view/:_id', Auth.authAdmin, menuItemIdValidation, menuController.getMenuItemByMenuItemId);
router.get('/item/remove/:_id', Auth.authAdmin, menuItemIdValidation, menuController.removeMenuItemData);
router.get('/item/archive/:_id', Auth.authAdmin, menuItemIdValidation, menuController.archiveMenuItemData);
router.post('/item/archiveItems', Auth.authAdmin, archiveItems, menuController.deleteMenuItemsData);

router.post('/item/sortOrder', Auth.authAdmin, menuController.sortOrder);



module.exports = router;