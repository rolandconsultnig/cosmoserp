const axios = require('axios');

const API = 'http://localhost:5133/api';
const testEmail = `testuser-${Date.now()}@example.com`;

async function testOtpFlow() {
  console.log('🧪 Testing OTP Registration Flow\n');

  try {
    // Step 1: Send OTP
    console.log('📧 Step 1: Sending OTP...');
    const sendOtpRes = await axios.post(`${API}/marketplace/auth/register/send-otp`, {
      fullName: 'Test User',
      email: testEmail,
    });
    console.log('✅ OTP Sent:', sendOtpRes.data);

    if (!sendOtpRes.data.email) {
      console.error('❌ No email in response');
      return;
    }

    // Step 2: Query the database to get the token (for testing)
    console.log('\n🔍 Step 2: Checking database for token...');
    const prisma = require('./src/config/prisma');
    
    const customer = await prisma.marketplaceCustomer.findUnique({
      where: { email: testEmail },
    });

    if (!customer) {
      console.error('❌ Customer not found in database');
      return;
    }

    console.log('✅ Customer found:');
    console.log(`   ID: ${customer.id}`);
    console.log(`   Email: ${customer.email}`);
    console.log(`   Email Verified: ${customer.emailVerified}`);
    console.log(`   Token: ${customer.emailVerificationToken?.substring(0, 20)}...`);
    console.log(`   Token Expires: ${customer.emailVerificationExpiresAt}`);

    if (!customer.emailVerificationToken) {
      console.error('❌ No verification token stored in database');
      return;
    }

    // Step 3: Try to verify with the token from DB
    console.log('\n✔️  Step 3: Verifying email with token...');
    const verifyRes = await axios.get(`${API}/marketplace/auth/verify-email`, {
      params: { token: customer.emailVerificationToken },
    });
    console.log('✅ Verification Success:', verifyRes.data);

    // Step 4: Verify the customer is now marked as verified
    const verifiedCustomer = await prisma.marketplaceCustomer.findUnique({
      where: { email: testEmail },
    });
    console.log('\n✅ Customer after verification:');
    console.log(`   Email Verified: ${verifiedCustomer.emailVerified}`);
    console.log(`   Token: ${verifiedCustomer.emailVerificationToken}`);

    // Step 5: Complete registration
    console.log('\n🔐 Step 5: Completing registration with password...');
    const completeRes = await axios.post(`${API}/marketplace/auth/register/complete`, {
      email: testEmail,
      password: 'Test@Password123',
    });
    console.log('✅ Registration Complete:', {
      message: completeRes.data.message,
      hasToken: !!completeRes.data.accessToken,
      customer: completeRes.data.customer,
    });

    console.log('\n✅ 🎉 Full OTP Flow Success!\n');
  } catch (err) {
    console.error('\n❌ Error:', err.response?.data || err.message);
  } finally {
    process.exit(0);
  }
}

testOtpFlow();
