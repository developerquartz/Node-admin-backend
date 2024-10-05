const { getCustomerTemplatesHtml, getAdminTemplatesHtml, getDriverTemplatesHtml, getVendorTemplatesHtml } = require('./emailTemplateHtml')

let getCustomerTemplates = async (storeId, user) => {
    let customerTemplates = [];

    //signup template
    const _signupTemplate = getCustomerTemplatesHtml.getSignupTemplate()
    let signupTemplate = {
        store: storeId,
        user: user,
        title: "Customer Sign Up",
        description: 'Send to customer when Sign Up',
        subject: "[storeName] Registration",
        body: _signupTemplate.body,
        type: "customers",
        date_created_utc: new Date(),
        constant: "USER_REGISTER",
        required: false,
        restrictions: _signupTemplate.restrictions,
        status: "active"
    }

    customerTemplates.push(signupTemplate);

    //reset password template
    const _resetPasswordTemplate = getCustomerTemplatesHtml.getResetPasswordTemplate()
    let resetPasswordTemplate = {
        store: storeId,
        user: user,
        title: "Customer Reset Password",
        description: 'Send to customer when Reset Password',
        subject: "[storeName] Reset Password",
        body: _resetPasswordTemplate.body,
        type: "customers",
        date_created_utc: new Date(),
        constant: "USER_RESET_PASSWORD",
        required: false,
        restrictions: _resetPasswordTemplate.restrictions,
        status: "active"
    }

    customerTemplates.push(resetPasswordTemplate);

    //change password template
    const _changePasswordTemplate = getCustomerTemplatesHtml.getChangePasswordTemplate()
    let changePasswordTemplate = {
        store: storeId,
        user: user,
        title: "Customer Change Password",
        description: 'Send to customer when Change Password',
        subject: "[storeName] Customer Account Password Changed",
        body: _changePasswordTemplate.body,
        type: "customers",
        date_created_utc: new Date(),
        constant: "USER_CHANGE_PASSWORD",
        required: false,
        restrictions: _changePasswordTemplate.restrictions,
        status: "active"
    }

    customerTemplates.push(changePasswordTemplate);

    //order confirmation template
    const _orderConfTemplate = getCustomerTemplatesHtml.getOrderConfTemplate()
    let orderConfTemplate = {
        store: storeId,
        user: user,
        title: "Order Confirmation",
        description: 'Send order confirmation to customer',
        subject: "[storeName] Order confirmation",
        body: _orderConfTemplate.body,
        type: "customers",
        date_created_utc: new Date(),
        constant: "ORDER_CONFIRMATION",
        required: true,
        restrictions: _orderConfTemplate.restrictions,
        status: "active"
    }

    customerTemplates.push(orderConfTemplate);

    //order completion template
    const _orderCompletionTemplate = getCustomerTemplatesHtml.getOrderCompletionTemplate()
    let orderCompletionTemplate = {
        store: storeId,
        user: user,
        title: "Order Delivered",
        description: 'Send after order delivered successfully to customer',
        subject: "[storeName]: Order Delivered Successfully",
        body: _orderCompletionTemplate.body,
        type: "customers",
        date_created_utc: new Date(),
        constant: "ORDER_DELIVERED",
        required: true,
        restrictions: _orderCompletionTemplate.restrictions,
        status: "active"
    }

    customerTemplates.push(orderCompletionTemplate);

    /*Trip completion template*/

    const _tripCompletionTemplate = getCustomerTemplatesHtml.getTripCompletionTemplate()
    let tripCompletionTemplate = {
        store: storeId,
        user: user,
        title: "Trip Completed",
        description: 'Send after trip completed successfully to customer',
        subject: "[storeName]: Trip Completed Successfully",
        body: _tripCompletionTemplate.body,
        type: "customers",
        date_created_utc: new Date(),
        constant: "TRIP_COMPLETED_CUSTOMER",
        required: true,
        restrictions: _tripCompletionTemplate.restrictions,
        status: "active"
    }

    customerTemplates.push(tripCompletionTemplate);

    //order refund template
    const _orderRefundTemplate = getCustomerTemplatesHtml.getOrderRefundTemplate()
    let orderRefundTemplate = {
        store: storeId,
        user: user,
        title: "Order Refund",
        description: 'Send to customer',
        subject: "[storeName]: Order Refund Successfully",
        body: _orderRefundTemplate.body,
        type: "customers",
        date_created_utc: new Date(),
        constant: "ORDER_REFUNDED",
        required: true,
        restrictions: _orderRefundTemplate.restrictions,
        status: "active"
    }

    customerTemplates.push(orderRefundTemplate);

    return customerTemplates;
}

