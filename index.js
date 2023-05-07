
const express = require("express");
const cors = require("cors");
const QRCode = require("qrcode");

const nodemailer = require('nodemailer');


const corsOptions ={
  origin:'*', 
  credentials:true,            //access-control-allow-credentials:true
  optionSuccessStatus:200,
}


const app = express();


app.use(cors(corsOptions));
app.use(express.json());


let  smtpTransport = nodemailer.createTransport({
  host: 'smtp.mail.yahoo.com',
  port: 587,//465 or 587. 465 worked for me.
  service:'yahoo',
  secure: false,
  auth: {
      user: "asrar.alam@yahoo.com",
      pass: "rqsddzxithjalqyp"
  }
  ,
  debug: false,
  logger: true 
});

async function create(dataForQRcode,color) {
 
 
  return  QRCode.toDataURL(dataForQRcode,{
    errorCorrectionLevel: "H",
    margin: 1,
    color: {
        dark: color,
        light: "#ffffff",
    },
});
}
app.get("/", (req, res) => {
  res.send("hello world")
})
app.post("/qr-code-generate", async (req, res) => {
  const {qrText,qrEmail,qrColor} = req.body;
  console.log("qr,text,",req.body);
  const qrCode = await create(
    qrText,
    qrColor
  );
 
  var mailOptions = {
    from: "asrar.alam@yahoo.com", // sender address
    to: qrEmail, // list of receivers
    subject: "Your QR Code", // Subject line
    html: "<html><p>Dear sir/madam, here is your code in the attachment, against your text, Thanks</p></html>", // plaintext body
    attachments: [
        {   // stream as an attachment
            filename: "qrcode.png",
            path: qrCode
        }
    ]
}
smtpTransport.sendMail(mailOptions, function (error, response) {
    if (error) {
        console.log(error);
        res.json({ status:400,message: "Can't generate Your Qr Code" });
    } else {
        console.log("Message sent: ",response);
        res.json({ status:10000,message: "QR Code has been generated And send Via Email to you" });
    }
});
 
});

app.listen(8000, () => {
  console.log(`Server is running on port 8000.`);
});