import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { Calendar } from './components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, MessageSquare, Clock, User, CheckCircle, AlertCircle, Circle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Context for authentication
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      const { access_token, user: userInfo } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userInfo);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const Login = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">TaskFlow</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:underline text-sm"
            >
              Don't have an account? Sign up
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Register = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const roles = [
    { value: 'senior_manager', label: 'Senior Manager' },
    { value: 'manager', label: 'Manager' },
    { value: 'team_lead', label: 'Team Lead' },
    { value: 'senior_architect', label: 'Senior Architect' },
    { value: 'architect', label: 'Architect' },
    { value: 'senior_developer', label: 'Senior Developer' },
    { value: 'developer', label: 'Developer' },
    { value: 'intern', label: 'Intern' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await register(formData);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">TaskFlow</CardTitle>
          <CardDescription className="text-center">
            Create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => handleChange('role', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:underline text-sm"
            >
              Already have an account? Sign in
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-tasks');

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const assignedToMe = tasks.filter(task => task.assigned_to === user.id);
  const assignedByMe = tasks.filter(task => task.assigned_by === user.id);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">TaskFlow</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
              </div>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList className="grid w-fit grid-cols-3">
              <TabsTrigger value="my-tasks">My Tasks ({assignedToMe.length})</TabsTrigger>
              <TabsTrigger value="assigned-tasks">Assigned by Me ({assignedByMe.length})</TabsTrigger>
              <TabsTrigger value="team-overview">Team Overview</TabsTrigger>
            </TabsList>
            <CreateTaskDialog users={users} currentUser={user} onTaskCreated={fetchTasks} />
          </div>

          <TabsContent value="my-tasks" className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Tasks Assigned to Me</h2>
            {assignedToMe.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-gray-500">No tasks assigned to you yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {assignedToMe.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentUser={user}
                    onTaskUpdated={fetchTasks}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assigned-tasks" className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Tasks I Assigned</h2>
            {assignedByMe.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-gray-500">You haven't assigned any tasks yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {assignedByMe.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentUser={user}
                    onTaskUpdated={fetchTasks}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="team-overview" className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Team Overview</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {users
                .filter(u => u.role_level <= user.role_level)
                .sort((a, b) => b.role_level - a.role_level)
                .map((teamMember) => {
                  const memberTasks = tasks.filter(t => t.assigned_to === teamMember.id);
                  const completedTasks = memberTasks.filter(t => t.status === 'completed').length;
                  const inProgressTasks = memberTasks.filter(t => t.status === 'in_progress').length;
                  const assignedTasks = memberTasks.filter(t => t.status === 'assigned').length;

                  const getRoleDisplayName = (role) => {
                    return role.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                  };

                  const getRoleBadgeColor = (role) => {
                    const roleColors = {
                      'senior_manager': 'bg-purple-100 text-purple-800',
                      'manager': 'bg-blue-100 text-blue-800',
                      'team_lead': 'bg-green-100 text-green-800',
                      'senior_architect': 'bg-indigo-100 text-indigo-800',
                      'architect': 'bg-cyan-100 text-cyan-800',
                      'senior_developer': 'bg-orange-100 text-orange-800',
                      'developer': 'bg-yellow-100 text-yellow-800',
                      'intern': 'bg-gray-100 text-gray-800'
                    };
                    return roleColors[role] || 'bg-gray-100 text-gray-800';
                  };

                  return (
                    <Card key={teamMember.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {teamMember.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{teamMember.name}</CardTitle>
                            <CardDescription>{teamMember.email}</CardDescription>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <Badge className={getRoleBadgeColor(teamMember.role)}>
                            {getRoleDisplayName(teamMember.role)}
                          </Badge>
                          <span className="text-xs text-gray-500">Level {teamMember.role_level}</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Total Tasks:</span>
                            <span className="font-medium">{memberTasks.length}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-2 bg-blue-50 rounded">
                              <div className="font-medium text-blue-700">{assignedTasks}</div>
                              <div className="text-blue-600">Assigned</div>
                            </div>
                            <div className="text-center p-2 bg-orange-50 rounded">
                              <div className="font-medium text-orange-700">{inProgressTasks}</div>
                              <div className="text-orange-600">In Progress</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded">
                              <div className="font-medium text-green-700">{completedTasks}</div>
                              <div className="text-green-600">Completed</div>
                            </div>
                          </div>
                          {memberTasks.length > 0 && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full" 
                                  style={{ width: `${(completedTasks / memberTasks.length) * 100}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {Math.round((completedTasks / memberTasks.length) * 100)}% Complete
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

const TaskCard = ({ task, currentUser, onTaskUpdated }) => {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newStatus, setNewStatus] = useState(task.status);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdate = async () => {
    if (newStatus === task.status) return;

    try {
      await axios.patch(`${API}/tasks/${task.id}`, { status: newStatus });
      onTaskUpdated();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await axios.post(`${API}/tasks/${task.id}/comments`, { text: newComment });
      setNewComment('');
      onTaskUpdated();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <CardDescription className="mt-2">{task.description}</CardDescription>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <div className="flex space-x-2">
              <Badge className={getStatusColor(task.status)}>
                {getStatusIcon(task.status)}
                <span className="ml-1 capitalize">{task.status.replace('_', ' ')}</span>
              </Badge>
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  {task.assigned_by_user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <span>From: <span className="font-medium">{task.assigned_by_user?.name}</span></span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  {task.assigned_to_user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <span>To: <span className="font-medium">{task.assigned_to_user?.name}</span></span>
              </div>
            </div>
            {task.due_date && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}</span>
              </div>
            )}
          </div>

          {/* Status Update */}
          {task.assigned_to === currentUser.id && (
            <div className="flex items-center space-x-2">
              <Label htmlFor="status">Update Status:</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              {newStatus !== task.status && (
                <Button size="sm" onClick={handleStatusUpdate}>
                  Update
                </Button>
              )}
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Comments ({task.comments?.length || 0})</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                {showComments ? 'Hide' : 'Show'}
              </Button>
            </div>

            {showComments && (
              <div className="space-y-3">
                {task.comments?.map((comment, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">
                        {comment.author === currentUser.id ? 'You' : 'User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(comment.timestamp), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm">{comment.text}</p>
                  </div>
                ))}

                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 min-h-[60px]"
                  />
                  <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CreateTaskDialog = ({ users, currentUser, onTaskCreated }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: null
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter users based on hierarchy
  const assignableUsers = users.filter(user => {
    if (user.id === currentUser.id) return false;
    return user.role_level <= currentUser.role_level;
  });

  // Filter users based on search term
  const filteredUsers = assignableUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleDisplayName = (role) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getRoleBadgeColor = (role) => {
    const roleColors = {
      'senior_manager': 'bg-purple-100 text-purple-800',
      'manager': 'bg-blue-100 text-blue-800',
      'team_lead': 'bg-green-100 text-green-800',
      'senior_architect': 'bg-indigo-100 text-indigo-800',
      'architect': 'bg-cyan-100 text-cyan-800',
      'senior_developer': 'bg-orange-100 text-orange-800',
      'developer': 'bg-yellow-100 text-yellow-800',
      'intern': 'bg-gray-100 text-gray-800'
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/tasks`, formData);
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        priority: 'medium',
        due_date: null
      });
      setOpen(false);
      onTaskCreated();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Assign a new task to a team member.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assign To</Label>
            <div className="space-y-3">
              {/* Search functionality */}
              <div className="relative">
                <Input
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
                <User className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              </div>

              {/* User selection cards */}
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    {searchTerm ? 'No users found matching your search' : 'No assignable team members'}
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                        formData.assigned_to === user.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => handleChange('assigned_to', user.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {/* Avatar placeholder */}
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                          <span className="text-xs text-gray-400">Level {user.role_level}</span>
                        </div>
                      </div>
                      {formData.assigned_to === user.id && (
                        <div className="mt-2 flex items-center text-blue-600 text-sm">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Selected for assignment
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Selected user summary */}
              {formData.assigned_to && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  {(() => {
                    const selectedUser = users.find(u => u.id === formData.assigned_to);
                    return selectedUser ? (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Task will be assigned to: {selectedUser.name} ({getRoleDisplayName(selectedUser.role)})
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => handleChange('priority', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.due_date ? format(formData.due_date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.due_date}
                  onSelect={(date) => handleChange('due_date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

function App() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <AuthProvider>
      <div className="App">
        <AuthContent isLogin={isLogin} setIsLogin={setIsLogin} />
      </div>
    </AuthProvider>
  );
}

const AuthContent = ({ isLogin, setIsLogin }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  return isLogin ? (
    <Login onSwitchToRegister={() => setIsLogin(false)} />
  ) : (
    <Register onSwitchToLogin={() => setIsLogin(true)} />
  );
};

export default App;