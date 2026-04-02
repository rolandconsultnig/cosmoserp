require('dotenv').config();
const nodemailer = require('nodemailer');
const tls = require('tls');

(async () => {
  try {
    console.log('\n📧 Email Configuration:');
    console.log('HOST: 147.124.214.59');
    console.log('PORT: 465');
    console.log('SECURE: true (SSL)');
    console.log('USER:', process.env.SMTP_USER);
    console.log('\n');

    const transporter = nodemailer.createTransport({
      host: '147.124.214.59',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
    });

    const FROM = 'tola@cosmoserp.com.ng';

    // Test connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP Connection successful!\n');

    // Send email
    const mailOptions = {
      from: FROM,
      to: 'olaniyi.samuel@outlook.com',
      subject: 'email test',
      text: 'I am just testing this email setup',
      html: '<p>I am just testing this email setup</p>',
    };

    console.log('📨 Sending test email...');
    console.log('To:', mailOptions.to);
    console.log('Subject:', mailOptions.subject);
    console.log('');

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    process.exit(0);

  } catch (error) {
    console.error('❌ FAILED:');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.command) console.error('Command:', error.command);
    process.exit(1);
  }
})();

// Timeout after 30 seconds
setTimeout(() => {
  console.error('\n⏱️ Timeout - operation took too long');
  process.exit(1);
}, 30000);
