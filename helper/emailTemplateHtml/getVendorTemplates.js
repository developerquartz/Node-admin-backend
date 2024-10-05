const templateLogo = require("./getTemplateLogo")
const templateFooter = require("./getTemplateFooter")
const { appStoreImageUrl, googlePlayImageUrl } = require("../../config/constants.json")

const template = (greating, body, extra_row = "") => {
    let html = `
    <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0">
      <tbody>
          <tr>
              <td valign="top" style="padding-top: 00px; padding-bottom: 25px;">
                  ${templateLogo}
  
                  <table align="center" cellpadding="0" cellspacing="0">
                  <tbody>
                      <tr>
                          <td align="center" bgcolor="transparent" style="background-color: transparent;">
                          <table align="center" bgcolor="transparent" cellpadding="0" cellspacing="0" class="es-content-body" style="background-color: transparent;" width="600">
                              <tbody>
                                  <tr>
                                      <td align="left" bgcolor="#ffffff" style="background-color: #ffffff;">
                                      <table cellpadding="0" cellspacing="0" width="100%">
                                          <tbody>
                                              <tr>
                                                  <td align="left" bgcolor="#ffffff" style="padding: 0 50px;">
                                                  <h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;"><b>${greating}</b></h1>
                                                  </td>
                                              </tr>
                                              <tr>
                                                  <td align="left" bgcolor="#ffffff">
                                                  <p style="line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:9px;">${body}</p>
                                                  </td>
                                              </tr>
                                              <tr>
                                                  <td align="left" bgcolor="#ffffff">
                                                  <p style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:0 px;line-height:24px;">${extra_row ? extra_row : `If you have any question, feel free to <a style="color:#00b388;font-weight:600;" href="[storeDomain]/contactus">contact us</a>&nbsp;(We are lighting quick at replying.)`}<br />
                                                  <br />
                                                  Thanks You !<br />
                                                  [storeName]</p>
                                                  <!--<p style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:15px;line-height:24px;margin-top:20px">
                                                                                          Thanks,<br>
                                            <strong>Hypercloud</strong>
                                            </p>--><!--<p
                                                                                          style="margin-top:20px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-bottom:40px;">
                                                                                          P.S. Need immediate help
                                                                                          getting started? Check out
                                                                                          our<a href="#"
                                                                                              style="color:#00b388;font-weight:600;">Need
                                                                                              Help</a></p>--></td>
                                              </tr>
                                          </tbody>
                                      </table>
                                      </td>
                                  </tr>
                              </tbody>
                          </table>
                          </td>
                      </tr>
                  </tbody>
              </table>
              </td>
          </tr>
      </tbody>
    </table>
    `

    html += templateFooter

    return html;
}

module.exports.productTemplate = () => {
    return `
    <table style="width:100%;border-bottom:1px solid #e6e6e6;padding-bottom:20px;">
    <tbody>
        <tr>
            <td width="15%"><img height="60" src="[productImage]" width="60"></td>

            <td width="65%">
            <h4 style="text-align:left;line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #000; font-size: 14px; line-height: 22px;margin-top:0px;margin-bottom:5px;">[productName] x [productQuantity]</h4>

            <p style="margin-bottom:00px;line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 14px; margin-top:0px; padding-bottom:00px;">[productAddons]</p>
            </td>
            <td width="20%">
            <p style="text-align:right;line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; margin-top:0px;font-weight:700;">[currency] [productCost]</p>
            </td>
        </tr>
    </tbody>
    </table>
    `
}
module.exports.pdfproductTemplate = () => {
    return `
        <tr>
            <td style="padding: 15px 0; border-bottom: 1px solid #ddd; font-size: 12px">
            <h6 style="margin: 0;font-size: 12px;font-weight: 600;color: #495057;padding-bottom: 2px">[productName]</h6>
            <h4 style="margin: 0;color: #74788d;font-weight: 500;font-size: 12px;">[currency] [productCost] x [productQuantity]</h4>
            <p style="margin: 0;font-size: 12px;color: #74788d;padding-top: 12px;">Addon: [productAddons]</p>
            </td>
        </tr>`
}

