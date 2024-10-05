const express = require('express');
const router = express.Router();
const Auth = require('./middleware/auth');
const plans = require('./controller/planController');
const subscription = require('./controller/subscriptionController');
const { addAndUpdatePlan, IdValidation, updateStatus } = require('./validation/validation');

/*                                -------Subscription Plan API---------                            */
router.post('/plan', Auth.authAdminAndStaff, plans.viewPlansWithFilter);
router.post('/plan/add', Auth.authAdminAndStaff, addAndUpdatePlan, plans.addPlan);
router.get('/plan/view/:_id', Auth.authAdminAndStaff, IdValidation, plans.viewPlan);
router.post('/plan/update', Auth.authAdminAndStaff, addAndUpdatePlan, plans.updatePlan);
router.get('/plan/remove/:_id', Auth.authAdminAndStaff, IdValidation, plans.removePlan);
router.post('/plan/updateStatus/all', Auth.authAdminAndStaff, updateStatus, plans.updateStatusAll);

/*                                -------Subscription subscribed API---------                            */
router.post('/user/plans', Auth.authUser, subscription.addSubscription);


module.exports = router;