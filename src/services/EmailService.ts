import * as nodemailer from "nodemailer";
import * as fs from "fs";
import * as path from "path";

require("dotenv").config();

const RETRYABLE_CODES = ["ETIMEDOUT", "ECONNECTION", "ESOCKET"];
const MAX_ATTEMPTS = 3;

const createTransporter = () => nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  auth: {
    type: "OAuth2",
    user: process.env.SMTP_USER,
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN,
    accessToken: process.env.OAUTH_ACCESS_TOKEN
  },
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const sendWithRetry = async (mailOptions: any) => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await createTransporter().sendMail(mailOptions);
    } catch (error: any) {
      const isRetryable = RETRYABLE_CODES.includes(error?.code);
      if (!isRetryable || attempt === MAX_ATTEMPTS) throw error;
      await sleep(1000 * attempt);
    }
  }
};

const getEmailTemplate = (templateName: string, variables: any) => {
  const templatePath = path.join(__dirname, "..", "email_templates", `${templateName}.html`);
  
  try {
    let template = fs.readFileSync(templatePath, "utf8");
    
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, "g");
      template = template.replace(regex, variables[key]);
    });
    
    return template;
  } catch (error) {
    console.error(`Error reading template ${templateName}:`, error);
  }
}

export const send = async (obj: { action: string; recipient: string; additional: any; }) => {
  const basic_info = {
    to: obj.recipient,
    from: process.env.SENDER,
  };
  
  const templateName = obj.action;

  const variables = {
    name: obj.additional.name,
    event_title: obj.additional.event_title,
    link: obj.additional.link,
  };

  const htmlContent = getEmailTemplate(templateName, variables);

  const mailOptions = {
    ...basic_info,
    subject: getEmailSubject(obj.action),
    html: htmlContent,
  };

  return sendWithRetry(mailOptions);
}

const getEmailSubject = (action: string) => {
  switch (action) {
    case "email_verified":
      return "Email Verification";
    case "reset_password":
      return "Password Reset";
    case "register_approved":
      return "Registration Approved";
    case "invitation_sent":
      return "Event Invitation";
    case "meeting_started":
      return "Meeting Started";
    case "meeting_ended":
      return "Meeting Ended";
  }
}
