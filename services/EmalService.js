const constants = require("../common/constants");
const functions = require("../common/functions");
const Model = require('../models/index');
const moment = require("moment");


const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.KEY);
const fromMail = process.env.EMAIL;


module.exports.send = async ({
   to,
   title,
   message
}) => {
   try {
      const msg = {
          to: to,
          from: fromMail,
          subject: title,
          html: message
      };
      const result = await sgMail.send(msg);

      console.log("EmailService", result);
   } catch (error) {
      console.error("EmailService", error);
   }
};

//Send email for verification code
exports.sendEmailVerification = async (payload) => {
   try {
      if (!payload.email) throw new Error(constants.MESSAGES.EMAIL_MISSING);
      let otp = functions.generateNumber(4);
      console.log('otp---------------------------------: ', otp);
      // let otp = 1234
      let payloadData = {
         to: payload.email,
         title: payload.title ? payload.title : "Verify your account",
         message: `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
            <html lang="en" xml:lang="en">
               <head>
                  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                  <title>OTP template</title>
                  <style type="text/css">
                     #outlook a {
                     padding: 0;
                     }
                     body {
                     width: 100% !important;
                     -webkit-text-size-adjust: 100%;
                     -ms-text-size-adjust: 100%;
                     margin: 0;
                     padding: 0;
                     }
                     /* force default font sizes */
                     .ExternalClass {
                     width: 100%;
                     }
                     .ExternalClass,
                     .ExternalClass p,
                     .ExternalClass span,
                     .ExternalClass font,
                     .ExternalClass td,
                     .ExternalClass div {
                     line-height: 100%;
                     }
                     /* Hotmail */
                     table td {
                     border-collapse: collapse;
                     }
                     @media only screen and (min-width: 600px) {
                     .maxW {
                     width: 600px !important;
                     }
                     }
                  </style>
               </head>
               <body style="margin: 0px; padding: 0px; -webkit-text-size-adjust:none; -ms-text-size-adjust:none;" leftmargin="0"
                  topmargin="0" marginwidth="0" marginheight="0" bgcolor="#f7f7f7">
                  <table bgcolor="#f7f7f7" width="100%" border="0" align="center" cellpadding="0" cellspacing="0">
                     <tr>
                        <td valign="top">
                           <!--[if (gte mso 9)|(IE)]>
                           <table width="600" align="center" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                 <td valign="top">
                                    <![endif]-->
                                    <table width="100%" class="maxW" style="max-width: 550px; margin: auto;height:100vh; " border="0"
                                       align="center" cellpadding="0" cellspacing="0">
                                       <tr>
                                          <td valign="middle" align="center">
                                             <table width="100%" border="0" cellpadding="0" cellspacing="0" style="padding:30px 0 ;"
                                                bgcolor="#fff">
                                                <tr>
                                                   <td align="center" valign="middle"
                                                      style="font-family: Verdana, Geneva, Helvetica, Arial, sans-serif; font-size: 24px; color: #353535; padding:3%; padding-top:30px; padding-bottom:15px;">
                                                      <img src="https://swiftstay.s3.us-east-2.amazonaws.com/1701793754344logo%20%281%29.png"
                                                         alt="logo" style="max-width:120px;">
                                                   </td>
                                                </tr>
                                                <tr>
                                                   <td align="center" valign="middle"
                                                      style="font-family: Verdana, Geneva, Helvetica, Arial, sans-serif;  color: #353535; padding:3%; padding-top:0px; padding-bottom:15px;">
                                                      <h1
                                                         style="color:#000; font-weight:700; margin:0;font-size:28px;font-family:'Rubik',sans-serif; margin-bottom:5px;">
                                                         Hi ${payload.name}
                                                      </h1>
                                                      <p style="font-size: 15px; margin-top:15px; ">Thank you for choosing Us. Please use the OTP below to sign-up.</p>
                                                   </td>
                                                </tr>
                                                <tr>
                                                   <td align="center" valign="middle"
                                                      style="font-family: Verdana, Geneva, Helvetica, Arial, sans-serif;  color: #353535; padding:3%; padding-top:0px; padding-bottom:15px;">
                                                      <p style="font-size: 20px; margin-top:0; font-weight:bold; color:#000;">${otp}
                                                      </p>
                                                   </td>
                                                </tr>
                                                <tr>
                                                <tr>
                                                   <!--              <td style="height:30px;">
                                                      </td> -->
                                                </tr>
                                                <tr>
                                                   <td style="text-align:center; padding:20px 0px 0px; border-top:1px solid #eaeaea; ">
                                                      <p
                                                         style="font-size:14px; color:rgba(69, 80, 86, 0.7411764705882353); line-height:18px; margin:0 0 0;">
                                                         ALL RIGHTS RESERVED 2023 © </strong> 
                                                      </p>
                                                   </td>
                                                </tr>
                                             </table>
                                          </td>
                                       </tr>
                                    </table>
                                    <!--[if (gte mso 9)|(IE)]>
                                 </td>
                              </tr>
                           </table>
                           <![endif]-->
                        </td>
                     </tr>
                  </table>
               </body>
            </html>`
      };
      await Model.Otp.deleteMany({
         email: payload.email.toLowerCase()
      });

      let data = {
         email: payload.email.toLowerCase(),
         otp: otp
      };
      await Model.Otp.create(data);

      await this.send(payloadData);
   } catch (error) {
      console.error("sendEmailVerification", error);
   }
};
//Send email for forgot password link
exports.sendForgotLink = async (payload) => {
   try {
      if (!payload.email) throw new Error(constants.MESSAGES.EMAIL_MISSING);
      let payloadData = {
         to: payload.email,
         title: "Reset Password",
         message: `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
            <html lang="en" xml:lang="en">
               <head>
                  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                  <title>OTP template</title>
                  <style type="text/css">
                     #outlook a {padding:0;}
                     body{width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; margin:0; padding:0;} /* force default font sizes */
                     .ExternalClass {width:100%;} .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {line-height: 100%;} /* Hotmail */
                     table td {border-collapse: collapse;}
                     @media only screen and (min-width: 600px) { .maxW { width:600px !important; } }
                  </style>
               </head>
               <body style="margin: 0px; padding: 0px; -webkit-text-size-adjust:none; -ms-text-size-adjust:none;" leftmargin="0" topmargin="0" marginwidth="0" marginheight="0" style="">
                  <table bgcolor="#f7f7f7" width="100%" border="0" align="center" cellpadding="0" cellspacing="0">
                     <tr>
                        <td valign="top">
                           <!--[if (gte mso 9)|(IE)]>
                           <table width="600" align="center" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                 <td valign="top">
                                    <![endif]-->
                                    <table width="100%" class="maxW" style="max-width: 550px; margin: auto;height:100vh; " border="0" align="center" cellpadding="0" cellspacing="0" bgcolor="#f7f7f7">
                                       <tr>
                                          <td valign="middle" align="center">
                                             <table width="100%" border="0" cellpadding="0" cellspacing="0" style="padding:30px 0 ;" bgcolor="#fff">
                                                <tr>
                                                   <td align="center" valign="middle" style="font-family: Verdana, Geneva, Helvetica, Arial, sans-serif; font-size: 24px; color: #353535; padding:3%; padding-top:30px; padding-bottom:15px;">
                                                      <img src="https://link-health-staff.s3.us-east-2.amazonaws.com/1701845956746OFsunMicrosoftTeams-image.png" alt="logo" style="max-width:150px;">
                                                   </td>
                                                </tr>
                                                <tr>
                                                   <td align="center" valign="middle" style="font-family: Verdana, Geneva, Helvetica, Arial, sans-serif;  color: #353535; padding:3%; padding-top:0px; padding-bottom:15px;">
                                                      <h1 style="color:#000; font-weight:700; margin:0;font-size:28px;font-family:'Rubik',sans-serif; margin-bottom:5px;"> Hi </h1>
                                                      <p style="font-size: 15px; margin-top:15px; ">You have requested us to send a link to reset your password for your account  </p>
                                                   </td>
                                                </tr>
                                                <tr>
                                                   <td align="center" valign="middle" style="font-family: Verdana, Geneva, Helvetica, Arial, sans-serif;  color: #353535; padding:3%; padding-top:0px; padding-bottom:15px;">
                                                   <a style="cursor: pointer;" href=${payload.link}><button style="background-color: #81d8d0;border:0;border-radius:7px; transition: background-color 0.3s; cursor: pointer; margin-top: 5px; padding: 11px 30px;  color:#000; font-weight:600;">Reset password</button></a>
                                                      <p style="font-size: 15px; margin-top:0;  ">If you didn't initiate this request, you can safely ignore this email  </p>
                                                   </td>
                                                </tr>
                                                <tr>
                                                <tr>
                                                   <!--              <td style="height:30px;">
                                                      </td> -->
                                                </tr>
                                                <tr>
                                                   <td style="text-align:center; padding:20px 0px 0; border-top:1px solid #eaeaea;">
                                                      <p style="font-size:14px; color:rgba(69, 80, 86, 0.7411764705882353); line-height:18px; margin:0 0 0;">ALL RIGHTS RESERVED ${moment().format("YYYY")} © </strong> </p>
                                                   </td>
                                                </tr>
                                             </table>
                                          </td>
                                       </tr>
                                    </table>
                                    <!--[if (gte mso 9)|(IE)]>
                                 </td>
                              </tr>
                           </table>
                           <![endif]-->
                        </td>
                     </tr>
                  </table>
               </body>
            </html>`
      };

      await this.send(payloadData);
   } catch (error) {
      console.error("sendEmailVerification", error);
   }
};
//Send email for invite password link
exports.sendInviteLink = async (payload) => {
   try {
      if (!payload.email) throw new Error(constants.MESSAGES.EMAIL_MISSING);
      let payloadData = {
         to: payload.email,
         title: "Set Password",
         message: `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
            <html lang="en" xml:lang="en">
               <head>
                  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                  <title>OTP template</title>
                  <style type="text/css">
                     #outlook a {padding:0;}
                     body{width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; margin:0; padding:0;} /* force default font sizes */
                     .ExternalClass {width:100%;} .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {line-height: 100%;} /* Hotmail */
                     table td {border-collapse: collapse;}
                     @media only screen and (min-width: 600px) { .maxW { width:600px !important; } }
                  </style>
               </head>
               <body style="margin: 0px; padding: 0px; -webkit-text-size-adjust:none; -ms-text-size-adjust:none;" leftmargin="0" topmargin="0" marginwidth="0" marginheight="0" style="">
                  <table bgcolor="#f7f7f7" width="100%" border="0" align="center" cellpadding="0" cellspacing="0">
                     <tr>
                        <td valign="top">
                           <!--[if (gte mso 9)|(IE)]>
                           <table width="600" align="center" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                 <td valign="top">
                                    <![endif]-->
                                    <table width="100%" class="maxW" style="max-width: 550px; margin: auto;height:100vh; " border="0" align="center" cellpadding="0" cellspacing="0" bgcolor="#f7f7f7">
                                       <tr>
                                          <td valign="middle" align="center">
                                             <table width="100%" border="0" cellpadding="0" cellspacing="0" style="padding:30px 0 ;" bgcolor="#fff">
                                                <tr>
                                                   <td align="center" valign="middle" style="font-family: Verdana, Geneva, Helvetica, Arial, sans-serif; font-size: 24px; color: #353535; padding:3%; padding-top:30px; padding-bottom:15px;">
                                                      <img src="https://link-health-staff.s3.us-east-2.amazonaws.com/1701845956746OFsunMicrosoftTeams-image.png" alt="logo" style="max-width:150px;">
                                                   </td>
                                                </tr>
                                                <tr>
                                                   <td align="center" valign="middle" style="font-family: Verdana, Geneva, Helvetica, Arial, sans-serif;  color: #353535; padding:3%; padding-top:0px; padding-bottom:15px;">
                                                      <h1 style="color:#000; font-weight:700; margin:0;font-size:28px;font-family:'Rubik',sans-serif; margin-bottom:5px;"> Hi ${payload.name}</h1>
                                                      <p style="font-size: 15px; margin-top:15px; ">You can set the password for your account using the following link</p>
                                                   </td>
                                                </tr>
                                                <tr>
                                                   <td align="center" valign="middle" style="font-family: Verdana, Geneva, Helvetica, Arial, sans-serif;  color: #353535; padding:3%; padding-top:0px; padding-bottom:15px;">
                                                   <a style="cursor: pointer;" href=${payload.link}> <button style="background-color: #81d8d0;border:0;border-radius:7px;cursor: pointer; margin-top: 5px; padding: 11px 30px;  color:#000; font-weight:600;">Set password</button></a>
                                                      <p style="font-size: 15px; margin-top:0;  ">If you didn't initiate this request, you can safely ignore this email  </p>
                                                   </td>
                                                </tr>
                                                <tr>
                                                <tr>
                                                   <!--              <td style="height:30px;">
                                                      </td> -->
                                                </tr>
                                                <tr>
                                                   <td style="text-align:center; padding:20px 0px 0; border-top:1px solid #eaeaea;">
                                                      <p style="font-size:14px; color:rgba(69, 80, 86, 0.7411764705882353); line-height:18px; margin:0 0 0;">ALL RIGHTS RESERVED ${moment().format("YYYY")} © </strong> </p>
                                                   </td>
                                                </tr>
                                             </table>
                                          </td>
                                       </tr>
                                    </table>
                                    <!--[if (gte mso 9)|(IE)]>
                                 </td>
                              </tr>
                           </table>
                           <![endif]-->
                        </td>
                     </tr>
                  </table>
               </body>
            </html>`
      };

      await this.send(payloadData);
   } catch (error) {
      console.error("sendEmailVerification", error);
   }
};