let getDriverTemplates = async (storeId, user) => {

    let driverTemplates = [];

    //signup template
    const _signupTemplate = getDriverTemplatesHtml.getSignupTemplate()
    let signupTemplate = {
        store: storeId,
        user: user,
        title: "Driver Sign Up",
        description: 'Send to Driver when Sign Up',
        subject: "[storeName] Driver Account Registration",
        body: _signupTemplate.body,
        type: "drivers",
        date_created_utc: new Date(),
        constant: "DRIVER_REGISTER",
        required: false,
        restrictions: _signupTemplate.restrictions,
        status: "active"
    }

    driverTemplates.push(signupTemplate);

    //reset password template
    const _resetPasswordTemplate = getDriverTemplatesHtml.getResetPasswordTemplate()
    let resetPasswordTemplate = {
        store: storeId,
        user: user,
        title: "Driver Reset Password",
        description: 'Send to Driver when Reset Password',
        subject: "[storeName] Reset Password",
        body: _resetPasswordTemplate.body,
        type: "drivers",
        date_created_utc: new Date(),
        constant: "DRIVER_RESET_PASSWORD",
        required: false,
        restrictions: _resetPasswordTemplate.restrictions,
        status: "active"
    }

    driverTemplates.push(resetPasswordTemplate);

    //forgot password template
    const _forgotPasswordTemplate = getDriverTemplatesHtml.getForgotPasswordTemplate()
    let forgotPasswordTemplate = {
        store: storeId,
        user: user,
        title: "Driver Forgot Password OTP",
        description: 'Send Forgot password OTP',
        subject: "[storeName] Forgot Password OTP",
        body: _forgotPasswordTemplate.body,
        type: "drivers",
        date_created_utc: new Date(),
        constant: "DRIVER_FORGOT_PASSWORD_OTP",
        required: true,
        restrictions: _forgotPasswordTemplate.restrictions,
        status: "active"
    }

    driverTemplates.push(forgotPasswordTemplate);

    //change password template
    const _changePasswordTemplate = getDriverTemplatesHtml.getChangePasswordTemplate()
    let changePasswordTemplate = {
        store: storeId,
        user: user,
        title: "Driver Change Password",
        description: 'Send to Driver when Change Password',
        subject: "[storeName] Driver Account Password Changed",
        body: _changePasswordTemplate.body,
        type: "drivers",
        date_created_utc: new Date(),
        constant: "DRIVER_CHANGE_PASSWORD",
        required: false,
        restrictions: _changePasswordTemplate.restrictions,
        status: "active"
    }

    driverTemplates.push(changePasswordTemplate);


    /*Trip completion template*/

    const _tripCompletionTemplate = getDriverTemplatesHtml.getTripCompletionTemplate()
    let tripCompletionTemplate = {
        store: storeId,
        user: user,
        title: "Trip Completed",
        description: 'Send after trip completed successfully to driver',
        subject: "[storeName]: Trip Completed Successfully",
        body: _tripCompletionTemplate.body,
        type: "drivers",
        date_created_utc: new Date(),
        constant: "TRIP_COMPLETED_DRIVER",
        required: true,
        restrictions: _tripCompletionTemplate.restrictions,
        status: "active"
    }

    driverTemplates.push(tripCompletionTemplate);

    return driverTemplates;
}

