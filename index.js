// const express = require("express");
// const cors = require("cors");
// const QRCode = require("qrcode");
// const { createCanvas, loadImage } = require("canvas");
// const nodemailer = require('nodemailer');

// let PORT = process.env.PORT || 8000
// const corsOptions ={
//   origin:'*', 
//   credentials:true,            //access-control-allow-credentials:true
//   optionSuccessStatus:200,
// }


// const app = express();


// app.use(cors(corsOptions));
// app.use(express.json());


// let  smtpTransport = nodemailer.createTransport({
//   host: 'smtp.mail.yahoo.com',
//   port: 587,//465 or 587. 465 worked for me.
//   service:'yahoo',
//   secure: false,
//   auth: {
//       user: "asrar.alam@yahoo.com",
//       pass: "rqsddzxithjalqyp"
//   }
//   ,
//   debug: false,
//   logger: true 
// });

// async function create(dataForQRcode,color) {
//   const canvas = createCanvas(50, 50);
//   QRCode.toCanvas(
//       canvas,
//       dataForQRcode,
//       {
//           errorCorrectionLevel: "H",
//           margin: 1,
//           color: {
//               dark: color,
//               light: "#ffffff",
//           },
//       }
//   );
//   return canvas.toDataURL("image/png");
// }
// app.get("/", (req, res) => {
//   res.send("hello world")
// })
// app.post("/qr-code-generate", async (req, res) => {
//   const {qrText,qrEmail,qrColor} = req.body;
//   console.log("qr,text,",req.body);
//   const qrCode = await create(
//     qrText,
//     qrColor
//   );
//   var mailOptions = {
//     from: "asrar.alam@yahoo.com", // sender address
//     to: qrEmail, // list of receivers
//     subject: "Your QR Code", // Subject line
//     html: "<html><p>Dear sir/madam, here is your code in the attachment, against your text, Thanks</p></html>", // plaintext body
//     attachments: [
//         {   // stream as an attachment
//             filename: "qrcode.png",
//             path: qrCode
//         }
//     ]
// }
// smtpTransport.sendMail(mailOptions, function (error, response) {
//     if (error) {
//         console.log(error);
//         res.json({ status:400,message: "Can't generate Your Qr Code" });
//     } else {
//         console.log("Message sent: ",response);
//         res.json({ status:10000,message: "QR Code has been generated And send Via Email to you" });
//     }
// });
 
// });

// app.listen(PORT, () => {
//   console.log(`Server is running on port 8000.`);
// });



// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import Routes
const authRoutes = require('./src/routes/auth');
const subscriptionRoutes = require('./src/routes/subscription');
const qrRoutes = require('./src/routes/qr');
const adminRoutes = require('./src/routes/admin');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/admin', adminRoutes);


// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'QR Code Generator API',
    status: 'running',
    database: 'Firebase Realtime Database'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Firebase Realtime Database connected`);
  console.log(`📧 Email: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}`);
});