const templateLogo = require("./getTemplateLogo")
const templateFooter = require("./getTemplateFooter")
const { appStoreImageUrl, googlePlayImageUrl } = require("../../config/constants.json")

module.exports.getApproveDriverTemplate = () => {
    let body = ""

    body += `
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
												<h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;"><b>Dear [driverName],</b></h1>
												</td>
											</tr>
											<tr>
												<td align="left" bgcolor="#ffffff">
												<p style="line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:9px;">We are glad to inform you that your application&nbsp;[storeName] Driver Account&nbsp; has been approved &amp; Activated.</p>
												</td>
											</tr>
											<tr>
												<td align="left" bgcolor="#ffffff">
												<p style="line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;display: flex; align-items: center; margin: 20px 0;"><b>Get your Driver App Here :</b> <a href="[driverIOSAppUrl]" style="color:#00b388;font-weight:600; margin-left: 5px; margin-right: 5px;"><img src="${appStoreImageUrl}" height="30px"></a> <a href="[driverAndroidAppUrl]"><img src="${googlePlayImageUrl}" height="30px"></a></p>
												</td>
											</tr>
											<tr>
												<td align="left" bgcolor="#ffffff">
												<p style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:0 px;line-height:24px;">If you have any question, feel free to <a style="color:#00b388;font-weight:600;" href="[storeDomain]/contactus">contact us</a>&nbsp;(We are lighting quick at replying.)<br />
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

    body += templateFooter

    let restrictions = [
        "[logo]",
        "[storeName]",
        "[driverName]",
        "[driverAndroidAppUrl]",
        "[driverIOSAppUrl]",
        "[storeDomain]",
    ]

    return { restrictions, body }
}

module.exports.getRejectDriverTemplate = () => {
    let body = ""

    body += `
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
                                          <h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;"><b>Dear [driverName],</b></h1>
                                          </td>
                                      </tr>
                                      <tr>
                                          <td align="left" bgcolor="#ffffff" style="padding: 0 50px;">
                                          <p style="line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 14px; line-height: 22px;margin-top:9px;">We have reviewed your application&nbsp;for&nbsp;[storeName] Driver Account, This is to inform you that your account has been rejected, Kindly re-apply with new scan copies of the documents, We will be looking forward to have you onboard, Have a Great day !<br />
                                          &nbsp;</p>
                                          </td>
                                      </tr>
                                      <tr>
                                          <td align="left" bgcolor="#ffffff">
                                          <p style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:0 px;line-height:24px;">If you have any question, feel free to <a style="color:#00b388;font-weight:600;" href="[storeDomain]/contactus">contact us</a>&nbsp;(We are lighting quick at replying.)<br />
                                          <br />
                                          Thank You !<br />
                                          [storeName]</p>
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
        "[driverName]",
        "[storeName]",
        "[storeDomain]",
    ]

    return { restrictions, body }
}

module.exports.getPayToDriverTemplate = () => {
    let body = ""

    body += `
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
                                          <h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;"><b>Dear [driverName],</b></h1>
                                          </td>
                                      </tr>
                                      <tr>
                                          <td align="left" bgcolor="#ffffff" style="padding: 0 50px;">
                                          <p style="line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif; color: #505068; font-size: 14px; line-height: 22px;margin-top:9px;">The payment of amount [amount] has been processed successfully this will be credited to your provided bank account within 3-4 business working days. !<br />
                                          &nbsp;</p>
                                          </td>
                                      </tr>
                                      <tr>
                                          <td align="left" bgcolor="#ffffff">
                                          <p style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:0 px;line-height:24px;">If you have any question, feel free to <a style="color:#00b388;font-weight:600;" href="[storeDomain]/contactus">contact us</a>&nbsp;(We are lighting quick at replying.)<br />
                                          <br />
                                          Thank You !<br />
                                          [storeName]</p>
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
        "[driverName]",
        "[amount]",
        "[storeDomain]",
    ]

    return { restrictions, body }
}

module.exports.getApproveVendorTemplate = () => {
    let body = ""

    body += `
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
												<h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;"><b>Dear [vendorName],</b></h1>
												</td>
											</tr>
											<tr>
												<td align="left" bgcolor="#ffffff">
												<p style="line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:9px;">We are glad to inform you that your application [storeName] Vendor Account  has been approved & Activated.</p>
												</td>
											</tr>
											<tr>
												<td align="left" bgcolor="#ffffff">
												<p style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:0 px;line-height:24px;">If you have any question, feel free to <a style="color:#00b388;font-weight:600;" href="[storeDomain]/contactus">contact us</a>&nbsp;(We are lighting quick at replying.)<br />
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

    body += templateFooter

    let restrictions = [
        "[logo]",
        "[vendorName]",
        "[storeName]",
        "[storeDomain]",
    ]

    return { restrictions, body }
}