let getVendorTemplates = async (storeId, user) => {

    let vendorTemplates = [];

    //signup template
    const _signupTemplate = getVendorTemplatesHtml.getSignupTemplate()
    let signupTemplate = {
        store: storeId,
        user: user,
        title: "Vendor Sign Up",
        description: 'Send to Vendor when Sign Up',
        subject: "[storeName]  Vendor Account Registration",
        body: _signupTemplate.body,
        type: "vendors",
        date_created_utc: new Date(),
        constant: "VENDOR_REGISTER",
        required: false,
        restrictions: _signupTemplate.restrictions,
        status: "active"
    }

    vendorTemplates.push(signupTemplate);

    //reset password template
    const _resetPasswordTemplate = getVendorTemplatesHtml.getResetPasswordTemplate()
    let resetPasswordTemplate = {
        store: storeId,
        user: user,
        title: "Vendor Reset Password",
        description: 'Send to Vendor when Reset Password',
        subject: "[storeName] Reset Password",
        body: _resetPasswordTemplate.body,
        type: "vendors",
        date_created_utc: new Date(),
        constant: "VENDOR_RESET_PASSWORD",
        required: false,
        restrictions: _resetPasswordTemplate.restrictions,
        status: "active"
    }

    vendorTemplates.push(resetPasswordTemplate);

    //forgot password template
    const _forgotPasswordTemplate = getVendorTemplatesHtml.getForgotPasswordTemplate()
    let forgotPasswordTemplate = {
        store: storeId,
        user: user,
        title: "Vendor Forgot Password OTP",
        description: 'Send Forgot password OTP',
        subject: "[storeName] Forgot Password OTP",
        body: _forgotPasswordTemplate.body,
        type: "vendors",
        date_created_utc: new Date(),
        constant: "VENDOR_FORGOT_PASSWORD_OTP",
        required: true,
        restrictions: _forgotPasswordTemplate.restrictions,
        status: "active"
    }

    vendorTemplates.push(forgotPasswordTemplate);

    //change password template
    const _changePasswordTemplate = getVendorTemplatesHtml.getChangePasswordTemplate()
    let changePasswordTemplate = {
        store: storeId,
        user: user,
        title: "Vendor Change Password",
        description: 'Send to Vendor when Change Password',
        subject: "[storeName] Driver Account Password Changed",
        body: _changePasswordTemplate.body,
        type: "vendors",
        date_created_utc: new Date(),
        constant: "VENDOR_CHANGE_PASSWORD",
        required: false,
        restrictions: _changePasswordTemplate.restrictions,
        status: "active"
    }

    vendorTemplates.push(changePasswordTemplate);

    //vendor order recieved template
    const _orderVendorTemplate = getVendorTemplatesHtml.getOrderVendorTemplate()
    let orderVendorTemplate = {
        store: storeId,
        user: user,
        title: "New Order",
        description: 'Send to Vendor, when new order created by customer',
        subject: "[storeName]: New Order received",
        body: _orderVendorTemplate.body,
        type: "vendors",
        date_created_utc: new Date(),
        constant: "VENDOR_ORDER_RECIEVED",
        required: false,
        restrictions: _orderVendorTemplate.restrictions,
        status: "active"
    }

    vendorTemplates.push(orderVendorTemplate);

    return vendorTemplates;
}

