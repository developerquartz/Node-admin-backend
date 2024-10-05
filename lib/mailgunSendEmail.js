const request = require('request')
const path = require('path')
const fs = require('fs');

module.exports.sendEmail = function (mailgunKey, to, sub, msg, attachmentFile) {
  try {
    let from = env.mailgun.MAILGUN_FROM;
    let api_key = env.mailgun.MAILGUN_API_KEY;
    let domain = env.mailgun.MAILGUN_DOMAIN;
    let invalidmailgun = false
    for (i in mailgunKey) {
      if (!mailgunKey[i] || mailgunKey[i] == "null" || mailgunKey[i] == "undefined") {
        invalidmailgun = true
        break;
      }
    }
    if (mailgunKey != undefined && mailgunKey != {} && !invalidmailgun) {
      from = mailgunKey.MAILGUN_FROM;
      api_key = mailgunKey.MAILGUN_API_KEY;
      domain = mailgunKey.MAILGUN_DOMAIN;
    }

    const mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

    let data = {
      from: from,
      to: to,
      subject: sub,
      html: `<div class="es-wrapper-color" style="background-color: #f2f4f6;">${msg}</div>`
    };
    if (attachmentFile) {
      data.attachment = new mailgun.Attachment(attachmentFile)
    }
    mailgun.messages().send(data, function (error, body) {
      if (error) {
        console.log('Mail gun error', error);
        return true;
      } else {
        console.log('Mail gun send mesg success', body);
        return true;
      }
    });
  } catch (error) {
    console.log("sendEmail err", error);
  }
}

module.exports.sendSupportEmail = function (mailgunKey, to, sub, msg) {

  let from = env.mailgun.MAILGUN_FROM;
  let api_key = env.mailgun.MAILGUN_API_KEY;
  let domain = env.mailgun.MAILGUN_DOMAIN;

  if (mailgunKey != undefined && mailgunKey != {}) {
    from = mailgunKey.MAILGUN_FROM ? mailgunKey.MAILGUN_FROM : env.mailgun.MAILGUN_FROM;
    api_key = mailgunKey.MAILGUN_API_KEY ? mailgunKey.MAILGUN_API_KEY : env.mailgun.MAILGUN_API_KEY;
    domain = mailgunKey.MAILGUN_DOMAIN ? mailgunKey.MAILGUN_DOMAIN : env.mailgun.MAILGUN_DOMAIN;
  }

  const mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

  let data = {
    from: from,
    to: to,
    subject: sub,
    html: msg
  };

  mailgun.messages().send(data, function (error, body) {
    if (error) {
      console.log('Mail gun error', error);
      return true;
    } else {
      console.log('Mail gun send mesg success', body);
      return true;
    }
  });

}

module.exports.sendEmailToSuperadmin = function (to, sub, msg) {

  let from = env.mailgun.MAILGUN_FROM;
  let api_key = env.mailgun.MAILGUN_API_KEY;
  let domain = env.mailgun.MAILGUN_DOMAIN;

  const mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

  let data = {
    from: from,
    to: to,
    subject: sub,
    html: msg
  };

  mailgun.messages().send(data, function (error, body) {
    if (error) {
      console.log('Mail gun error', error);
      return true;
    } else {
      console.log('Mail gun send mesg success', body);
      return true;
    }
  });

}
module.exports.sendEmailWithAttachment = function (mailgunKey, to, sub, msg, file, filename) {
  try {
    let from = env.mailgun.MAILGUN_FROM;
    let api_key = env.mailgun.MAILGUN_API_KEY;
    let domain = env.mailgun.MAILGUN_DOMAIN;

    if (mailgunKey != undefined && mailgunKey != {}) {
      from = mailgunKey.MAILGUN_FROM;
      api_key = mailgunKey.MAILGUN_API_KEY;
      domain = mailgunKey.MAILGUN_DOMAIN;
    }

    const mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

    var attch = new mailgun.Attachment({ data: Buffer.from(file), filename: filename, contentType: "text/csv" });

    let data = {
      from: from,
      to: to,
      subject: sub,
      html: `<div cattchlass="es-wrapper-color" style="background-color: #f2f4f6;">${msg}</div>`,
      attachment: attch
    };
    console.log("mailgun data :", data);

    mailgun.messages().send(data, function (error, body) {
      if (error) {
        console.log('Mail gun error', error);
        return true;
      } else {
        console.log('Mail gun send mesg success', body);
        return true;
      }
    });
  } catch (error) {
    console.log("catch error :", error);

  }
}