module.exports.getRejectVendorTemplate = () => {
    let body = ""

    body += `
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
												<h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;"><b>Dear [vendorName],</b></h1>
												</td>
											</tr>
											<tr>
												<td align="left" bgcolor="#ffffff">
												<p style="line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:9px;">We have reviewed your application for [storeName] Vendor Account, This is to inform you that your account has been rejected, Kindly re-apply with new scan copies of the Documents, We will be looking forward to have you onboard, Have a Great day !</p>
												</td>
											</tr>
											<tr>
												<td align="left" bgcolor="#ffffff">
												<p style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:0 px;line-height:24px;">If you have any question, feel free to <a style="color:#00b388;font-weight:600;" href="[storeDomain]/contactus">contact us</a>&nbsp;(We are lighting quick at replying.)<br />
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

    body += templateFooter

    let restrictions = [
        "[logo]",
        "[vendorName]",
        "[storeName]",
        "[storeDomain]",
    ]

    return { restrictions, body }
}

module.exports.getPayToVendorTemplate = () => {
    let body = ""

    body += `
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
												<h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;"><b>Dear [vendorName],</b></h1>
												</td>
											</tr>
											<tr>
												<td align="left" bgcolor="#ffffff">
												<p style="line-height:24px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:9px;">The payment of amount [amount] has been processed successfully this will be credited to your provided bank account within 3-4 business working days. </p>
												</td>
											</tr>
											<tr>
												<td align="left" bgcolor="#ffffff">
												<p style="font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;padding: 0 50px;font-size:14px;margin-top:0 px;line-height:24px;">If you have any question, feel free to <a style="color:#00b388;font-weight:600;" href="[storeDomain]/contactus">contact us</a>&nbsp;(We are lighting quick at replying.)<br />
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

    body += templateFooter

    let restrictions = [
        "[logo]",
        "[vendorName]",
        "[amount]",
        "[storeDomain]",
    ]

    return { restrictions, body }
}

module.exports.getSignupTemplate = () => {
    let body = ""

    body += `
  `

    let restrictions = []

    return { restrictions, body }
}

module.exports.getResetPasswordTemplate = () => {
    let body = ""

    body += `
  `

    let restrictions = []

    return { restrictions, body }
}

module.exports.getChangePasswordTemplate = () => {
    let body = ""

    body += `
  `

    let restrictions = []

    return { restrictions, body }
}

module.exports.getOrderConfTemplate = () => {
    let body = ""

    body += `
  `

    let restrictions = []

    return { restrictions, body }
}

module.exports.getOrderCompletionTemplate = () => {
    let body = ""

    body += `
  `

    let restrictions = []

    return { restrictions, body }
}

module.exports.getOrderRefundTemplate = () => {
    let body = ""

    body += `
  `

    let restrictions = []

    return { restrictions, body }
}
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
                                                  <br />
                                                  Thanks You !<br />
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
    
    return html;
}
module.exports.disputeCreateTemplate = () => {
    let body = template(
        "Dear, [adminName]",
        `Dispute has been created on order no. [orderNumber] for [type]`
    )

    let restrictions = [
        "[logo]",
        "[adminName]",
        "[orderNumber]",
        "[type]",
    ]

    return { restrictions, body }
}

module.exports.OncreateNewOrder = () =>{
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
                        <h1 style="font-size: 16px;font-family: 'open sans', 'helvetica neue', helvetica, arial, sans-serif;color: #505068;margin-top: 25px;margin-bottom: 0px;"><b>Hey [storeName] , You have an order received. Here are your order details: </b></h1>
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