let singleVendorOrderTemplate = (storeId, user) => {

    let vendorTemplates = [];

    //vendor order recieved template
    const _orderVendorTemplate = getVendorTemplatesHtml.getOrderVendorTemplate()
    let orderVendorTemplate = {
        store: storeId,
        user: user,
        title: "New Order",
        description: 'Recieved, when new order created by customer',
        subject: "[storeName]: New Order received",
        body: _orderVendorTemplate.body,
        type: "admin",
        date_created_utc: new Date(),
        constant: "VENDOR_ORDER_RECIEVED",
        required: false,
        restrictions: _orderVendorTemplate.restrictions,
        status: "active"
    }

    vendorTemplates.push(orderVendorTemplate);

    const _forgotPasswordTemplate = getVendorTemplatesHtml.getForgotPasswordTemplate()
    let forgotPasswordTemplate = {
        store: storeId,
        user: user,
        title: "Forgot Password OTP",
        description: 'Send Forgot password OTP',
        subject: "[storeName] Forgot Password OTP",
        body: _forgotPasswordTemplate.body,
        type: "admin",
        date_created_utc: new Date(),
        constant: "VENDOR_FORGOT_PASSWORD_OTP",
        required: true,
        restrictions: _forgotPasswordTemplate.restrictions,
        status: "active"
    }
    vendorTemplates.push(forgotPasswordTemplate);

    return vendorTemplates;
}

let getAdminTemplates = async (storeId, user) => {

    let adminTemplates = [];

    //admin approve driver template
    const _approveDriverTemplate = getAdminTemplatesHtml.getApproveDriverTemplate()
    let adminApproveDriverTemplate = {
        store: storeId,
        user: user,
        title: "Admin Approve Driver",
        description: 'Send to Driver, when admin Approved',
        subject: "[storeName]: Driver Account Approved",
        body: _approveDriverTemplate.body,
        type: "admin",
        date_created_utc: new Date(),
        constant: "ADMIN_APPROVE_DRIVER",
        required: true,
        restrictions: _approveDriverTemplate.restrictions,
        status: "active"
    }

    adminTemplates.push(adminApproveDriverTemplate);

    //admin reject driver template
    const _rejectDriverTemplate = getAdminTemplatesHtml.getRejectDriverTemplate()
    let adminRejectDriverTemplate = {
        store: storeId,
        user: user,
        title: "Admin Reject Driver",
        description: 'Send to Driver, when admin Rejected',
        subject: "[storeName]: Account Status",
        body: _rejectDriverTemplate.body,
        type: "admin",
        date_created_utc: new Date(),
        constant: "ADMIN_REJECT_DRIVER",
        required: true,
        restrictions: _rejectDriverTemplate.restrictions,
        status: "active"
    }

    adminTemplates.push(adminRejectDriverTemplate);

    //admin pay to driver template
    const _payToDriverTemplate = getAdminTemplatesHtml.getPayToDriverTemplate()
    let adminPayToDriverTemplate = {
        store: storeId,
        user: user,
        title: "Admin Pay To Driver",
        description: 'Send to Driver, when admin pay',
        subject: "[storeName]: Payment Recieved",
        body: _payToDriverTemplate.body,
        type: "admin",
        date_created_utc: new Date(),
        constant: "ADMIN_PAY_DRIVER",
        required: true,
        restrictions: _payToDriverTemplate.restrictions,
        status: "active"
    }

    adminTemplates.push(adminPayToDriverTemplate);

    //admin approve vendor template
    const _approveVendorTemplate = getAdminTemplatesHtml.getApproveVendorTemplate()
    let adminApproveVendorTemplate = {
        store: storeId,
        user: user,
        title: "Admin Approve Vendor",
        description: 'Send to Vendor, when admin Approved',
        subject: "[storeName]: Vendor Account Approved",
        body: _approveVendorTemplate.body,
        type: "admin",
        date_created_utc: new Date(),
        constant: "ADMIN_APPROVE_VENDOR",
        required: true,
        restrictions: _approveVendorTemplate.restrictions,
        status: "active"
    }

    adminTemplates.push(adminApproveVendorTemplate);

    //admin reject vendor template
    const _rejectVendorTemplate = getAdminTemplatesHtml.getRejectVendorTemplate()
    let adminRejectVendorTemplate = {
        store: storeId,
        user: user,
        title: "Admin Reject Vendor",
        description: 'Send to Vendor, when admin Reject',
        subject: "[storeName]: Vendor Account Rejected",
        body: _rejectVendorTemplate.body,
        type: "admin",
        date_created_utc: new Date(),
        constant: "ADMIN_REJECT_VENDOR",
        required: true,
        restrictions: _rejectVendorTemplate.restrictions,
        status: "active"
    }

    adminTemplates.push(adminRejectVendorTemplate);

    //admin pay to vendor template
    const _payToVendorTemplate = getAdminTemplatesHtml.getPayToVendorTemplate()
    let adminPayToVendorTemplate = {
        store: storeId,
        user: user,
        title: "Admin Pay To Vendor",
        description: 'Send to Vendor, when admin pay',
        subject: "[storeName]: Payment Received",
        body: _payToVendorTemplate.body,
        type: "admin",
        date_created_utc: new Date(),
        constant: "ADMIN_PAY_VENDOR",
        required: true,
        restrictions: _payToVendorTemplate.restrictions,
        status: "active"
    }

    adminTemplates.push(adminPayToVendorTemplate);

    //admin getdispute email
    const _createDisputeTemplate = getAdminTemplatesHtml.disputeCreateTemplate()
    let admingetDisputeTemplate = {
        store: storeId,
        user: user,
        title: "New Dispute",
        description: 'Send to admin, when user create dispute',
        subject: "[customerName]: has created dispute",
        body: _createDisputeTemplate.body,
        type: "admin",
        date_created_utc: new Date(),
        constant: "NEW_DISPUTE",
        required: true,
        restrictions: _createDisputeTemplate.restrictions,
        status: "active"
    }

    adminTemplates.push(admingetDisputeTemplate);

    //on new order create template
    const _createNeworderTemplate = getAdminTemplatesHtml.OncreateNewOrder()
    let adminnewOrderTemplate = {
        store: storeId,
        user: user,
        title: "New Order",
        description: 'Send to Admin, when new order created by customer',
        subject: "[storeName]: New Order received",
        body: _createNeworderTemplate.body,
        type: "admin",
        date_created_utc: new Date(),
        constant: "ADMIN_ORDER_RECIEVED",
        required: false,
        restrictions: _createNeworderTemplate.restrictions,
        status: "active"
    }

    adminTemplates.push(adminnewOrderTemplate);

    return adminTemplates;
}

