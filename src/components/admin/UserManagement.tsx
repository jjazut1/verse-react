import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Select,
  IconButton,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  Text,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Badge,
  Tooltip,
} from '@chakra-ui/react';
import { DeleteIcon, EditIcon, AddIcon, InfoIcon } from '@chakra-ui/icons';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  setDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';

interface User {
  id: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string | null;
  authUid?: string;
  linkedToAuth?: boolean;
  status?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('user');
  const toast = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersCollection = collection(db, 'users');
      const userSnapshot = await getDocs(usersCollection);
      const usersList = userSnapshot.docs.map(doc => {
        const data = doc.data();
        // Determine account status
        let status = 'Pending';
        if (data.authUid || data.linkedToAuth || data.lastLogin) {
          status = 'Active';
        }
        
        return {
          id: doc.id,
          ...data,
          role: data.role || 'user',
          status
        };
      }) as User[];
      
      setUsers(usersList);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role || 'user');
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const saveUserEdit = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      
      setUsers(users.map(user => 
        user.id === selectedUser.id ? { ...user, role: newRole } : user
      ));
      
      toast({
        title: 'User updated',
        description: `${selectedUser.email}'s role has been changed to ${newRole}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error updating user:', err);
      toast({
        title: 'Error',
        description: 'Failed to update user. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      setIsEditModalOpen(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await deleteDoc(userRef);
      
      setUsers(users.filter(user => user.id !== selectedUser.id));
      
      toast({
        title: 'User deleted',
        description: `${selectedUser.email} has been removed`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error deleting user:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete user. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleAddUser = async () => {
    if (!newEmail || !newRole) {
      toast({
        title: 'Missing information',
        description: 'Please provide email and role',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if user already exists with this email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', newEmail));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        toast({
          title: 'User already exists',
          description: 'A user with this email already exists',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setIsLoading(false);
        return;
      }
      
      // Generate a document ID that will be used as the uid field
      // This will mimic a Firebase Auth UID
      const newId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Create new user document with proper fields that match auth structure
      const newUser = {
        email: newEmail,
        role: newRole,
        userId: newId, // Include userId field that matches the document ID
        displayName: newEmail.split('@')[0], // Generate a display name from the email
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: null,
        // These fields help make it compatible with the auth system's expectations
        emailVerified: false,
        disabled: false,
        status: 'Pending'
      };
      
      // Add to users collection using the generated ID
      await setDoc(doc(db, 'users', newId), newUser);
      
      // Add to our local state
      setUsers([...users, { id: newId, ...newUser }]);
      
      toast({
        title: 'User added',
        description: `${newEmail} has been added with role: ${newRole}. They will need to sign in to activate their account.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset form
      setNewEmail('');
      setNewRole('user');
    } catch (err) {
      console.error('Error adding user:', err);
      toast({
        title: 'Error',
        description: 'Failed to add user. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      setIsAddModalOpen(false);
    }
  };

  const refreshUsers = () => {
    fetchUsers();
    toast({
      title: 'Refreshed',
      description: 'User list has been refreshed',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const getRoleBadge = (role: string) => {
    let color = "gray";
    
    switch(role) {
      case 'admin':
        color = "red";
        break;
      case 'teacher':
        color = "green";
        break;
      case 'user':
        color = "blue";
        break;
    }
    
    return <Badge colorScheme={color}>{role}</Badge>;
  };
  
  const getStatusBadge = (status: string) => {
    let color = "gray";
    
    switch(status) {
      case 'Active':
        color = "green";
        break;
      case 'Pending':
        color = "yellow";
        break;
    }
    
    return <Badge colorScheme={color}>{status}</Badge>;
  };

  return (
    <Box>
      <HStack justifyContent="space-between" mb={4}>
        <Heading size="md">User Management</Heading>
        <HStack>
          <Button 
            leftIcon={<AddIcon />} 
            colorScheme="green" 
            size="sm" 
            onClick={() => setIsAddModalOpen(true)}
          >
            Add User
          </Button>
          <Button 
            colorScheme="blue" 
            size="sm" 
            onClick={refreshUsers} 
            isDisabled={isLoading}
          >
            Refresh
          </Button>
        </HStack>
      </HStack>
      
      <Box mb={4} p={4} borderWidth="1px" borderRadius="md" bg="blue.50">
        <HStack>
          <InfoIcon color="blue.500" />
          <Text fontSize="sm">
            Users added through this admin interface need to sign in to fully activate their accounts. 
            Their account status will change from "Pending" to "Active" after they sign in for the first time.
          </Text>
        </HStack>
      </Box>

      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      {isLoading ? (
        <Box textAlign="center" py={10}>
          <Spinner size="xl" />
          <Text mt={4}>Loading users...</Text>
        </Box>
      ) : (
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.length === 0 ? (
              <Tr>
                <Td colSpan={5} textAlign="center">No users found</Td>
              </Tr>
            ) : (
              users.map(user => (
                <Tr key={user.id}>
                  <Td>{user.email}</Td>
                  <Td>{getRoleBadge(user.role || 'user')}</Td>
                  <Td>
                    <Tooltip 
                      label={user.status === 'Pending' 
                        ? "User needs to sign in to activate their account" 
                        : "User has signed in and account is active"}
                    >
                      {getStatusBadge(user.status || 'Pending')}
                    </Tooltip>
                  </Td>
                  <Td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="Edit user"
                        icon={<EditIcon />}
                        size="sm"
                        colorScheme="blue"
                        onClick={() => handleEditUser(user)}
                      />
                      <IconButton
                        aria-label="Delete user"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleDeleteUser(user)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      )}

      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Email</FormLabel>
              <Input value={selectedUser?.email || ''} isReadOnly />
            </FormControl>
            <FormControl>
              <FormLabel>Role</FormLabel>
              <Select 
                value={newRole} 
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="teacher">Teacher (can create assignments)</option>
                <option value="admin">Admin (includes teacher privileges)</option>
              </Select>
              <Text fontSize="sm" color="gray.600" mt={2}>
                Roles are hierarchical: admins have all teacher privileges, plus admin capabilities.
              </Text>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={saveUserEdit} isLoading={isLoading}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add User Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="info" mb={4}>
              <AlertIcon />
              <Box fontSize="sm">
                <Text>Users added here must sign in to activate their account.</Text>
                <Text mt={1}>If using Google Auth, they should use the same email address.</Text>
              </Box>
            </Alert>
            
            <FormControl mb={4}>
              <FormLabel>Email</FormLabel>
              <Input 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Role</FormLabel>
              <Select 
                value={newRole} 
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="teacher">Teacher (can create assignments)</option>
                <option value="admin">Admin (includes teacher privileges)</option>
              </Select>
              <Text fontSize="sm" color="gray.600" mt={2}>
                Roles are hierarchical: admins have all teacher privileges, plus admin capabilities.
              </Text>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={handleAddUser} isLoading={isLoading}>
              Add User
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Delete</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            Are you sure you want to delete user <strong>{selectedUser?.email}</strong>?
            This action cannot be undone.
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={confirmDeleteUser} isLoading={isLoading}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default UserManagement; 