module.exports.getSignupTemplate = () => {
    let body = template(
        "Congratulations [vendorName] !",
        "You have been registered as vendor on [storeName], Welcome to Unlimited range of selling options on cloud."
    )

    let restrictions = [
        "[logo]",
        "[storeName]",
        "[vendorName]",
        "[storeDomain]",
    ]

    return { restrictions, body }
}

module.exports.getResetPasswordTemplate = () => {
    let body = template(
        "Dear [vendorName],",
        "Password of your vendor account on [storeName] has been reset successfully.",
        `If you did not requested to reset your password please <a style="color:#00b388;font-weight:600;" href="[storeDomain]/contactus">contact us</a> immediately.`
    )

    let restrictions = [
        "[logo]",
        "[vendorName]",
        "[storeName]",
        "[storeDomain]",
    ]

    return { restrictions, body }
}

module.exports.getChangePasswordTemplate = () => {
    let body = template(
        "Dear [vendorName],",
        "Password of your Driver Account on [storeName] has been changed successfully.",
        `If you did not changed your password please <a style="color:#00b388;font-weight:600;" href="[storeDomain]/contactus">contact us</a> immediately.`
    )

    let restrictions = [
        "[logo]",
        "[vendorName]",
        "[storeName]",
        "[storeDomain]",
    ]

    return { restrictions, body }
}

module.exports.getForgotPasswordTemplate = () => {
    let body = template(
        "Dear [vendorName],",
        "Here is the OTP to recover your password : [OTP], We highly recommend do not share your otp to anyone.<br /><br />If you did not requested for the OTP please ignore this email."
    )

    let restrictions = [
        "[logo]",
        "[vendorName]",
        "[OTP]",
        "[storeDomain]",
    ]

    return { restrictions, body }
}

