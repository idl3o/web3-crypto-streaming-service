import React, { useState } from 'react';
import TMCodemanService from '../services/TMCodemanService';

function CodemanDemo() {
  const [formData, setFormData] = useState({
    contentId: '',
    userId: '',
    paymentAmount: 0.05,
    securityLevel: TMCodemanService.SECURITY_LEVELS.STANDARD
  });
  
  const [generatedCode, setGeneratedCode] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await TMCodemanService.generateVerificationCode(formData);
      setGeneratedCode(result);
      setVerificationResult(null);
    } catch (error) {
      console.error('Error generating code:', error);
    }
  };
  
  const handleVerify = async () => {
    if (!generatedCode?.code) return;
    
    try {
      const result = await TMCodemanService.verifyCode(generatedCode.code);
      setVerificationResult(result);
    } catch (error) {
      console.error('Error verifying code:', error);
    }
  };
  
  return (
    <div className="codeman-demo">
      <h2>TMCodeman Service Demo</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Content ID</label>
          <input 
            type="text" 
            name="contentId" 
            value={formData.contentId} 
            onChange={handleChange} 
            placeholder="Enter content ID"
          />
        </div>
        
        <div className="form-group">
          <label>User ID</label>
          <input 
            type="text" 
            name="userId" 
            value={formData.userId} 
            onChange={handleChange} 
            placeholder="Enter user ID"
          />
        </div>
        
        <div className="form-group">
          <label>Payment Amount (ETH)</label>
          <input 
            type="number" 
            name="paymentAmount" 
            value={formData.paymentAmount} 
            onChange={handleChange} 
            step="0.001"
          />
        </div>
        
        <div className="form-group">
          <label>Security Level</label>
          <select name="securityLevel" value={formData.securityLevel} onChange={handleChange}>
            {Object.entries(TMCodemanService.SECURITY_LEVELS).map(([key, value]) => (
              <option key={key} value={value}>{key}</option>
            ))}
          </select>
        </div>
        
        <button type="submit">Generate Code</button>
      </form>
      
      {generatedCode && (
        <div className="result-container">
          <h3>Generated Code</h3>
          <div className="code-display">{generatedCode.code}</div>
          <p><strong>Expiry:</strong> {new Date(generatedCode.expiryTime).toLocaleString()}</p>
          <p><strong>Security Level:</strong> {generatedCode.securityLevel}</p>
          <button onClick={handleVerify}>Verify Code</button>
        </div>
      )}
      
      {verificationResult && (
        <div className={`verification-result ${verificationResult.valid ? 'valid' : 'invalid'}`}>
          <h3>Verification Result</h3>
          <p><strong>Status:</strong> {verificationResult.status}</p>
          <p><strong>Message:</strong> {verificationResult.message}</p>
        </div>
      )}
    </div>
  );
}

export default CodemanDemo;
