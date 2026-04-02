require('dotenv').config();
const { sendVerificationEmail } = require('./src/services/email.service');

(async () => {
  try {
    console.log('\n📧 Sending OTP Verification Email...\n');
    
    const recipientEmail = 'olaniyi.samuel@outlook.com';
    const recipientName = 'Olaniyi Samuel';
    const verificationToken = 'test-verification-token-' + Date.now();

    console.log('Recipient:', recipientEmail);
    console.log('Name:', recipientName);
    console.log('Verification Token:', verificationToken);
    console.log('\n🌐 Email Link Format:');
    console.log(`${process.env.MARKETPLACE_URL || 'http://localhost:5174'}/verify-email?token=${verificationToken}`);
    console.log('\n');

    const result = await sendVerificationEmail(recipientEmail, recipientName, verificationToken);
    
    console.log('✅ OTP Email sent successfully!');
    console.log('Status:', result.status);
    if (result.messageId) console.log('Message ID:', result.messageId);
    console.log('\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Failed to send OTP email:');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    console.error('\n');
    process.exit(1);
  }
})();

// Timeout after 30 seconds
setTimeout(() => {
  console.error('\n⏱️ Timeout - operation took too long');
  process.exit(1);
}, 30000);
