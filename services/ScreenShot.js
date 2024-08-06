const Model = require('../models/index');
var html_to_pdf = require('html-pdf-node');
const aws = require("aws-sdk");

aws.config.update({
    secretAccessKey: process.env.AWS_SECRET,
    accessKeyId: process.env.AWS_KEY
});
var s3 = new aws.S3();


module.exports.screenShot = async (payload) => {
    let options = {
        format: 'A4',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    let file = {
        content: `<html>

        <body>
            <div style="height:95vh;justify-content: space-between;display: flex; flex-direction: column;">
                <div style="width: 70vw; padding:20px; max-width:70vw; position: relative; background: white; margin:0 auto;">
                    <div style="justify-content: space-between; align-items: center; gap: 16px; display: flex">
                        <div style="width: 159.28px; height: 31.80px; position: relative">
                            <img src="https://swiftstay.s3.us-east-2.amazonaws.com/1701793754344logo%20%281%29.png"
                                style="height: 100%;width: 100%;object-fit: cover;">
                        </div>
                        <div
                            style="text-align: right; color: #021A98; font-size: 20px; font-family: Circular Std; font-weight: 700; word-wrap: break-word">
                            Swiftstay Invoice</div>
                    </div>
                    <div style="margin-top:10px">
                        <p
                            style="margin:0; text-align: right; color: #262626; font-size: 14px; font-family: Circular Std; font-weight: 500; word-wrap: break-word">
                            ${payload.userName}</p>
                        <p
                            style="margin:0; text-align: right; color: #262626; font-size: 14px; font-family: Circular Std; font-weight: 500; word-wrap: break-word">
                            ${payload.dialCode}-${payload.phoneNo}</p>
                    </div>
                    <div
                        style="text-align: right; color: #262626; font-size: 16px; font-family: Circular Std; font-weight: 700; word-wrap: break-word; margin-top:20px">
                        Booking Details</div>
                    <div style="display: flex; margin-top:10px; width: 100%; justify-content:space-between">
                        <div style="flex-direction: column; gap: 5px; display: flex; max-width:50%;align-self: end;">
                            <p
                                style="margin:0; color: #262626; font-size: 14px; font-family: Circular Std; font-weight: 500; word-wrap: break-word">
                                Location detail: </p>
                            <p
                                style="margin:0; color: #262626; font-size: 14px; font-family: Circular Std; font-weight: 500; line-height: 19.20px; word-wrap: break-word;">
                                ${payload.location} </p>
                        </div>
                        <div
                            style="flex-direction: column; justify-content: flex-start; align-items: flex-end; gap: 5px; display: flex">
                            <p
                                style="margin:0; text-align: right; color: #262626; font-size: 14px; font-family: Circular Std; font-weight: 500; word-wrap: break-word">
                                Booking ID: ${payload.bookingId}</p>
                            <p
                                style="margin:0; text-align: right; color: #262626; font-size: 14px; font-family: Circular Std; font-weight: 500; word-wrap: break-word">
                                Booking type: ${payload.bookingType}</p>
                            <p
                                style="margin:0; text-align: right; color: #262626; font-size: 14px; font-family: Circular Std; font-weight: 500; word-wrap: break-word">
                                Booking date: ${payload.createdAt}</p>
                        </div>
                    </div>
                    <div style="margin-top: 20px; border: 1px #DFE4EA solid; padding:0 15px">
                        <div
                            style="display:flex; justify-content:space-between; font-weight:700; border-bottom: 1px #DFE4EA solid">
                            <p>Description</p>
                            <p>Amount</p>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom: 1px #DFE4EA solid">
                            <p>Fee</p>
                            <p>$${(payload.subTotal).toFixed(2)}</p>
                        </div>
                      
                        ${(payload?.convenienceFee !== 0 && payload?.convenienceTax) ? `
                        <div style="display:flex; justify-content:space-between">
                            <p>Convenience fee (${(payload?.convenienceFee)}%)</p>
                            <p>$${(payload?.convenienceTax).toFixed(2)}</p>
                        </div>
                    ` : ''}
                    ${(payload?.salesFee !== 0 && payload?.salesTax) ? `
                        <div style="display:flex; justify-content:space-between">
                            <p>Sales Tax (${(payload.salesFee)}%)</p>
                            <p>$${(payload?.salesTax).toFixed(2)}</p>
                        </div>
                    ` : ''}
                    ${(payload?.creditCardFee !== 0 && payload?.creditFee) ? `
                        <div style="display:flex; justify-content:space-between">
                            <p>Credit Card Fee (${(payload?.creditFee)}%)</p>
                            <p>$${(payload?.creditCardFee).toFixed(2)}</p>
                        </div>
                    ` : ''}
                    
               
                    </div>
                    <div
                        style="display:flex; justify-content:space-between;background: #F4F4F4;font-weight:700; padding:0 15px;margin-top:10px; border: 1px #DFE4EA solid">
                        <p>Total Amount</p>
                        <p>$${(payload.total).toFixed(2)}</p>
                    </div>
                </div>
                <div style="background: #F9F9FA; padding:15px">
                    <div style="max-width:60vw; margin:0 auto">
                        <p
                            style="color: #021A98; font-size: 20px; font-family: Circular Std; font-weight: 700; line-height: 20px; word-wrap: break-word">
                            Payment Method</p>
                        <p
                            style="color: #262626; font-size: 14px; font-family: Circular Std; font-weight: 500; line-height: 12px; word-wrap: break-word">
                            ${payload.userName}</p>
                        <p
                            style="color: #262626; font-size: 14px; font-family: Circular Std; font-weight: 500; line-height: 12px; word-wrap: break-word">
                            Card number: XXXX XXXX XXXX ${payload.card}</p>
                        <p
                            style="color: #262626; font-size: 14px; font-family: Circular Std; font-weight: 500; line-height: 12px; word-wrap: break-word; margin-top:4em">
                            For any questions please contact us at support@swiftstay.com</p>
                    </div>
                </div>
            </div>
        </body>
        
        </html>`
    };
    html_to_pdf.generatePdf(file, options).then(pdfBuffer => {
        console.log("Done");
        const params = {
            Bucket: process.env.AWS_BUCKET,
            Key: `${payload.random}.pdf`,
            Body: pdfBuffer
        };
        s3.upload(params, async function (err, data) {
            if (err) {
                throw err;
            } else {
                console.log(data.Location, "data.Location");
                setTimeout(async () => {
                    await Model.Transaction.findOneAndUpdate({
                        _id: payload.transactionId
                    }, {
                        $set: {
                            "invoice": data.Location
                        }
                    }, {
                        new: true
                    });
                }, 400);
            }
        });
        return true;
    });
};