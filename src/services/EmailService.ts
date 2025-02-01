const sgMail = require("@sendgrid/mail");

require("dotenv").config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function send(obj: { action: string; recipient: string; additional: any; }) {
  const basic_info = {
    to: obj.recipient,
    from: process.env.SENDER,
  };
  let msg: any;

  if (obj.action === "register_approved") {
    msg = {
      ...basic_info,
      templateId: `${process.env.REGISTER_APPROVAL_TEMPLATE}`,
      dynamic_template_data: {
        name: obj.additional.name,
        event_title: obj.additional.event_title,
      },
    };
  } else if (obj.action === "invitation_sent") {
    msg = {
      ...basic_info,
      templateId: `${process.env.INVITATION_SENT_TEMPLATE}`,
      dynamic_template_data: {
        name: obj.additional.name,
        event_title: obj.additional.event_title,
      },
    };
  }

  return sgMail.send(msg);
}