let getOrderTemplates = (storeId, user) => {

    let orderTemplates = [];

    //order confirmation template
    const _orderConfTemplate = getCustomerTemplatesHtml.getOrderConfTemplate()
    let orderConfTemplate = {
        store: storeId,
        user: user,
        title: "Order Confirmation",
        description: 'Send order confirmation to customer',
        subject: "[storeName] Order confirmation",
        body: _orderConfTemplate.body,
        type: "orders",
        date_created_utc: new Date(),
        constant: "ORDER_CONFIRMATION",
        required: true,
        restrictions: _orderConfTemplate.restrictions,
        status: "active"
    }

    orderTemplates.push(orderConfTemplate);

    //order completion template
    const _orderCompletionTemplate = getCustomerTemplatesHtml.getOrderCompletionTemplate()
    let orderCompletionTemplate = {
        store: storeId,
        user: user,
        title: "Order Delivered",
        description: 'Send after order delivered successfully to customer',
        subject: "[storeName]: Order Delivered Successfully",
        body: _orderCompletionTemplate.body,
        type: "orders",
        date_created_utc: new Date(),
        constant: "ORDER_DELIVERED",
        required: true,
        restrictions: _orderCompletionTemplate.restrictions,
        status: "active"
    }

    orderTemplates.push(orderCompletionTemplate);

    //order refund template
    const _orderRefundTemplate = getCustomerTemplatesHtml.getOrderRefundTemplate()
    let orderRefundTemplate = {
        store: storeId,
        user: user,
        title: "Order Refund",
        description: 'Send to customer',
        subject: "[storeName]: Order Refund Successfully",
        body: _orderRefundTemplate.body,
        type: "orders",
        date_created_utc: new Date(),
        constant: "ORDER_REFUNDED",
        required: true,
        restrictions: _orderRefundTemplate.restrictions,
        status: "active"
    }

    orderTemplates.push(orderRefundTemplate);

    //vendor order recieved template
    const _orderVendorTemplate = getVendorTemplatesHtml.getOrderVendorTemplate()
    let orderVendorTemplate = {
        store: storeId,
        user: user,
        title: "New Order",
        description: 'Send to Vendor, when new order created by customer',
        subject: "[storeName]: New Order",
        body: _orderVendorTemplate.body,
        type: "orders",
        date_created_utc: new Date(),
        constant: "VENDOR_ORDER_RECIEVED",
        required: false,
        restrictions: _orderVendorTemplate.restrictions,
        status: "active"
    }

    orderTemplates.push(orderVendorTemplate);

    return orderTemplates;
}

