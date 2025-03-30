#!/usr/bin/env node

/**
 * MituSax Monitoring Setup Script
 * Configures the monitoring and analytics service for the Web3 Crypto Streaming Service
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');

async function main() {
  console.log(chalk.blue('=== MituSax Monitoring Setup ==='));
  
  console.log(chalk.yellow('\nThis setup will configure the monitoring and analytics service for your streams.'));
  
  // Get monitoring configuration
  const { enableMonitoring, sampleInterval, retention } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableMonitoring',
      message: 'Enable automatic monitoring for all streams?',
      default: true
    },
    {
      type: 'list',
      name: 'sampleInterval',
      message: 'Select metrics sampling interval:',
      choices: [
        { name: 'High frequency (2 seconds)', value: 2000 },
        { name: 'Standard (5 seconds)', value: 5000 },
        { name: 'Low frequency (10 seconds)', value: 10000 }
      ],
      default: 1
    },
    {
      type: 'list',
      name: 'retention',
      message: 'How long to retain metrics data:',
      choices: [
        { name: '24 hours', value: 24 },
        { name: '7 days', value: 168 },
        { name: '30 days', value: 720 }
      ],
      default: 1
    }
  ]);

  // Get analytics preferences
  const { enableReporting, reportFormat } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableReporting',
      message: 'Enable automated analytics reports?',
      default: true
    },
    {
      type: 'list',
      name: 'reportFormat',
      message: 'Select report format:',
      choices: [
        { name: 'JSON', value: 'json' },
        { name: 'CSV', value: 'csv' },
        { name: 'HTML', value: 'html' }
      ],
      default: 0,
      when: (answers) => answers.enableReporting
    }
  ]);

  // Get synchronization configuration
  const { enableSync } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableSync',
      message: 'Enable cross-device synchronization?',
      default: true
    }
  ]);

  // Save configuration
  const spinner = ora('Saving configuration...').start();
  
  try {
    const config = {
      monitoring: {
        enabled: enableMonitoring,
        sampleIntervalMs: sampleInterval,
        retentionHours: retention
      },
      analytics: {
        reporting: {
          enabled: enableReporting,
          format: reportFormat || 'json',
          schedule: 'daily'
        }
      },
      synchronization: {
        enabled: enableSync,
        maxAllowedDriftMs: 50
      },
      lastUpdated: new Date().toISOString()
    };

    const configDir = path.join(__dirname, '..', '..', 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(configDir, 'monitoring-config.json'),
      JSON.stringify(config, null, 2)
    );

    spinner.succeed('Configuration saved successfully');

    console.log(chalk.green('\n✅ MituSax Monitoring Setup Complete'));
    console.log(chalk.blue('\nTo use the monitoring service in your application:'));
    console.log(chalk.gray('  import { mituSaxService } from \'../services/MituSaxService\';'));
    console.log(chalk.gray('  mituSaxService.startMonitoring(streamId);'));
    
    if (enableReporting) {
      console.log(chalk.blue('\nTo generate analytics reports:'));
      console.log(chalk.gray('  const report = mituSaxService.generateReport(streamId);'));
    }

    if (enableSync) {
      console.log(chalk.blue('\nTo synchronize multiple devices:'));
      console.log(chalk.gray('  await mituSaxService.synchronizeDevices(primaryDeviceId, secondaryDeviceIds);'));
    }

  } catch (error) {
    spinner.fail('Error saving configuration');
    console.error(chalk.red('Setup failed:'), error.message);
  }
}

// Run the script
main().catch(err => {
  console.error(chalk.red('Unexpected error:'), err);
  process.exit(1);
});
