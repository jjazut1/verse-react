import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeacherAssignments, getAssignmentAttempts } from '../services/assignmentService';
import { useAuth } from '../contexts/AuthContext';
import AssignmentCard from '../components/AssignmentCard';
import AttemptsList from '../components/AttemptsList';
import { Assignment, Attempt } from '../types';

const Assignments: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStudent, setFilterStudent] = useState<string>('');
  
  // Fetch assignments on component mount
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    loadAssignments();
  }, [currentUser, navigate]);
  
  // Load assignments for the current teacher
  const loadAssignments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (currentUser) {
        const teacherAssignments = await getTeacherAssignments(currentUser.uid);
        setAssignments(teacherAssignments);
      }
    } catch (err) {
      console.error('Error loading assignments:', err);
      setError('Failed to load assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // View attempts for an assignment
  const handleViewAttempts = async (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setLoadingAttempts(true);
    
    try {
      const attemptsList = await getAssignmentAttempts(assignmentId);
      setAttempts(attemptsList);
      setShowAttemptsModal(true);
    } catch (err) {
      console.error('Error loading attempts:', err);
      alert('Failed to load attempts. Please try again.');
    } finally {
      setLoadingAttempts(false);
    }
  };
  
  // Close attempts modal
  const handleCloseAttemptsModal = () => {
    setShowAttemptsModal(false);
    setSelectedAssignmentId(null);
    setAttempts([]);
  };
  
  // Handle assignment deletion
  const handleAssignmentDeleted = () => {
    loadAssignments();
  };
  
  // Get filtered assignments based on status and student email
  const getFilteredAssignments = () => {
    let filtered = [...assignments];
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(assignment => assignment.status === filterStatus);
    }
    
    // Filter by student email
    if (filterStudent) {
      const searchTerm = filterStudent.toLowerCase();
      filtered = filtered.filter(assignment => 
        assignment.studentEmail.toLowerCase().includes(searchTerm)
      );
    }
    
    return filtered;
  };
  
  // Render filter controls
  const renderFilters = () => (
    <div style={{
      display: 'flex',
      gap: 'var(--spacing-4)',
      marginBottom: 'var(--spacing-4)',
      flexWrap: 'wrap'
    }}>
      <div>
        <label 
          htmlFor="statusFilter"
          style={{
            display: 'block',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-gray-700)',
            marginBottom: 'var(--spacing-1)'
          }}
        >
          Status
        </label>
        <select
          id="statusFilter"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: 'var(--spacing-2)',
            border: '1px solid var(--color-gray-300)',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: 'var(--font-size-md)'
          }}
        >
          <option value="all">All Statuses</option>
          <option value="assigned">Assigned</option>
          <option value="started">Started</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      
      <div style={{ flexGrow: 1 }}>
        <label 
          htmlFor="studentFilter"
          style={{
            display: 'block',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-gray-700)',
            marginBottom: 'var(--spacing-1)'
          }}
        >
          Search by Student Email
        </label>
        <input
          id="studentFilter"
          type="text"
          value={filterStudent}
          onChange={(e) => setFilterStudent(e.target.value)}
          placeholder="Enter student email"
          style={{
            width: '100%',
            padding: 'var(--spacing-2)',
            border: '1px solid var(--color-gray-300)',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: 'var(--font-size-md)'
          }}
        />
      </div>
    </div>
  );
  
  // Get summary stats for assignments
  const getAssignmentStats = () => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const inProgress = assignments.filter(a => a.status === 'started').length;
    const notStarted = assignments.filter(a => a.status === 'assigned').length;
    
    const now = new Date();
    const overdue = assignments.filter(a => 
      a.deadline.toDate() < now && a.status !== 'completed'
    ).length;
    
    return { total, completed, inProgress, notStarted, overdue };
  };
  
  // Render summary stats
  const renderStats = () => {
    const stats = getAssignmentStats();
    
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 'var(--spacing-4)',
        marginBottom: 'var(--spacing-6)'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-gray-800)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
            Total Assignments
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-success-600)' }}>
            {stats.completed}
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
            Completed
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>
            {stats.inProgress}
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
            In Progress
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-gray-500)' }}>
            {stats.notStarted}
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
            Not Started
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-3)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-error-600)' }}>
            {stats.overdue}
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
            Overdue
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--spacing-6)' }}>
      <h1 style={{ 
        fontSize: 'var(--font-size-3xl)',
        color: 'var(--color-gray-800)',
        marginBottom: 'var(--spacing-6)'
      }}>
        My Assignments
      </h1>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--color-gray-500)' }}>
          Loading assignments...
        </div>
      ) : error ? (
        <div style={{ 
          backgroundColor: 'var(--color-error-100)', 
          color: 'var(--color-error-700)', 
          padding: 'var(--spacing-4)', 
          borderRadius: 'var(--border-radius-md)',
          marginBottom: 'var(--spacing-4)'
        }}>
          {error}
        </div>
      ) : (
        <>
          {assignments.length > 0 ? (
            <>
              {/* Stats cards */}
              {renderStats()}
              
              {/* Filters */}
              {renderFilters()}
              
              {/* Assignment list */}
              <div>
                {getFilteredAssignments().map(assignment => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onDelete={handleAssignmentDeleted}
                    onViewAttempts={() => handleViewAttempts(assignment.id || '')}
                  />
                ))}
                
                {getFilteredAssignments().length === 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: 'var(--spacing-8)', 
                    color: 'var(--color-gray-500)',
                    backgroundColor: 'white',
                    borderRadius: 'var(--border-radius-md)',
                  }}>
                    No assignments match your filters.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--spacing-8)', 
              color: 'var(--color-gray-500)',
              backgroundColor: 'white',
              borderRadius: 'var(--border-radius-md)',
            }}>
              You haven't assigned any games to students yet.
              <div style={{ marginTop: 'var(--spacing-4)' }}>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    backgroundColor: 'var(--color-primary-600)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--border-radius-sm)',
                    padding: 'var(--spacing-2) var(--spacing-4)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-md)'
                  }}
                >
                  Go to Games
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Attempts modal */}
      {showAttemptsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--spacing-4)'
        }}>
          {loadingAttempts ? (
            <div style={{
              backgroundColor: 'white',
              borderRadius: 'var(--border-radius-md)',
              padding: 'var(--spacing-6)',
              textAlign: 'center',
              color: 'var(--color-gray-500)'
            }}>
              Loading attempts...
            </div>
          ) : (
            <AttemptsList
              attempts={attempts}
              onClose={handleCloseAttemptsModal}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Assignments; 