let getDefaultTemplate = (constant) => {

    let template = { body: '', restrictions: [] };

    switch (constant) {
        case 'USER_REGISTER':
            template = getCustomerTemplatesHtml.getSignupTemplate();
            break;
        case 'USER_RESET_PASSWORD':
            template = getCustomerTemplatesHtml.getResetPasswordTemplate();
            break;
        case 'USER_CHANGE_PASSWORD':
            template = getCustomerTemplatesHtml.getChangePasswordTemplate();
            break;
        case 'ORDER_CONFIRMATION':
            template = getCustomerTemplatesHtml.getOrderConfTemplate();
            break;
        case 'ORDER_DELIVERED':
            template = getCustomerTemplatesHtml.getOrderCompletionTemplate();
            break;
        case 'ORDER_REFUNDED':
            template = getCustomerTemplatesHtml.getOrderRefundTemplate();
            break;
        case 'DRIVER_REGISTER':
            template = getDriverTemplatesHtml.getSignupTemplate();
            break;
        case 'DRIVER_RESET_PASSWORD':
            template = getDriverTemplatesHtml.getResetPasswordTemplate();
            break;
        case 'DRIVER_FORGOT_PASSWORD_OTP':
            template = getDriverTemplatesHtml.getForgotPasswordTemplate();
            break;
        case 'DRIVER_CHANGE_PASSWORD':
            template = getDriverTemplatesHtml.getChangePasswordTemplate();
            break;
        case 'VENDOR_REGISTER':
            template = getVendorTemplatesHtml.getSignupTemplate();
            break;
        case 'VENDOR_RESET_PASSWORD':
            template = getVendorTemplatesHtml.getResetPasswordTemplate();
            break;
        case 'VENDOR_FORGOT_PASSWORD_OTP':
            template = getVendorTemplatesHtml.getForgotPasswordTemplate();
            break;
        case 'VENDOR_CHANGE_PASSWORD':
            template = getVendorTemplatesHtml.getChangePasswordTemplate();
            break;
        case 'VENDOR_ORDER_RECIEVED':
            template = getVendorTemplatesHtml.getOrderVendorTemplate();
            break;
        case 'ADMIN_APPROVE_DRIVER':
            template = getAdminTemplatesHtml.getApproveDriverTemplate();
            break;
        case 'ADMIN_REJECT_DRIVER':
            template = getAdminTemplatesHtml.getRejectDriverTemplate();
            break;
        case 'ADMIN_PAY_DRIVER':
            template = getAdminTemplatesHtml.getPayToDriverTemplate();
            break;
        case 'ADMIN_APPROVE_VENDOR':
            template = getAdminTemplatesHtml.getApproveVendorTemplate();
            break;
        case 'ADMIN_REJECT_VENDOR':
            template = getAdminTemplatesHtml.getRejectVendorTemplate();
            break;
        case 'ADMIN_PAY_VENDOR':
            template = getAdminTemplatesHtml.getPayToVendorTemplate();
            break;
        default:
            break;
    }

    return template;
}

module.exports = {
    getCustomerTemplates,
    getDriverTemplates,
    getVendorTemplates,
    getAdminTemplates,
    getOrderTemplates,
    getDefaultTemplate,
    singleVendorOrderTemplate
}