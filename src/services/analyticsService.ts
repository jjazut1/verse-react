import { getAnalytics, logEvent } from 'firebase/analytics';
import { auth } from '../config/firebase';

/**
 * Analytics service for tracking email link authentication events
 */
const analytics = getAnalytics();

/**
 * Track email link authentication completed successfully
 * @param assignmentId ID of the assignment
 * @param timeToComplete Time in milliseconds from click to completion
 */
export const trackEmailLinkAuthCompleted = (assignmentId: string, timeToComplete: number) => {
  try {
    const user = auth.currentUser;
    
    logEvent(analytics, 'email_link_auth_completed', {
      assignmentId,
      timeToComplete,
      userAuthenticated: !!user,
      userEmail: user?.email || 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging email_link_auth_completed event:', error);
  }
};

/**
 * Track assignment completion (student finished the game)
 * @param assignmentId ID of the assignment
 * @param gameId ID of the game
 * @param score Student's score (if applicable)
 * @param timeSpent Time in seconds spent on the assignment
 */
export const trackAssignmentCompleted = (assignmentId: string, gameId: string, score: number | null, timeSpent: number) => {
  try {
    const user = auth.currentUser;
    
    logEvent(analytics, 'assignment_completed_from_email_link', {
      assignmentId,
      gameId,
      score,
      timeSpent,
      userAuthenticated: !!user,
      userEmail: user?.email || 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging assignment_completed_from_email_link event:', error);
  }
}; 