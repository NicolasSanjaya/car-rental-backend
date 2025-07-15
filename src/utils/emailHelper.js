// utils/emailHelper.js
const transporter = require("../config/mailer");
require("dotenv").config();

// Pindahkan template email ke sini
const createConfirmationEmailTemplate = (data) => {
  // ... isi template HTML
  return `... HTML Confirmation Email ...`;
};

const createResetPasswordEmailTemplate = (resetUrl) => {
  return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, copy and paste the following link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
          </p>
        </div>
      `;
};

const createContactEmailTemplate = (data) => {
  const serviceTypes = {
    rental: "Car Rental Inquiry",
    support: "Customer Support",
    feedback: "Feedback",
    other: "Other",
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contact Form Submission</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #ef4444;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          background-color: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 5px 5px;
        }
        .field {
          margin-bottom: 15px;
          padding: 10px;
          background-color: white;
          border-radius: 5px;
          border-left: 4px solid #ef4444;
        }
        .field-label {
          font-weight: bold;
          color: #ef4444;
          margin-bottom: 5px;
        }
        .field-value {
          color: #333;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>New Contact Form Submission</h1>
        <p>CarRental Website</p>
      </div>
      
      <div class="content">
        <div class="field">
          <div class="field-label">Name:</div>
          <div class="field-value">${data.name}</div>
        </div>
        
        <div class="field">
          <div class="field-label">Email:</div>
          <div class="field-value">${data.email}</div>
        </div>
        
        <div class="field">
          <div class="field-label">Phone:</div>
          <div class="field-value">${data.phone}</div>
        </div>
        
        <div class="field">
          <div class="field-label">Service Type:</div>
          <div class="field-value">${serviceTypes[data.serviceType]}</div>
        </div>
        
        <div class="field">
          <div class="field-label">Subject:</div>
          <div class="field-value">${data.subject}</div>
        </div>
        
        <div class="field">
          <div class="field-label">Message:</div>
          <div class="field-value">${data.message}</div>
        </div>
        
        <div class="field">
          <div class="field-label">Submitted:</div>
          <div class="field-value">${new Date().toLocaleString()}</div>
        </div>
      </div>
      
      <div class="footer">
        <p>This email was sent from the CarRental website contact form.</p>
        <p>Please reply directly to the customer's email: ${data.email}</p>
      </div>
    </body>
    </html>
  `;
};

const sendEmail = async (mailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = {
  sendEmail,
  createConfirmationEmailTemplate,
  createResetPasswordEmailTemplate,
  createContactEmailTemplate,
};
