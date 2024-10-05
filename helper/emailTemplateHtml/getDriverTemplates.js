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

module.exports.getSignupTemplate = () => {
    let body = template("Congratulations [driverName] !", "You have been resgistered as Driver&nbsp;on [storeName],<b> </b>Welcome&nbsp;to&nbsp;Unlimited range of earnings by delivering&nbsp;orders to customer`s&nbsp;doorstep .");

    let restrictions = [
        "[logo]",
        "[driverName]",
        "[storeName]",
        "[storeDomain]",
    ]

    return { restrictions, body }
}

module.exports.getForgotPasswordTemplate = () => {
    let body = template(
        "Dear [driverName],",
        `Here is the OTP to recover your password : [OTP], We highly recommend do not share your otp to anyone.<br /><br />If you did not requested for the OTP please ignore this email.`,
    )

    let restrictions = [
        "[logo]",
        "[driverName]",
        "[OTP]",
        "[storeDomain]",
    ]

    return { restrictions, body }
}

module.exports.getResetPasswordTemplate = () => {
    let body = template(
        "Dear [driverName],",
        "Password of your driver account on [storeName] has been reset successfully. ",
        `If you did not requested to reset your password please <a style="color:#00b388;font-weight:600;" href="[storeDomain]/contactus">contact us</a> immediately`
    )

    let restrictions = [
        "[logo]",
        "[driverName]",
        "[storeName]",
        "[storeDomain]",
    ]

    return { restrictions, body }
}

module.exports.getChangePasswordTemplate = () => {
    let body = template(
        "Dear [driverName],",
        "Password of your Driver Account on [storeName] has been changed successfully",
        `If you did not requested to reset your password please <a style="color:#00b388;font-weight:600;" href="[storeDomain]/contactus">contact us</a> immediately.`
    )

    let restrictions = [
        "[logo]",
        "[driverName]",
        "[storeName]",
        "[storeDomain]",
    ]

    return { restrictions, body }
}
module.exports.getTripCompletionTemplate = () => {
    let body = ""

    body += ` <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0">
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
                        <h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;"><b>Thanks for choosing [storeName], [customerName] ! </b></h1>
                    </td>
                </tr>

                <tr>
                                                <td align="left" bgcolor="#ffffff" style="padding: 0 50px;">
                                                <h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;">Your Trip [orderNumber] has been successfully completed&nbsp;</h1>
                                                </td>
                                            </tr>

                <tr>
                    <td align="left" bgcolor="#ffffff" style="padding: 0 50px;">
                        <h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;"><b>Trip Details:</b></h1>
                    </td>
                </tr>

                <tr>
                <td align="right" bgcolor="#ffffff" style="padding: 0 50px;">
                    <table style="width:85%;margin-top:20px;margin-bottom:5px;">
                    <tbody>
                    <tr>
															<td>
															<h4 style="text-align:left">Payment Mode</h4>
															</td>
															<td>
															<p style="text-align:right">[paymentMode]</p>
															</td>
														</tr>
                        <tr>
                            <td>
                            <h4 style="text-align:left;line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; line-height: 22px;margin-top:0px;margin-bottom:5px;font-weight:600;">Trip Fare</h4>
                            </td>
                            <td>
                            <p style="padding-left:9px;text-align:right;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; margin-top:0px;font-weight:700;margin-bottom:0px;">[currency][subTotal]</p>
                            </td>
                        </tr>
                       
                        <tr>
                            <td style="border-bottom:1px solid #e6e6e6;">
                            <h4 style="text-align:left;line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; line-height: 22px;margin-top:0px;margin-bottom:5px;font-weight:600;">Discount</h4>
                            </td>
                            <td style="border-bottom:1px solid #e6e6e6;">
                                <p style="padding-left:9px;text-align:right;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; margin-top:0px;font-weight:700;margin-bottom:0px;">[currency][discount]</p>
                            </td>
                        </tr>

                        <tr>
                            <td>
                            <h4 style="text-align:left;line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; line-height: 22px;margin-top:0px;margin-bottom:5px;font-weight:600;">Total</h4>
                            </td>
                            <td>
                            <p style="padding-left:9px;text-align:right;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 15px; margin-top:0px;font-weight:700;margin-bottom:0px;">[currency][orderTotal]</p>
                            </td>
                        </tr>
                    </tbody>
                    </table>
                </td>
                </tr>
                <tr>
                <td align="left" bgcolor="#fff" style="padding: 0 50px;">
                <h3 style="font-size: 17px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 10px;margin-bottom: 8px; background:#f2f4f6;padding:10px 17px;line-height:30px;">[message]<span style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 10px;font-size:15px;font-weight:600;text-transform: capitalize;">[driverName]</span></h3>
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

    let restrictions = [
        "[logo]",
        "[storeName]",
        "[orderNumber]",
        "[customerName]",
        "[customerAddress]",
        "[products]",
        "[currency]",
        "[productTotal]",
        "[tax]",
        "[taxAmount]",
        "[bookingFee]",
        "[subTotal]"
    ]

    return { restrictions, body }
}