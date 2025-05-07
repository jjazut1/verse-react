/**
 * Firebase Functions Monitoring Setup
 * 
 * This script configures monitoring alerts for the passwordless authentication functions.
 * Run this script with Node.js after deploying the functions.
 * 
 * Requirements:
 * - Google Cloud SDK installed
 * - Project owner permissions
 * - Monitoring API enabled
 */

const { execSync } = require('child_process');
const PROJECT_ID = 'verse-11f2d';

// Functions to monitor
const FUNCTIONS = [
  'sendEmailLinkWithAssignment',
  'getAssignmentByIdForAuth'
];

// Create error rate alert
function createErrorRateAlert(functionName) {
  const alertName = `${functionName}-error-rate`;
  const command = `
    gcloud alpha monitoring policies create --project=${PROJECT_ID} \\
      --display-name="Function Error Rate: ${functionName}" \\
      --conditions="condition.display_name='Error Rate over 5%' AND condition.filter='resource.type=\\\"cloud_function\\\" AND resource.labels.function_name=\\\"${functionName}\\\" AND metric.type=\\\"cloudfunctions.googleapis.com/function/execution_count\\\" AND metric.labels.status=\\\"error\\\"' AND condition.comparison.gt.threshold=5 AND condition.comparison.duration=300s" \\
      --combiner=OR \\
      --notification-channels="projects/${PROJECT_ID}/notificationChannels/EMAIL" \\
      --documentation="Error rate for ${functionName} is above 5% in the last 5 minutes"
  `;
  
  console.log(`Creating error rate alert for ${functionName}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ Created error rate alert for ${functionName}`);
  } catch (error) {
    console.error(`❌ Failed to create error rate alert for ${functionName}`);
  }
}

// Create execution time alert
function createExecutionTimeAlert(functionName) {
  const alertName = `${functionName}-execution-time`;
  const command = `
    gcloud alpha monitoring policies create --project=${PROJECT_ID} \\
      --display-name="Function Execution Time: ${functionName}" \\
      --conditions="condition.display_name='Execution Time over 2s' AND condition.filter='resource.type=\\\"cloud_function\\\" AND resource.labels.function_name=\\\"${functionName}\\\" AND metric.type=\\\"cloudfunctions.googleapis.com/function/execution_times\\\"' AND condition.aggregations.alignmentPeriod=60s AND condition.aggregations.perSeriesAligner=ALIGN_PERCENTILE_95 AND condition.comparison.gt.threshold=2000 AND condition.comparison.duration=300s" \\
      --combiner=OR \\
      --notification-channels="projects/${PROJECT_ID}/notificationChannels/EMAIL" \\
      --documentation="Execution time for ${functionName} is consistently above 2 seconds in the last 5 minutes"
  `;
  
  console.log(`Creating execution time alert for ${functionName}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ Created execution time alert for ${functionName}`);
  } catch (error) {
    console.error(`❌ Failed to create execution time alert for ${functionName}`);
  }
}

// Check if notification channels are set up
function setupNotificationChannels() {
  console.log('Setting up notification channels...');
  try {
    // Check if email notification channel exists
    const channels = execSync(`gcloud alpha monitoring channels list --project=${PROJECT_ID} --format="value(name)"`, { encoding: 'utf8' });
    
    if (!channels.includes('EMAIL')) {
      console.log('Creating email notification channel...');
      const email = 'james@learnwithverse.com'; // Use your preferred email
      execSync(`
        gcloud alpha monitoring channels create --project=${PROJECT_ID} \\
          --display-name="Email Alerts" \\
          --type=email \\
          --channel-labels=email_address=${email}
      `, { stdio: 'inherit' });
      console.log('✅ Created email notification channel');
    } else {
      console.log('✅ Email notification channel already exists');
    }
  } catch (error) {
    console.error('❌ Failed to set up notification channels');
    process.exit(1);
  }
}

// Main function
function main() {
  console.log('📊 Setting up monitoring for Firebase Functions...');
  
  // Setup notification channels
  setupNotificationChannels();
  
  // Create alerts for each function
  for (const functionName of FUNCTIONS) {
    createErrorRateAlert(functionName);
    createExecutionTimeAlert(functionName);
  }
  
  console.log('\n✅ Monitoring setup complete');
  console.log('\nTo view alerts:');
  console.log(`1. Go to https://console.cloud.google.com/monitoring/alerting?project=${PROJECT_ID}`);
  console.log('2. Click on "Policies" to view your alert policies');
  console.log('\nTo view metrics:');
  console.log(`1. Go to https://console.cloud.google.com/monitoring/metrics-explorer?project=${PROJECT_ID}`);
  console.log(`2. Select "Cloud Functions" as the resource type and "Function" as the metric`);
}

// Run the script
main(); 