module.exports.getOrderVendorTemplate = () => {
    let body = ""

    body += `<table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0">
    <tbody>
    <tr>
    <td valign="top" style="padding-top: 00px; padding-bottom: 25px;">
        ${templateLogo}

        <table align="center" cellpadding="0" cellspacing="0">
            <tbody>
            <tr>
            <td align="center" bgcolor="transparent" style="background-color: transparent;">
            <table align="center" bgcolor="transparent" cellpadding="0" cellspacing="0" class="es-content-body" style="background-color: transparent;" width="600">
            <tbody>
            </tbody>
            <tr>
            <td align="left" bgcolor="#ffffff" style="background-color: #ffffff;">
            <table cellpadding="0" cellspacing="0" width="100%">
            <tbody>
                <tr>
                    <td align="left" bgcolor="#ffffff" style="padding: 0 50px;">
                        <h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;"><b>Hey [vendorName] , You have an order received from [storeName] Here are your order details: </b></h1>
                    </td>
                </tr>

                <tr>
												<td align="left" bgcolor="#ffffff" style="padding: 0 50px;">
												<h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;"><b>Order Summary:</b></h1>
												</td>
											</tr>

                                            <tr>
												<td align="left" bgcolor="#fff" style="padding: 0 50px;">
												<h3 style="font-size: 17px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 10px;margin-bottom: 8px; background:#f2f4f6;padding:10px 17px;line-height:30px;">Order No.:<span style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 10px;font-size:15px; font-weight:600;">[orderNumber]</span><br>
												Order placed at:<span style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 10px;font-size:15px;font-weight:600;">[orderPlacedAt]</span><br style="font-size: 17px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 10px;margin-bottom: 8px; background:#f2f4f6;padding:10px 17px;line-height:30px;">
												Order status:<span style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 10px;font-size:15px;font-weight:600;">[orderStatus]</span></h3>
												</td>
											</tr>

                                            <tr>
												<td align="left" bgcolor="#ffffff" style="padding: 0 50px;">
												<h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;"><b>Order from:</b></h1>
												</td>
											</tr>

                                            <tr>
												<td align="left" bgcolor="#fff" style="padding: 0 50px;">
												<h3 style="font-size: 17px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 10px;margin-bottom: 8px; background:#f2f4f6;padding:10px 17px;line-height:30px;">Store Name, Adress:<span style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 10px;font-size:15px;font-weight:600;">[storeName], [storeAddress]</span><br>
												Deliverd To:<span style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 10px;font-size:15px;font-weight:600;">[customerName], [customerAddress]</span></h3>
												</td>
											</tr>
                <tr>
                    <td align="left" bgcolor="#ffffff" style="padding: 0 50px;">
                        <h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;"><b>Product Details:</b></h1>
                    
                        [products]
                    </td>
                </tr>

                <tr>
				<td align="right" bgcolor="#ffffff" style="padding: 0 50px;">
					<table style="width:65%;margin-top:20px;margin-bottom:5px;">
					<tbody>
                        <tr>
                            <td>
                            <h4 style="text-align:left;line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; line-height: 22px;margin-top:0px;margin-bottom:5px;font-weight:600;">Product Total</h4>
                            </td>
                            <td>
                            <p style="padding-left:9px;text-align:right;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; margin-top:0px;font-weight:700;margin-bottom:0px;">[currency][productTotal]</p>
                            </td>
                        </tr>
                        <tr>
                            <td>
                            <h4 style="text-align:left;line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; line-height: 22px;margin-top:0px;margin-bottom:5px;font-weight:600;">Tax and Fees [tax]%</h4>
                            </td>
                            <td>
                            <p style="padding-left:9px;text-align:right;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; margin-top:0px;font-weight:700;margin-bottom:0px;">[currency][taxAmount]</p>
                            </td>
                        </tr>
                        <tr>
                            <td>
                            <h4 style="text-align:left;line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; line-height: 22px;margin-top:0px;margin-bottom:5px;font-weight:600;">Tip [tip]%</h4>
                            </td>
                            <td>
                            <p style="padding-left:9px;text-align:right;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; margin-top:0px;font-weight:700;margin-bottom:0px;">[currency][tipAmount]</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="border-bottom:1px solid #e6e6e6;">
                            <h4 style="text-align:left;line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; line-height: 22px;margin-top:0px;margin-bottom:5px;font-weight:600;">Delivery Fee</h4>
                            </td>
                            <td style="border-bottom:1px solid #e6e6e6;">
                            <p style="padding-left:9px;text-align:right;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; margin-top:0px;font-weight:700;margin-bottom:0px;">[currency][deliveryFee]</p>
                            </td>
                        </tr>
                        <tr>
                            <td>
                            <h4 style="text-align:left;line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; line-height: 22px;margin-top:0px;margin-bottom:5px;font-weight:600;">Order Amount</h4>
                            </td>
                            <td>
                            <p style="padding-left:9px;text-align:right;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; margin-top:0px;font-weight:700;margin-bottom:0px;">[currency][orderAmount]</p>
                            </td>
                        </tr>
					</tbody>
					</table>
				</td>
				</tr>
            </tbody>
            </table>

            <table cellpadding="0" cellspacing="0" width="100%">
            <tbody>
                <tr>
                    <td align="left" bgcolor="#ffffff">
                    <p style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:0 px;line-height:24px;">${`If you have any question, feel free to <a style="color:#00b388;font-weight:600;" href="[storeDomain]/contactus">contact us</a>&nbsp;(We are lighting quick at replying.)`}<br />
                    <br />
                    Thanks You !<br />
                    [storeName]</p>
                    <!--<p style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:15px;line-height:24px;margin-top:20px">
                                                            Thanks,<br>
              <strong>Hypercloud</strong>
              </p>--><!--<p
                                                            style="margin-top:20px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-bottom:40px;">
                                                            P.S. Need immediate help
                                                            getting started? Check out
                                                            our<a href="#"
                                                                style="color:#00b388;font-weight:600;">Need
                                                                Help</a></p>--></td>
                </tr>
            </tbody>
        </table>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </tbody>
        </table>
    </td>
    </tr>
    </tbody>
  </table>
  `

    body += templateFooter

    let restrictions = [
        "[logo]",
        "[vendorName]",
        "[storeName]",
        "[orderNumber]",
        "[orderPlacedAt]",
        "[orderStatus]",
        "[storeAddress]",
        "[customerName]",
        "[customerAddress]",
        "[products]",
        "[currency]",
        "[productTotal]",
        "[tax]",
        "[taxAmount]",
        "[deliveryFee]",
        "[orderAmount]"
    ]

    return { restrictions, body }
}
module.exports.getSlipTemplate = () => {
    let body = ""
    body += `<table style="
      max-width: 700px;
      margin: 0 auto;
      border: 1px solid #ddd;
      width: 100%;
      border-radius: 5px;
      padding: 8px;
      font-size: 12px !important;
      ">
        <thead>
            <tr>
                <th colspan="2" style="
               text-align: left;
               padding: 15px;
               font-size: 12px !important;
               color: #898989;
               font-weight: 300;
               border-bottom: 1px solid #ddd;
               ">
                    Order Id : [customOrderId]
                </th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="width: 65%">
                    <table style="width: 100%; padding-right: 10px; padding-top: 10px">
                        <thead>
                            <tr style="text-align: left; padding: 15px">
                                <th colspan="2" style="
                           color: #495057;
                           padding: 15px;
                           font-weight: 700;
                           border-bottom: 1px solid #ddd;
                           padding-left: 0;
                           width: 5%;
                           ">
                                    Products
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                [products]
                            </tr>
                        </tbody>
                    </table>
                </td>
                <td style="vertical-align: text-bottom">
                    <table style="width: 100%; padding-left: 10px; padding-top: 10px">
                        <thead>
                            <tr style="text-align: left; padding: 15px">
                                <th colspan="2" style="
                           color: #495057;
                           padding: 15px 0;
                           font-weight: 600;
                           border-bottom: 1px solid #ddd;
                           ">
                                    Bill
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 15px 0; border-bottom: 1px solid #ddd">
                                    <h6 style="
                              margin: 0;
                              font-size: 12px !important;
                              font-weight: 600;
                              color: #74788d;
                              padding-bottom: 2px;
                              ">
                                        Product Total
                                    </h6>
                                </td>
                                <td style="
                           text-align: right;
                           vertical-align: text-bottom;
                           padding: 15px 0;
                           color: #74788d;
                           font-size: 12px !important;
                           border-bottom: 1px solid #ddd;
                           ">
                                    [currency][productTotal]
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 15px 0; border-bottom: 1px solid #ddd">
                                    <h6 style="
                              margin: 0;
                              font-size: 12px !important;
                              font-weight: 600;
                              color: #74788d;
                              padding-bottom: 2px;
                              ">
                                        Tax and Fees [tax]%
                                    </h6>
                                </td>
                                <td style="
                           text-align: right;
                           vertical-align: text-bottom;
                           padding: 15px 0;
                           color: #74788d;
                           font-size: 12px !important;
                           border-bottom: 1px solid #ddd;
                           ">
                                    [currency][taxAmount]
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 15px 0; border-bottom: 1px solid #ddd">
                                    <h6 style="
                                                          margin: 0;
                                                          font-size: 12px !important;
                                                          font-weight: 600;
                                                          color: #74788d;
                                                          padding-bottom: 2px;
                                                          ">
                                        Delivery Fee
                                    </h6>
                                </td>
                                <td style="
                                                       text-align: right;
                                                       vertical-align: text-bottom;
                                                       padding: 15px 0;
                                                       color: #74788d;
                                                       font-size: 12px !important;
                                                       border-bottom: 1px solid #ddd;
                                                       ">
                                    [currency][deliveryFee]
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 15px 0">
                                    <h6 style="
                              margin: 0;
                              font-size: 12px !important;
                              font-weight: 600;
                              color: #74788d;
                              padding-bottom: 2px;
                              ">
                                        Order Amount
                                    </h6>
                                </td>
                                <td style="
                           text-align: right;
                           vertical-align: text-bottom;
                           padding: 15px 0;
                           color: #74788d;
                           font-size: 12px !important;
                           ">
                                    [currency][orderAmount]
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="vertical-align: text-bottom">
                    <table style="
                  width: 100%; /* padding-left: 10px; */ /* padding-top: 10px; */
                  ">
                        <thead>
                            <tr style="text-align: left; padding: 15px">
                                <th colspan="2" style="
                           color: #495057;
                           padding: 15px 0;
                           font-weight: 600;
                           border-bottom: 1px solid #ddd;
                           ">
                                    Customer Details
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 15px 0; border-bottom: 1px solid #ddd">
                                    <h6 style="
                              margin: 0;
                              font-size: 12px !important;
                              font-weight: 500;
                              color: #74788d;
                              padding-bottom: 2px;
                              ">
                                        Full Name
                                    </h6>
                                </td>
                                <td style="
                           vertical-align: text-bottom;
                           padding: 15px 0;
                           color: #74788d;
                           font-size: 12px !important;
                           border-bottom: 1px solid #ddd;
                           font-weight: 600;
                           ">
                                    [customerName]
                                </td>
                            </tr>
                            <!-- <tr>
                                <td style="padding: 15px 0; border-bottom: 1px solid #ddd">
                                    <h6 style="
                              margin: 0;
                              font-size: 12px !important;
                              font-weight: 500;
                              color: #74788d;
                              padding-bottom: 2px;
                              ">
                                        Mobile Number
                                    </h6>
                                </td>
                                <td style="
                           vertical-align: text-bottom;
                           padding: 15px 0;
                           color: #2e328b;
                           font-size: 12px !important;
                           border-bottom: 1px solid #ddd;
                           font-weight: 600;
                           ">
                                    [mobileNumber]
                                </td>
                            </tr> -->
                            <!-- <tr>
                                <td style="padding: 15px 0; border-bottom: 1px solid #ddd">
                                    <h6 style="
                              margin: 0;
                              font-size: 12px !important;
                              font-weight: 500;
                              color: #74788d;
                              padding-bottom: 2px;
                              ">
                                        Email
                                    </h6>
                                </td>
                                <td style="
                           vertical-align: text-bottom;
                           padding: 15px 0;
                           color: #74788d;
                           font-size: 12px !important;
                           border-bottom: 1px solid #ddd;
                           font-weight: 600;
                           ">
                                    [email]
                                </td>
                            </tr> -->
                            <tr>
                                <td style="padding: 15px 0; border-bottom: 1px solid #ddd">
                                    <h6 style="
                              margin: 0;
                              font-size: 12px !important;
                              font-weight: 500;
                              color: #74788d;
                              padding-bottom: 2px;
                              ">
                                        Address
                                    </h6>
                                </td>
                                <td style="
                           vertical-align: text-bottom;
                           padding: 15px 0;
                           color: #74788d;
                           font-size: 12px !important;
                           border-bottom: 1px solid #ddd;
                           font-weight: 600;
                           ">
                                    [address]
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 15px 0; border-bottom: 1px solid #ddd">
                                    <h6 style="
                              margin: 0;
                              font-size: 12px !important;
                              font-weight: 500;
                              color: #74788d;
                              padding-bottom: 2px;
                              ">
                                        Area
                                    </h6>
                                </td>
                                <td style="
                           vertical-align: text-bottom;
                           padding: 15px 0;
                           color: #74788d;
                           font-size: 12px !important;
                           border-bottom: 1px solid #ddd;
                           font-weight: 600;
                           ">
                                    [area]
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 15px 0; border-bottom: 1px solid #ddd">
                                    <h6 style="
                              margin: 0;
                              font-size: 12px !important;
                              font-weight: 500;
                              color: #74788d;
                              padding-bottom: 2px;
                              ">
                                        House No
                                    </h6>
                                </td>
                                <td style="
                           vertical-align: text-bottom;
                           padding: 15px 0;
                           color: #74788d;
                           font-size: 12px !important;
                           border-bottom: 1px solid #ddd;
                           font-weight: 600;
                           ">
                                    [houseNo]
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 15px 0">
                                    <h6 style="
                              margin: 0;
                              font-size: 12px !important;
                              font-weight: 500;
                              color: #74788d;
                              padding-bottom: 2px;
                              ">
                                        Landmark
                                    </h6>
                                </td>
                                <td style="
                           vertical-align: text-bottom;
                           padding: 15px 0;
                           color: #74788d;
                           font-size: 12px !important;
                           font-weight: 600;
                           ">
                                    [landmark]
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>`

    return body
}
