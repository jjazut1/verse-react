/**
 * Firebase Analytics Dashboard Setup Script
 * 
 * This script outlines the steps to set up a Firebase Analytics dashboard
 * for monitoring the passwordless authentication flow.
 */

console.log(`
====================================================================
EMAIL LINK AUTHENTICATION DASHBOARD SETUP
====================================================================

Follow these steps to set up a custom Firebase Analytics dashboard:

1. Go to Firebase Console: https://console.firebase.google.com/project/verse-11f2d/overview

2. Open Analytics section in the left sidebar

3. Click on "Dashboards" in the Analytics section

4. Click "Create dashboard" and name it "Email Link Authentication"

5. Add widgets for the following metrics:

   a. Email Authentication Conversion Rate (Card)
      - Create a custom formula dividing successful authentications by attempts
      - Formula: "email_link_auth_completed" / "email_link_auth_started" * 100
      - Format as percentage
      - Title: "Email Link Auth Success Rate"

   b. Authentication Time Distribution (Bar Chart)
      - Event: "email_link_auth_completed"
      - Dimension: "timeToComplete" (grouped into buckets)
      - Bucket ranges:
         * 0-5 seconds
         * 5-10 seconds
         * 10-30 seconds
         * 30-60 seconds
         * 60+ seconds
      - Title: "Authentication Time Distribution"

   c. Daily Authentication Attempts (Line Chart)
      - Events: "email_link_auth_started"
      - Time dimension: Daily
      - Compare with "email_link_auth_completed"
      - Title: "Daily Authentication Activity"

   d. Authentication Success by Device (Pie Chart)
      - Event: "email_link_auth_completed"
      - Dimension: "device.category"
      - Title: "Authentication Success by Device"

   e. Assignment Opened Rate (Card)
      - Create a custom formula comparing assignments loaded to authentications
      - Formula: "assignment_loaded_from_email_link" / "email_link_auth_completed" * 100
      - Format as percentage
      - Title: "Assignment Opened Rate"

   f. Error Rate by Type (Bar Chart)
      - Event: "email_link_auth_failed"
      - Dimension: "errorCode"
      - Title: "Auth Errors by Type"

6. Arrange widgets in a logical order:
   - Top row: Success Rate and Assignment Opened Rate cards
   - Middle: Daily Authentication Activity and Authentication Time
   - Bottom: Device breakdown and Errors

7. Schedule email reports to be sent weekly to stakeholders
   - Click "Schedule reports" from dashboard options
   - Add team member emails
   - Set to weekly delivery

====================================================================
EMAIL LINK AUTHENTICATION ALERTS
====================================================================

To set up critical alerts:

1. Go to Firebase Console > Functions > Monitoring

2. Create alerts for:
   a. High Error Rate Alert
      - Condition: Error rate > 10% over 5 minute period
      - Notification: Email and Slack

   b. Authentication Time Alert
      - Condition: P95 auth time > 30 seconds over 5 minute period
      - Notification: Email only

   c. Zero Success Alert
      - Condition: No successful auth events in 24 hours when attempts > 0
      - Notification: Email and Slack (high priority)

====================================================================
`);

// If run directly, output the instructions to console
if (require.main === module) {
  // This allows the script to be imported without executing
  process.exit(0);
} 