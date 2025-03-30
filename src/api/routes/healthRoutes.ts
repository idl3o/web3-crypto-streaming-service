import { Router } from 'express';
import { healthMonitoringService } from '../../services/HealthMonitoringService';

const router = Router();

/**
 * @route GET /health
 * @desc Get basic health check status
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const { status, uptime, timestamp, version, environment } = healthMonitoringService.getHealthReport();
    
    res.json({
      status,
      uptime: formatUptime(uptime),
      timestamp,
      version,
      environment
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Error retrieving health status'
    });
  }
});

/**
 * @route GET /health/details
 * @desc Get detailed health check status for all components
 * @access Protected (usually restricted to admins or monitoring systems)
 */
router.get('/details', async (req, res) => {
  try {
    // For a real implementation, this would include auth middleware
    
    const healthReport = await healthMonitoringService.checkAllHealth();
    
    res.json({
      ...healthReport,
      uptime: formatUptime(healthReport.uptime)
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Error retrieving detailed health status'
    });
  }
});

/**
 * @route GET /health/component/:name
 * @desc Get health status for a specific component
 * @access Protected
 */
router.get('/component/:name', async (req, res) => {
  const { name } = req.params;
  
  try {
    // Check if component exists
    const report = healthMonitoringService.getHealthReport();
    const component = report.components.find(c => c.name === name);
    
    if (!component) {
      return res.status(404).json({ 
        status: 'error', 
        message: `Component '${name}' not found` 
      });
    }
    
    // Check component health
    const health = await healthMonitoringService.checkComponentHealth(name);
    
    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: `Error checking health for component: ${name}`
    });
  }
});

/**
 * Format uptime in a human-readable format
 */
function formatUptime(uptime: number): string {
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export default router;
