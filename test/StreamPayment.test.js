const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StreamPayment Contract", function () {
  let StreamPayment;
  let streamPayment;
  let owner;
  let creator;
  let viewer;
  let streamId;

  const ratePerSecond = ethers.utils.parseEther("0.0000001"); // ~0.0006 ETH per minute

  beforeEach(async function () {
    // Get signers
    [owner, creator, viewer] = await ethers.getSigners();
    
    // Deploy the contract
    StreamPayment = await ethers.getContractFactory("StreamPayment");
    streamPayment = await StreamPayment.deploy();
    await streamPayment.deployed();
  });

  describe("Stream Creation and Payment", function () {
    it("Should create a payment stream correctly", async function () {
      // Create stream from viewer to creator
      const depositAmount = ethers.utils.parseEther("0.01");
      
      const tx = await streamPayment.connect(viewer).createStream(
        creator.address, 
        ratePerSecond, 
        { value: depositAmount }
      );
      
      // Get stream ID from event
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'StreamCreated');
      streamId = event.args.streamId;
      
      // Verify stream was created
      expect(streamId).to.not.be.undefined;
      
      // Check stream details
      const stream = await streamPayment.streams(streamId);
      expect(stream.sender).to.equal(viewer.address);
      expect(stream.recipient).to.equal(creator.address);
      expect(stream.rate).to.equal(ratePerSecond);
      expect(stream.balance).to.equal(depositAmount);
    });
    
    it("Should allow withdrawal from stream", async function () {
      // Create stream
      const depositAmount = ethers.utils.parseEther("0.01");
      const tx = await streamPayment.connect(viewer).createStream(
        creator.address, 
        ratePerSecond, 
        { value: depositAmount }
      );
      
      // Get stream ID
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'StreamCreated');
      streamId = event.args.streamId;
      
      // Advance time by 10 minutes
      await ethers.provider.send("evm_increaseTime", [600]);
      await ethers.provider.send("evm_mine");
      
      // Check creator's balance before withdrawal
      const balanceBefore = await ethers.provider.getBalance(creator.address);
      
      // Creator withdraws earnings
      await streamPayment.connect(creator).withdraw(streamId);
      
      // Check creator's balance after withdrawal
      const balanceAfter = await ethers.provider.getBalance(creator.address);
      
      // Verify creator received payment (approximately 10 minutes of streaming)
      // Rate is 0.0000001 ETH per second, so 600 seconds = 0.00006 ETH
      const expectedEarning = ratePerSecond.mul(600);
      
      // Allow for gas costs by checking if difference is close to expected
      expect(balanceAfter.sub(balanceBefore).gt(expectedEarning.mul(90).div(100))).to.be.true;
    });
    
    it("Should stop stream and refund remaining funds", async function () {
      // Create stream
      const depositAmount = ethers.utils.parseEther("0.01");
      const tx = await streamPayment.connect(viewer).createStream(
        creator.address, 
        ratePerSecond, 
        { value: depositAmount }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'StreamCreated');
      streamId = event.args.streamId;
      
      // Advance time by 2 minutes
      await ethers.provider.send("evm_increaseTime", [120]);
      await ethers.provider.send("evm_mine");
      
      // Check viewer's balance before stopping
      const balanceBefore = await ethers.provider.getBalance(viewer.address);
      
      // Stop the stream
      await streamPayment.connect(viewer).stopStream(streamId);
      
      // Check viewer's balance after stopping
      const balanceAfter = await ethers.provider.getBalance(viewer.address);
      
      // Expected cost for 2 minutes (120 seconds)
      const expectedCost = ratePerSecond.mul(120);
      
      // Refund should be close to deposit minus 2 minutes of streaming
      // We don't check exact value due to gas costs
      const expectedRefund = depositAmount.sub(expectedCost);
      
      // Verify refund is approximately correct (within 90% due to gas costs)
      expect(balanceAfter.gt(balanceBefore.add(expectedRefund.mul(90).div(100)))).to.be.true;
    });
  });
});
