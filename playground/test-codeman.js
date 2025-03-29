const TMCodemanService = require('../src/services/TMCodemanService');

async function testService() {
  console.log('Initializing TMCodeman Service...');
  await TMCodemanService.initTMCodemanService();
  
  console.log('\nGenerating verification code...');
  const testData = {
    contentId: 'video-123456',
    userId: 'user-abcdef',
    paymentAmount: 0.05,
    securityLevel: TMCodemanService.SECURITY_LEVELS.ELEVATED
  };
  
  const code = await TMCodemanService.generateVerificationCode(testData);
  console.log('Generated code:', code);
  
  console.log('\nVerifying code...');
  const verification = await TMCodemanService.verifyCode(code.code);
  console.log('Verification result:', JSON.stringify(verification, null, 2));
  
  console.log('\nChecking rewards eligibility...');
  const rewards = TMCodemanService.checkRewardsEligibility(verification.data);
  console.log('Rewards eligibility:', rewards);
}

testService().catch(console.error);
