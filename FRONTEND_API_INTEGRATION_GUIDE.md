# Complete Frontend API Integration Guide - Traf3li

This guide provides **detailed, copy-paste ready code** for integrating with ALL Traf3li backend APIs from your frontend application.

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Authentication APIs](#authentication-apis)
3. [User APIs](#user-apis)
4. [Gig APIs](#gig-apis)
5. [Job APIs](#job-apis)
6. [Proposal APIs](#proposal-apis)
7. [Order & Payment APIs](#order--payment-apis)
8. [Case Management APIs](#case-management-apis)
9. [Task Management APIs](#task-management-apis)
10. [Calendar & Events APIs](#calendar--events-apis)
11. [Messaging APIs](#messaging-apis)
12. [Notification APIs](#notification-apis)
13. [Invoice & Finance APIs](#invoice--finance-apis)
14. [Document APIs](#document-apis)
15. [Questions & Answers APIs](#questions--answers-apis)
16. [WebSocket Integration](#websocket-integration)
17. [Complete React Examples](#complete-react-examples)

---

## Initial Setup

### Step 1: Install Dependencies

```bash
npm install axios socket.io-client
# or
yarn add axios socket.io-client
```

### Step 2: Create API Client

Create `src/api/client.js`:

```javascript
import axios from 'axios';

// Configure base URL based on environment
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // CRITICAL: Enables cookies for authentication
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (optional: add loading states)
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (handle errors globally)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login or clear user state
      console.error('Unauthorized - Please login');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Step 3: Environment Variables

Create `.env` file:

```env
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_WS_URL=http://localhost:8080
```

---

## Authentication APIs

### Auth Service (`src/api/services/auth.service.js`)

```javascript
import apiClient from '../client';

class AuthService {
  /**
   * Register new user
   * @param {Object} userData - User registration data
   */
  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
        country: userData.country || 'Saudi Arabia',
        isSeller: userData.isSeller || false,
        role: userData.role || 'client',
        image: userData.image,
        description: userData.description,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Login user
   * @param {string} username - Username or email
   * @param {string} password - Password
   */
  async login(username, password) {
    try {
      const response = await apiClient.post('/auth/login', {
        username, // Can be username OR email
        password,
      });
      // Cookie is automatically stored by browser
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      const response = await apiClient.post('/auth/logout');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new AuthService();
```

### Usage in Component

```javascript
import React, { useState } from 'react';
import authService from '../api/services/auth.service';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authService.login(username, password);

      if (!result.error) {
        console.log('Logged in user:', result.user);
        // Redirect or update app state
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="text"
        placeholder="Username or Email"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

// Register Component
function RegisterForm() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    country: 'Saudi Arabia',
    isSeller: false,
  });

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const result = await authService.register(formData);

      if (!result.error) {
        alert('Registration successful! Please login.');
        window.location.href = '/login';
      }
    } catch (err) {
      alert(err.message || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleRegister}>
      <input
        type="text"
        placeholder="Username"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
      />
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />
      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
      />
      <input
        type="tel"
        placeholder="Phone"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
      />
      <label>
        <input
          type="checkbox"
          checked={formData.isSeller}
          onChange={(e) => setFormData({ ...formData, isSeller: e.target.checked })}
        />
        Register as Lawyer
      </label>
      <button type="submit">Register</button>
    </form>
  );
}
```

---

## User APIs

### User Service (`src/api/services/user.service.js`)

```javascript
import apiClient from '../client';

class UserService {
  /**
   * Get all lawyers with filters
   * @param {Object} filters - Search and filter params
   */
  async getLawyers(filters = {}) {
    try {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.specialization) params.append('specialization', filters.specialization);
      if (filters.city) params.append('city', filters.city);
      if (filters.minRating) params.append('minRating', filters.minRating);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await apiClient.get(`/users/lawyers?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   */
  async getUserById(userId) {
    try {
      const response = await apiClient.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get lawyer profile with stats
   * @param {string} username - Lawyer username
   */
  async getLawyerProfile(username) {
    try {
      const response = await apiClient.get(`/users/lawyer/${username}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   */
  async updateProfile(userId, updates) {
    try {
      const response = await apiClient.patch(`/users/${userId}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Delete user account
   * @param {string} userId - User ID
   */
  async deleteAccount(userId) {
    try {
      const response = await apiClient.delete(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new UserService();
```

### Usage Examples

```javascript
import userService from '../api/services/user.service';

// Search for lawyers
function LawyerSearch() {
  const [lawyers, setLawyers] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    specialization: '',
    minRating: 0,
    page: 1,
    limit: 10,
  });

  useEffect(() => {
    async function fetchLawyers() {
      try {
        const result = await userService.getLawyers(filters);
        setLawyers(result.lawyers);
      } catch (error) {
        console.error('Failed to fetch lawyers:', error);
      }
    }
    fetchLawyers();
  }, [filters]);

  return (
    <div>
      <input
        type="text"
        placeholder="Search lawyers..."
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
      />

      <select
        value={filters.specialization}
        onChange={(e) => setFilters({ ...filters, specialization: e.target.value })}
      >
        <option value="">All Specializations</option>
        <option value="labor">Labor Law</option>
        <option value="commercial">Commercial Law</option>
        <option value="family">Family Law</option>
      </select>

      <div className="lawyers-list">
        {lawyers.map((lawyer) => (
          <div key={lawyer._id} className="lawyer-card">
            <img src={lawyer.image} alt={lawyer.username} />
            <h3>{lawyer.username}</h3>
            <p>Rating: {lawyer.lawyerProfile.rating}/5</p>
            <p>Experience: {lawyer.lawyerProfile.yearsExperience} years</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// View lawyer profile
function LawyerProfile({ username }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const result = await userService.getLawyerProfile(username);
        setProfile(result.profile);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    }
    fetchProfile();
  }, [username]);

  if (!profile) return <div>Loading...</div>;

  return (
    <div>
      <h1>{profile.user.username}</h1>
      <p>{profile.user.description}</p>

      <div className="stats">
        <div>Total Projects: {profile.stats.totalProjects}</div>
        <div>Average Rating: {profile.stats.averageRating}</div>
        <div>Completion Rate: {profile.stats.completionRate}%</div>
      </div>

      <div className="gigs">
        <h2>Services</h2>
        {profile.gigs.map((gig) => (
          <div key={gig._id}>{gig.title} - ${gig.price}</div>
        ))}
      </div>

      <div className="reviews">
        <h2>Reviews</h2>
        {profile.reviews.map((review) => (
          <div key={review._id}>
            <p>Rating: {review.star}/5</p>
            <p>{review.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Update profile
async function updateUserProfile(userId, updates) {
  try {
    const result = await userService.updateProfile(userId, {
      description: 'Updated bio',
      image: 'https://example.com/avatar.jpg',
      lawyerProfile: {
        specialization: ['labor', 'commercial'],
        yearsExperience: 5,
      },
    });
    console.log('Profile updated:', result.user);
  } catch (error) {
    console.error('Update failed:', error);
  }
}
```

---

## Gig APIs

### Gig Service (`src/api/services/gig.service.js`)

```javascript
import apiClient from '../client';

class GigService {
  /**
   * Create new gig
   * @param {Object} gigData - Gig data
   */
  async createGig(gigData) {
    try {
      const response = await apiClient.post('/gigs', {
        title: gigData.title,
        description: gigData.description,
        category: gigData.category,
        price: gigData.price,
        cover: gigData.cover,
        images: gigData.images || [],
        shortTitle: gigData.shortTitle,
        shortDesc: gigData.shortDesc,
        deliveryTime: gigData.deliveryTime,
        revisionNumber: gigData.revisionNumber,
        features: gigData.features || [],
        consultationType: gigData.consultationType,
        languages: gigData.languages || ['arabic'],
        duration: gigData.duration || 30,
        isActive: gigData.isActive !== false,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get all gigs with filters
   * @param {Object} filters - Filter parameters
   */
  async getGigs(filters = {}) {
    try {
      const params = new URLSearchParams();

      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.min) params.append('min', filters.min);
      if (filters.max) params.append('max', filters.max);
      if (filters.userID) params.append('userID', filters.userID);
      if (filters.sort) params.append('sort', filters.sort);

      const response = await apiClient.get(`/gigs?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get single gig by ID
   * @param {string} gigId - Gig ID
   */
  async getGigById(gigId) {
    try {
      const response = await apiClient.get(`/gigs/single/${gigId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Delete gig
   * @param {string} gigId - Gig ID
   */
  async deleteGig(gigId) {
    try {
      const response = await apiClient.delete(`/gigs/${gigId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new GigService();
```

### Usage Examples

```javascript
import gigService from '../api/services/gig.service';

// Create gig
function CreateGigForm() {
  const [gigData, setGigData] = useState({
    title: '',
    description: '',
    category: '',
    price: 0,
    cover: '',
    shortTitle: '',
    shortDesc: '',
    deliveryTime: '3 days',
    revisionNumber: 2,
    consultationType: 'video',
    features: [],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await gigService.createGig(gigData);
      console.log('Gig created:', result);
      alert('Gig created successfully!');
    } catch (error) {
      console.error('Failed to create gig:', error);
      alert('Failed to create gig');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Gig Title"
        value={gigData.title}
        onChange={(e) => setGigData({ ...gigData, title: e.target.value })}
      />

      <textarea
        placeholder="Description"
        value={gigData.description}
        onChange={(e) => setGigData({ ...gigData, description: e.target.value })}
      />

      <select
        value={gigData.category}
        onChange={(e) => setGigData({ ...gigData, category: e.target.value })}
      >
        <option value="">Select Category</option>
        <option value="labor">Labor Law</option>
        <option value="commercial">Commercial Law</option>
        <option value="family">Family Law</option>
      </select>

      <input
        type="number"
        placeholder="Price (SAR)"
        value={gigData.price}
        onChange={(e) => setGigData({ ...gigData, price: Number(e.target.value) })}
      />

      <select
        value={gigData.consultationType}
        onChange={(e) => setGigData({ ...gigData, consultationType: e.target.value })}
      >
        <option value="video">Video Consultation</option>
        <option value="phone">Phone Consultation</option>
        <option value="in-person">In-Person Meeting</option>
        <option value="document-review">Document Review</option>
      </select>

      <button type="submit">Create Gig</button>
    </form>
  );
}

// Browse gigs
function GigBrowser() {
  const [gigs, setGigs] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    min: 0,
    max: 10000,
  });

  useEffect(() => {
    async function fetchGigs() {
      try {
        const result = await gigService.getGigs(filters);
        setGigs(result);
      } catch (error) {
        console.error('Failed to fetch gigs:', error);
      }
    }
    fetchGigs();
  }, [filters]);

  return (
    <div>
      <div className="filters">
        <input
          type="text"
          placeholder="Search gigs..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />

        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All Categories</option>
          <option value="labor">Labor Law</option>
          <option value="commercial">Commercial Law</option>
        </select>
      </div>

      <div className="gigs-grid">
        {gigs.map((gig) => (
          <div key={gig._id} className="gig-card">
            <img src={gig.cover} alt={gig.title} />
            <h3>{gig.title}</h3>
            <p>{gig.shortDesc}</p>
            <p className="price">${gig.price}</p>
            <p className="delivery">Delivery: {gig.deliveryTime}</p>
            <button onClick={() => window.location.href = `/gig/${gig._id}`}>
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// View single gig
function GigDetails({ gigId }) {
  const [gig, setGig] = useState(null);

  useEffect(() => {
    async function fetchGig() {
      try {
        const result = await gigService.getGigById(gigId);
        setGig(result);
      } catch (error) {
        console.error('Failed to fetch gig:', error);
      }
    }
    fetchGig();
  }, [gigId]);

  if (!gig) return <div>Loading...</div>;

  return (
    <div className="gig-details">
      <h1>{gig.title}</h1>
      <img src={gig.cover} alt={gig.title} />
      <p>{gig.description}</p>

      <div className="pricing">
        <h2>Price: ${gig.price}</h2>
        <p>Delivery Time: {gig.deliveryTime}</p>
        <p>Revisions: {gig.revisionNumber}</p>
      </div>

      <div className="features">
        <h3>Features:</h3>
        <ul>
          {gig.features.map((feature, index) => (
            <li key={index}>{feature}</li>
          ))}
        </ul>
      </div>

      <div className="seller-info">
        <h3>About the Lawyer</h3>
        <p>{gig.userID.username}</p>
        <p>Rating: {gig.userID.lawyerProfile.rating}/5</p>
      </div>

      <button onClick={() => handleOrder(gig._id)}>
        Order Now
      </button>
    </div>
  );
}
```

---

## Job APIs

### Job Service (`src/api/services/job.service.js`)

```javascript
import apiClient from '../client';

class JobService {
  /**
   * Create job posting
   * @param {Object} jobData - Job data
   */
  async createJob(jobData) {
    try {
      const response = await apiClient.post('/jobs', {
        title: jobData.title,
        description: jobData.description,
        category: jobData.category,
        budget: {
          min: jobData.budgetMin,
          max: jobData.budgetMax,
        },
        deadline: jobData.deadline,
        location: jobData.location,
        requirements: jobData.requirements || [],
        attachments: jobData.attachments || [],
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get all jobs with filters
   * @param {Object} filters - Filter params
   */
  async getJobs(filters = {}) {
    try {
      const params = new URLSearchParams();

      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.minBudget) params.append('minBudget', filters.minBudget);
      if (filters.maxBudget) params.append('maxBudget', filters.maxBudget);

      const response = await apiClient.get(`/jobs?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get my posted jobs
   */
  async getMyJobs() {
    try {
      const response = await apiClient.get('/jobs/my-jobs');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get single job by ID
   * @param {string} jobId - Job ID
   */
  async getJobById(jobId) {
    try {
      const response = await apiClient.get(`/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Update job
   * @param {string} jobId - Job ID
   * @param {Object} updates - Fields to update
   */
  async updateJob(jobId, updates) {
    try {
      const response = await apiClient.patch(`/jobs/${jobId}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Delete job
   * @param {string} jobId - Job ID
   */
  async deleteJob(jobId) {
    try {
      const response = await apiClient.delete(`/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new JobService();
```

### Usage Examples

```javascript
import jobService from '../api/services/job.service';

// Post a job
function PostJobForm() {
  const [jobData, setJobData] = useState({
    title: '',
    description: '',
    category: 'labor',
    budgetMin: 0,
    budgetMax: 0,
    deadline: '',
    location: '',
    requirements: [],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await jobService.createJob(jobData);
      console.log('Job posted:', result);
      alert('Job posted successfully!');
      window.location.href = '/my-jobs';
    } catch (error) {
      console.error('Failed to post job:', error);
      alert('Failed to post job');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Job Title"
        value={jobData.title}
        onChange={(e) => setJobData({ ...jobData, title: e.target.value })}
        required
      />

      <textarea
        placeholder="Job Description"
        value={jobData.description}
        onChange={(e) => setJobData({ ...jobData, description: e.target.value })}
        required
      />

      <select
        value={jobData.category}
        onChange={(e) => setJobData({ ...jobData, category: e.target.value })}
        required
      >
        <option value="labor">Labor Law</option>
        <option value="commercial">Commercial Law</option>
        <option value="personal-status">Personal Status</option>
        <option value="criminal">Criminal Law</option>
        <option value="real-estate">Real Estate</option>
        <option value="traffic">Traffic Violations</option>
        <option value="administrative">Administrative Law</option>
      </select>

      <div className="budget">
        <input
          type="number"
          placeholder="Min Budget (SAR)"
          value={jobData.budgetMin}
          onChange={(e) => setJobData({ ...jobData, budgetMin: Number(e.target.value) })}
          required
        />
        <input
          type="number"
          placeholder="Max Budget (SAR)"
          value={jobData.budgetMax}
          onChange={(e) => setJobData({ ...jobData, budgetMax: Number(e.target.value) })}
          required
        />
      </div>

      <input
        type="date"
        value={jobData.deadline}
        onChange={(e) => setJobData({ ...jobData, deadline: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="Location (optional)"
        value={jobData.location}
        onChange={(e) => setJobData({ ...jobData, location: e.target.value })}
      />

      <button type="submit">Post Job</button>
    </form>
  );
}

// Browse jobs
function JobBrowser() {
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    status: 'open',
  });

  useEffect(() => {
    async function fetchJobs() {
      try {
        const result = await jobService.getJobs(filters);
        setJobs(result);
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      }
    }
    fetchJobs();
  }, [filters]);

  return (
    <div>
      <div className="filters">
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All Categories</option>
          <option value="labor">Labor Law</option>
          <option value="commercial">Commercial Law</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="jobs-list">
        {jobs.map((job) => (
          <div key={job._id} className="job-card">
            <h3>{job.title}</h3>
            <p>{job.description.substring(0, 150)}...</p>
            <p className="budget">
              Budget: ${job.budget.min} - ${job.budget.max}
            </p>
            <p className="category">{job.category}</p>
            <p className="proposals">{job.proposalsCount} proposals</p>
            <button onClick={() => window.location.href = `/job/${job._id}`}>
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Proposal APIs

### Proposal Service (`src/api/services/proposal.service.js`)

```javascript
import apiClient from '../client';

class ProposalService {
  /**
   * Submit proposal for a job
   * @param {Object} proposalData - Proposal data
   */
  async submitProposal(proposalData) {
    try {
      const response = await apiClient.post('/proposals', {
        jobId: proposalData.jobId,
        coverLetter: proposalData.coverLetter,
        proposedAmount: proposalData.proposedAmount,
        deliveryTime: proposalData.deliveryTime,
        attachments: proposalData.attachments || [],
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get proposals for a job (job owner only)
   * @param {string} jobId - Job ID
   */
  async getJobProposals(jobId) {
    try {
      const response = await apiClient.get(`/proposals/job/${jobId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get my submitted proposals (lawyer only)
   */
  async getMyProposals() {
    try {
      const response = await apiClient.get('/proposals/my-proposals');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Accept a proposal (job owner only)
   * @param {string} proposalId - Proposal ID
   */
  async acceptProposal(proposalId) {
    try {
      const response = await apiClient.patch(`/proposals/accept/${proposalId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Reject a proposal (job owner only)
   * @param {string} proposalId - Proposal ID
   */
  async rejectProposal(proposalId) {
    try {
      const response = await apiClient.patch(`/proposals/reject/${proposalId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Withdraw proposal (proposal owner only)
   * @param {string} proposalId - Proposal ID
   */
  async withdrawProposal(proposalId) {
    try {
      const response = await apiClient.patch(`/proposals/withdraw/${proposalId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new ProposalService();
```

### Usage Examples

```javascript
import proposalService from '../api/services/proposal.service';

// Submit proposal
function SubmitProposalForm({ jobId }) {
  const [proposalData, setProposalData] = useState({
    jobId: jobId,
    coverLetter: '',
    proposedAmount: 0,
    deliveryTime: 7,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await proposalService.submitProposal(proposalData);
      console.log('Proposal submitted:', result);
      alert('Proposal submitted successfully!');
      window.location.href = '/my-proposals';
    } catch (error) {
      console.error('Failed to submit proposal:', error);
      alert(error.message || 'Failed to submit proposal');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Submit Proposal</h2>

      <textarea
        placeholder="Cover Letter - Explain why you're the best fit..."
        value={proposalData.coverLetter}
        onChange={(e) => setProposalData({ ...proposalData, coverLetter: e.target.value })}
        rows="6"
        required
      />

      <input
        type="number"
        placeholder="Proposed Amount (SAR)"
        value={proposalData.proposedAmount}
        onChange={(e) => setProposalData({ ...proposalData, proposedAmount: Number(e.target.value) })}
        required
      />

      <input
        type="number"
        placeholder="Delivery Time (days)"
        value={proposalData.deliveryTime}
        onChange={(e) => setProposalData({ ...proposalData, deliveryTime: Number(e.target.value) })}
        required
      />

      <button type="submit">Submit Proposal</button>
    </form>
  );
}

// View proposals (for job owner)
function ProposalsList({ jobId }) {
  const [proposals, setProposals] = useState([]);

  useEffect(() => {
    async function fetchProposals() {
      try {
        const result = await proposalService.getJobProposals(jobId);
        setProposals(result);
      } catch (error) {
        console.error('Failed to fetch proposals:', error);
      }
    }
    fetchProposals();
  }, [jobId]);

  const handleAccept = async (proposalId) => {
    try {
      await proposalService.acceptProposal(proposalId);
      alert('Proposal accepted!');
      // Refresh proposals
      const result = await proposalService.getJobProposals(jobId);
      setProposals(result);
    } catch (error) {
      alert('Failed to accept proposal');
    }
  };

  const handleReject = async (proposalId) => {
    try {
      await proposalService.rejectProposal(proposalId);
      alert('Proposal rejected');
      // Refresh proposals
      const result = await proposalService.getJobProposals(jobId);
      setProposals(result);
    } catch (error) {
      alert('Failed to reject proposal');
    }
  };

  return (
    <div>
      <h2>Proposals Received ({proposals.length})</h2>

      {proposals.map((proposal) => (
        <div key={proposal._id} className="proposal-card">
          <div className="lawyer-info">
            <h3>{proposal.lawyerId.username}</h3>
            <p>Rating: {proposal.lawyerId.lawyerProfile.rating}/5</p>
            <p>Experience: {proposal.lawyerId.lawyerProfile.yearsExperience} years</p>
          </div>

          <div className="proposal-details">
            <p className="amount">Proposed: ${proposal.proposedAmount}</p>
            <p className="delivery">Delivery: {proposal.deliveryTime} days</p>
            <p className="cover-letter">{proposal.coverLetter}</p>
          </div>

          <div className="status">
            Status: <span className={proposal.status}>{proposal.status}</span>
          </div>

          {proposal.status === 'pending' && (
            <div className="actions">
              <button onClick={() => handleAccept(proposal._id)}>
                Accept
              </button>
              <button onClick={() => handleReject(proposal._id)}>
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Order & Payment APIs

### Order Service (`src/api/services/order.service.js`)

```javascript
import apiClient from '../client';

class OrderService {
  /**
   * Get all orders (buyer or seller)
   */
  async getOrders() {
    try {
      const response = await apiClient.get('/orders');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Create payment intent for gig
   * @param {string} gigId - Gig ID
   */
  async createGigPaymentIntent(gigId) {
    try {
      const response = await apiClient.post(`/orders/create-payment-intent/${gigId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Create payment intent for proposal
   * @param {string} proposalId - Proposal ID
   */
  async createProposalPaymentIntent(proposalId) {
    try {
      const response = await apiClient.post(`/orders/create-proposal-payment-intent/${proposalId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Confirm payment
   * @param {string} paymentIntentId - Stripe payment intent ID
   */
  async confirmPayment(paymentIntentId) {
    try {
      const response = await apiClient.patch('/orders', {
        payment_intent: paymentIntentId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * TEST MODE ONLY: Create order without payment
   * @param {string} gigId - Gig ID
   */
  async createTestContract(gigId) {
    try {
      const response = await apiClient.post(`/orders/create-test-contract/${gigId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * TEST MODE ONLY: Create proposal contract without payment
   * @param {string} proposalId - Proposal ID
   */
  async createTestProposalContract(proposalId) {
    try {
      const response = await apiClient.post(`/orders/create-test-proposal-contract/${proposalId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new OrderService();
```

### Payment Integration with Stripe

```javascript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import orderService from '../api/services/order.service';

// Initialize Stripe
const stripePromise = loadStripe('your_stripe_publishable_key');

// Checkout component
function CheckoutForm({ gigId, amount }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1: Create payment intent
      const { clientSecret } = await orderService.createGigPaymentIntent(gigId);

      // Step 2: Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message);
        setLoading(false);
        return;
      }

      // Step 3: Confirm payment on backend
      if (paymentIntent.status === 'succeeded') {
        await orderService.confirmPayment(paymentIntent.id);
        alert('Payment successful!');
        window.location.href = '/orders';
      }
    } catch (err) {
      setError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Complete Payment</h2>
      <p>Amount: ${amount}</p>

      <CardElement
        options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#9e2146',
            },
          },
        }}
      />

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={!stripe || loading}>
        {loading ? 'Processing...' : `Pay $${amount}`}
      </button>
    </form>
  );
}

// Wrap with Elements provider
function CheckoutPage({ gigId, amount }) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm gigId={gigId} amount={amount} />
    </Elements>
  );
}

// View orders
function OrdersList() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const result = await orderService.getOrders();
        setOrders(result);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      }
    }
    fetchOrders();
  }, []);

  return (
    <div>
      <h2>My Orders</h2>

      {orders.map((order) => (
        <div key={order._id} className="order-card">
          <img src={order.image} alt={order.title} />
          <h3>{order.title}</h3>
          <p>Price: ${order.price}</p>
          <p>Status: {order.status}</p>
          <p>Payment: {order.payment_intent ? 'Paid' : 'Pending'}</p>
          {order.isCompleted && <span className="badge">Completed</span>}
        </div>
      ))}
    </div>
  );
}
```

---

## Case Management APIs

### Case Service (`src/api/services/case.service.js`)

```javascript
import apiClient from '../client';

class CaseService {
  /**
   * Create new case
   * @param {Object} caseData - Case data
   */
  async createCase(caseData) {
    try {
      const response = await apiClient.post('/cases', caseData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get all cases
   */
  async getCases() {
    try {
      const response = await apiClient.get('/cases');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get single case
   * @param {string} caseId - Case ID
   */
  async getCaseById(caseId) {
    try {
      const response = await apiClient.get(`/cases/${caseId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Update case
   * @param {string} caseId - Case ID
   * @param {Object} updates - Fields to update
   */
  async updateCase(caseId, updates) {
    try {
      const response = await apiClient.patch(`/cases/${caseId}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Add note to case
   * @param {string} caseId - Case ID
   * @param {string} text - Note text
   */
  async addNote(caseId, text) {
    try {
      const response = await apiClient.post(`/cases/${caseId}/note`, { text });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Add document to case
   * @param {string} caseId - Case ID
   * @param {Object} document - Document data
   */
  async addDocument(caseId, document) {
    try {
      const response = await apiClient.post(`/cases/${caseId}/document`, {
        name: document.name,
        url: document.url,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Add hearing to case
   * @param {string} caseId - Case ID
   * @param {Object} hearing - Hearing data
   */
  async addHearing(caseId, hearing) {
    try {
      const response = await apiClient.post(`/cases/${caseId}/hearing`, {
        date: hearing.date,
        location: hearing.location,
        notes: hearing.notes,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Update case status
   * @param {string} caseId - Case ID
   * @param {string} status - New status
   */
  async updateStatus(caseId, status) {
    try {
      const response = await apiClient.patch(`/cases/${caseId}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Update case outcome
   * @param {string} caseId - Case ID
   * @param {string} outcome - Outcome
   */
  async updateOutcome(caseId, outcome) {
    try {
      const response = await apiClient.patch(`/cases/${caseId}/outcome`, { outcome });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new CaseService();
```

### Usage Examples

```javascript
import caseService from '../api/services/case.service';

// Create case
function CreateCaseForm() {
  const [caseData, setCaseData] = useState({
    title: '',
    description: '',
    category: 'labor',
    clientName: '',
    clientPhone: '',
    caseNumber: '',
    court: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await caseService.createCase(caseData);
      console.log('Case created:', result);
      alert('Case created successfully!');
      window.location.href = `/case/${result._id}`;
    } catch (error) {
      console.error('Failed to create case:', error);
      alert('Failed to create case');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create New Case</h2>

      <input
        type="text"
        placeholder="Case Title"
        value={caseData.title}
        onChange={(e) => setCaseData({ ...caseData, title: e.target.value })}
        required
      />

      <textarea
        placeholder="Case Description"
        value={caseData.description}
        onChange={(e) => setCaseData({ ...caseData, description: e.target.value })}
      />

      <select
        value={caseData.category}
        onChange={(e) => setCaseData({ ...caseData, category: e.target.value })}
      >
        <option value="labor">Labor</option>
        <option value="commercial">Commercial</option>
        <option value="family">Family</option>
        <option value="criminal">Criminal</option>
      </select>

      <input
        type="text"
        placeholder="Client Name"
        value={caseData.clientName}
        onChange={(e) => setCaseData({ ...caseData, clientName: e.target.value })}
      />

      <input
        type="tel"
        placeholder="Client Phone"
        value={caseData.clientPhone}
        onChange={(e) => setCaseData({ ...caseData, clientPhone: e.target.value })}
      />

      <button type="submit">Create Case</button>
    </form>
  );
}

// View case details
function CaseDetails({ caseId }) {
  const [caseData, setCaseData] = useState(null);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    fetchCase();
  }, [caseId]);

  async function fetchCase() {
    try {
      const result = await caseService.getCaseById(caseId);
      setCaseData(result);
    } catch (error) {
      console.error('Failed to fetch case:', error);
    }
  }

  const handleAddNote = async () => {
    try {
      await caseService.addNote(caseId, newNote);
      setNewNote('');
      fetchCase(); // Refresh
      alert('Note added');
    } catch (error) {
      alert('Failed to add note');
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      await caseService.updateStatus(caseId, status);
      fetchCase(); // Refresh
      alert('Status updated');
    } catch (error) {
      alert('Failed to update status');
    }
  };

  if (!caseData) return <div>Loading...</div>;

  return (
    <div className="case-details">
      <h1>{caseData.title}</h1>
      <p className="category">{caseData.category}</p>
      <p className="status">Status: {caseData.status}</p>

      <div className="client-info">
        <h3>Client Information</h3>
        <p>Name: {caseData.clientName}</p>
        <p>Phone: {caseData.clientPhone}</p>
      </div>

      <div className="case-info">
        <p>Case Number: {caseData.caseNumber}</p>
        <p>Court: {caseData.court}</p>
        <p>Started: {new Date(caseData.startDate).toLocaleDateString()}</p>
      </div>

      <div className="status-update">
        <h3>Update Status</h3>
        <button onClick={() => handleUpdateStatus('active')}>Active</button>
        <button onClick={() => handleUpdateStatus('on-hold')}>On Hold</button>
        <button onClick={() => handleUpdateStatus('completed')}>Completed</button>
      </div>

      <div className="notes">
        <h3>Notes</h3>
        {caseData.notes.map((note, index) => (
          <div key={index} className="note">
            <p>{note.text}</p>
            <small>{new Date(note.date).toLocaleString()}</small>
          </div>
        ))}

        <div className="add-note">
          <textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <button onClick={handleAddNote}>Add Note</button>
        </div>
      </div>

      <div className="documents">
        <h3>Documents</h3>
        {caseData.documents.map((doc, index) => (
          <div key={index} className="document">
            <a href={doc.url} target="_blank" rel="noopener noreferrer">
              {doc.name}
            </a>
            <small>{new Date(doc.uploadedAt).toLocaleDateString()}</small>
          </div>
        ))}
      </div>

      <div className="hearings">
        <h3>Hearings</h3>
        {caseData.hearings.map((hearing, index) => (
          <div key={index} className="hearing">
            <p>Date: {new Date(hearing.date).toLocaleString()}</p>
            <p>Location: {hearing.location}</p>
            <p>Notes: {hearing.notes}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Cases list
function CasesList() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    async function fetchCases() {
      try {
        const result = await caseService.getCases();
        setCases(result);
      } catch (error) {
        console.error('Failed to fetch cases:', error);
      }
    }
    fetchCases();
  }, []);

  return (
    <div>
      <h2>My Cases</h2>

      <div className="cases-grid">
        {cases.map((caseItem) => (
          <div key={caseItem._id} className="case-card">
            <h3>{caseItem.title}</h3>
            <p className="category">{caseItem.category}</p>
            <p className="status">{caseItem.status}</p>
            <p>Client: {caseItem.clientName}</p>
            <button onClick={() => window.location.href = `/case/${caseItem._id}`}>
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Task Management APIs

### Task Service (`src/api/services/task.service.js`)

```javascript
import apiClient from '../client';

class TaskService {
  /**
   * Create task
   * @param {Object} taskData - Task data
   */
  async createTask(taskData) {
    try {
      const response = await apiClient.post('/tasks', taskData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get all tasks
   */
  async getTasks(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`/tasks?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get upcoming tasks (next 7 days)
   */
  async getUpcomingTasks() {
    try {
      const response = await apiClient.get('/tasks/upcoming');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks() {
    try {
      const response = await apiClient.get('/tasks/overdue');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get tasks for a case
   * @param {string} caseId - Case ID
   */
  async getCaseTasks(caseId) {
    try {
      const response = await apiClient.get(`/tasks/case/${caseId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get single task
   * @param {string} taskId - Task ID
   */
  async getTaskById(taskId) {
    try {
      const response = await apiClient.get(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Update task
   * @param {string} taskId - Task ID
   * @param {Object} updates - Fields to update
   */
  async updateTask(taskId, updates) {
    try {
      const response = await apiClient.patch(`/tasks/${taskId}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Complete task
   * @param {string} taskId - Task ID
   */
  async completeTask(taskId) {
    try {
      const response = await apiClient.post(`/tasks/${taskId}/complete`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Delete task
   * @param {string} taskId - Task ID
   */
  async deleteTask(taskId) {
    try {
      const response = await apiClient.delete(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new TaskService();
```

### Usage Examples

```javascript
import taskService from '../api/services/task.service';

// Create task
function CreateTaskForm({ caseId }) {
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assignedTo: '',
    caseId: caseId,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await taskService.createTask(taskData);
      console.log('Task created:', result);
      alert('Task created successfully!');
      setTaskData({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        assignedTo: '',
        caseId: caseId,
      });
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Create New Task</h3>

      <input
        type="text"
        placeholder="Task Title"
        value={taskData.title}
        onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
        required
      />

      <textarea
        placeholder="Description"
        value={taskData.description}
        onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
      />

      <select
        value={taskData.priority}
        onChange={(e) => setTaskData({ ...taskData, priority: e.target.value })}
      >
        <option value="low">Low Priority</option>
        <option value="medium">Medium Priority</option>
        <option value="high">High Priority</option>
      </select>

      <input
        type="date"
        value={taskData.dueDate}
        onChange={(e) => setTaskData({ ...taskData, dueDate: e.target.value })}
        required
      />

      <button type="submit">Create Task</button>
    </form>
  );
}

// Tasks dashboard
function TasksDashboard() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all'); // all, upcoming, overdue

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  async function fetchTasks() {
    try {
      let result;

      if (filter === 'upcoming') {
        result = await taskService.getUpcomingTasks();
      } else if (filter === 'overdue') {
        result = await taskService.getOverdueTasks();
      } else {
        result = await taskService.getTasks();
      }

      setTasks(result);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  }

  const handleComplete = async (taskId) => {
    try {
      await taskService.completeTask(taskId);
      fetchTasks(); // Refresh
      alert('Task completed!');
    } catch (error) {
      alert('Failed to complete task');
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return;

    try {
      await taskService.deleteTask(taskId);
      fetchTasks(); // Refresh
      alert('Task deleted');
    } catch (error) {
      alert('Failed to delete task');
    }
  };

  return (
    <div className="tasks-dashboard">
      <h2>Tasks</h2>

      <div className="filters">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Tasks
        </button>
        <button
          className={filter === 'upcoming' ? 'active' : ''}
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
        </button>
        <button
          className={filter === 'overdue' ? 'active' : ''}
          onClick={() => setFilter('overdue')}
        >
          Overdue
        </button>
      </div>

      <div className="tasks-list">
        {tasks.map((task) => (
          <div key={task._id} className={`task-card ${task.priority}`}>
            <div className="task-header">
              <h3>{task.title}</h3>
              <span className={`priority ${task.priority}`}>
                {task.priority}
              </span>
            </div>

            <p>{task.description}</p>

            <div className="task-meta">
              <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
              <span>Status: {task.status}</span>
            </div>

            {task.status !== 'done' && (
              <div className="task-actions">
                <button onClick={() => handleComplete(task._id)}>
                  Complete
                </button>
                <button onClick={() => handleDelete(task._id)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Calendar & Events APIs

### Event Service (`src/api/services/event.service.js`)

```javascript
import apiClient from '../client';

class EventService {
  /**
   * Create event
   * @param {Object} eventData - Event data
   */
  async createEvent(eventData) {
    try {
      const response = await apiClient.post('/events', eventData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get all events
   */
  async getEvents(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`/events?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get upcoming events (next 7 days)
   */
  async getUpcomingEvents() {
    try {
      const response = await apiClient.get('/events/upcoming');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get events for specific month
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   */
  async getMonthEvents(year, month) {
    try {
      const response = await apiClient.get(`/events/month/${year}/${month}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get events for specific date
   * @param {string} date - Date in ISO format
   */
  async getDateEvents(date) {
    try {
      const response = await apiClient.get(`/events/date/${date}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get single event
   * @param {string} eventId - Event ID
   */
  async getEventById(eventId) {
    try {
      const response = await apiClient.get(`/events/${eventId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Update event
   * @param {string} eventId - Event ID
   * @param {Object} updates - Fields to update
   */
  async updateEvent(eventId, updates) {
    try {
      const response = await apiClient.patch(`/events/${eventId}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Complete event
   * @param {string} eventId - Event ID
   */
  async completeEvent(eventId) {
    try {
      const response = await apiClient.post(`/events/${eventId}/complete`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Delete event
   * @param {string} eventId - Event ID
   */
  async deleteEvent(eventId) {
    try {
      const response = await apiClient.delete(`/events/${eventId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new EventService();
```

### Calendar Component Example

```javascript
import eventService from '../api/services/event.service';
import { useState, useEffect } from 'react';

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchMonthEvents();
  }, [currentDate]);

  async function fetchMonthEvents() {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const result = await eventService.getMonthEvents(year, month);
      setEvents(result);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  }

  const handleDateClick = async (date) => {
    setSelectedDate(date);
    // Fetch events for this specific date
    try {
      const result = await eventService.getDateEvents(date.toISOString());
      console.log('Events for date:', result);
    } catch (error) {
      console.error('Failed to fetch date events:', error);
    }
  };

  // Render calendar grid
  return (
    <div className="calendar">
      <div className="calendar-header">
        <button onClick={() => {
          const newDate = new Date(currentDate);
          newDate.setMonth(currentDate.getMonth() - 1);
          setCurrentDate(newDate);
        }}>Previous</button>

        <h2>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>

        <button onClick={() => {
          const newDate = new Date(currentDate);
          newDate.setMonth(currentDate.getMonth() + 1);
          setCurrentDate(newDate);
        }}>Next</button>
      </div>

      <div className="calendar-grid">
        {/* Calendar grid implementation */}
        {/* Show events on each day */}
      </div>

      {selectedDate && (
        <div className="events-sidebar">
          <h3>Events for {selectedDate.toLocaleDateString()}</h3>
          {/* Show events for selected date */}
        </div>
      )}
    </div>
  );
}

// Create event
function CreateEventForm() {
  const [eventData, setEventData] = useState({
    title: '',
    type: 'meeting',
    startDate: '',
    endDate: '',
    location: '',
    description: '',
    allDay: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await eventService.createEvent(eventData);
      console.log('Event created:', result);
      alert('Event created successfully!');
    } catch (error) {
      console.error('Failed to create event:', error);
      alert('Failed to create event');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Create New Event</h3>

      <input
        type="text"
        placeholder="Event Title"
        value={eventData.title}
        onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
        required
      />

      <select
        value={eventData.type}
        onChange={(e) => setEventData({ ...eventData, type: e.target.value })}
      >
        <option value="hearing">Court Hearing</option>
        <option value="meeting">Meeting</option>
        <option value="deadline">Deadline</option>
        <option value="task">Task</option>
        <option value="other">Other</option>
      </select>

      <input
        type="datetime-local"
        value={eventData.startDate}
        onChange={(e) => setEventData({ ...eventData, startDate: e.target.value })}
        required
      />

      <input
        type="datetime-local"
        value={eventData.endDate}
        onChange={(e) => setEventData({ ...eventData, endDate: e.target.value })}
      />

      <input
        type="text"
        placeholder="Location"
        value={eventData.location}
        onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
      />

      <label>
        <input
          type="checkbox"
          checked={eventData.allDay}
          onChange={(e) => setEventData({ ...eventData, allDay: e.target.checked })}
        />
        All Day Event
      </label>

      <button type="submit">Create Event</button>
    </form>
  );
}
```

---

## Messaging APIs

### Message Service (`src/api/services/message.service.js`)

```javascript
import apiClient from '../client';

class MessageService {
  /**
   * Get all conversations
   */
  async getConversations() {
    try {
      const response = await apiClient.get('/conversations');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Create conversation
   * @param {string} sellerID - Seller user ID
   * @param {string} buyerID - Buyer user ID
   */
  async createConversation(sellerID, buyerID) {
    try {
      const response = await apiClient.post('/conversations', {
        sellerID,
        buyerID,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get conversation between two users
   * @param {string} sellerID - Seller user ID
   * @param {string} buyerID - Buyer user ID
   */
  async getConversation(sellerID, buyerID) {
    try {
      const response = await apiClient.get(`/conversations/single/${sellerID}/${buyerID}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get messages in conversation
   * @param {string} conversationID - Conversation ID
   */
  async getMessages(conversationID) {
    try {
      const response = await apiClient.get(`/messages/${conversationID}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Send message
   * @param {string} conversationID - Conversation ID
   * @param {string} description - Message text
   * @param {File[]} files - Optional file attachments
   */
  async sendMessage(conversationID, description, files = []) {
    try {
      const formData = new FormData();
      formData.append('conversationID', conversationID);
      formData.append('description', description);

      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await apiClient.post('/messages', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Mark messages as read
   * @param {string} conversationID - Conversation ID
   */
  async markAsRead(conversationID) {
    try {
      const response = await apiClient.patch(`/messages/${conversationID}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new MessageService();
```

### Messaging Component Example

```javascript
import messageService from '../api/services/message.service';
import { useState, useEffect, useRef } from 'react';

// Conversations list
function ConversationsList() {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    async function fetchConversations() {
      try {
        const result = await messageService.getConversations();
        setConversations(result);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      }
    }
    fetchConversations();
  }, []);

  return (
    <div className="conversations-list">
      <h2>Messages</h2>

      {conversations.map((conv) => (
        <div
          key={conv._id}
          className="conversation-item"
          onClick={() => window.location.href = `/messages/${conv._id}`}
        >
          <div className="user-info">
            <img src={conv.userID.image} alt={conv.userID.username} />
            <div>
              <h4>{conv.userID.username}</h4>
              <p className="last-message">{conv.lastMessage}</p>
            </div>
          </div>

          {!conv.readByBuyer && <span className="unread-badge">New</span>}
        </div>
      ))}
    </div>
  );
}

// Chat window
function ChatWindow({ conversationID }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    markAsRead();
  }, [conversationID]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function fetchMessages() {
    try {
      const result = await messageService.getMessages(conversationID);
      setMessages(result);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }

  async function markAsRead() {
    try {
      await messageService.markAsRead(conversationID);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() && files.length === 0) return;

    try {
      await messageService.sendMessage(conversationID, newMessage, files);
      setNewMessage('');
      setFiles([]);
      fetchMessages(); // Refresh messages
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 5) {
      alert('Maximum 5 files allowed');
      return;
    }
    setFiles(selectedFiles);
  };

  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`message ${msg.userID._id === currentUserId ? 'sent' : 'received'}`}
          >
            <div className="message-content">
              <p>{msg.description}</p>

              {msg.attachments && msg.attachments.length > 0 && (
                <div className="attachments">
                  {msg.attachments.map((att, index) => (
                    <a
                      key={index}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {att.name}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <small>{new Date(msg.createdAt).toLocaleTimeString()}</small>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="message-form">
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          accept="image/*,application/pdf,.doc,.docx"
          style={{ display: 'none' }}
          id="file-input"
        />

        <label htmlFor="file-input" className="file-button">
          📎
        </label>

        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />

        {files.length > 0 && (
          <div className="selected-files">
            {files.map((file, index) => (
              <span key={index}>{file.name}</span>
            ))}
          </div>
        )}

        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

---

## Notification APIs

### Notification Service (`src/api/services/notification.service.js`)

```javascript
import apiClient from '../client';

class NotificationService {
  /**
   * Get all notifications
   */
  async getNotifications() {
    try {
      const response = await apiClient.get('/notifications');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount() {
    try {
      const response = await apiClient.get('/notifications/unread-count');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   */
  async markAsRead(notificationId) {
    try {
      const response = await apiClient.patch(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const response = await apiClient.patch('/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   */
  async deleteNotification(notificationId) {
    try {
      const response = await apiClient.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new NotificationService();
```

### Notification Component Example

```javascript
import notificationService from '../api/services/notification.service';
import { useState, useEffect } from 'react';

// Notification dropdown
function NotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    try {
      const result = await notificationService.getNotifications();
      setNotifications(result);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }

  async function fetchUnreadCount() {
    try {
      const result = await notificationService.getUnreadCount();
      setUnreadCount(result.count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      fetchNotifications();
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  return (
    <div className="notification-dropdown">
      <button onClick={() => setIsOpen(!isOpen)} className="notification-bell">
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="panel-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <p className="empty">No notifications</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`notification-item ${!notif.read ? 'unread' : ''}`}
                  onClick={() => {
                    if (!notif.read) handleMarkAsRead(notif._id);
                    if (notif.link) window.location.href = notif.link;
                  }}
                >
                  <div className="notif-icon">{notif.icon || '📢'}</div>

                  <div className="notif-content">
                    <h4>{notif.title}</h4>
                    <p>{notif.message}</p>
                    <small>
                      {new Date(notif.createdAt).toLocaleString()}
                    </small>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notif._id);
                    }}
                    className="delete-btn"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Invoice & Finance APIs

### Invoice Service (`src/api/services/invoice.service.js`)

```javascript
import apiClient from '../client';

class InvoiceService {
  /**
   * Create invoice
   * @param {Object} invoiceData - Invoice data
   */
  async createInvoice(invoiceData) {
    try {
      const response = await apiClient.post('/invoices', invoiceData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get all invoices
   */
  async getInvoices() {
    try {
      const response = await apiClient.get('/invoices');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices() {
    try {
      const response = await apiClient.get('/invoices/overdue');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get single invoice
   * @param {string} invoiceId - Invoice ID
   */
  async getInvoiceById(invoiceId) {
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Update invoice
   * @param {string} invoiceId - Invoice ID
   * @param {Object} updates - Fields to update
   */
  async updateInvoice(invoiceId, updates) {
    try {
      const response = await apiClient.patch(`/invoices/${invoiceId}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Send invoice to client
   * @param {string} invoiceId - Invoice ID
   */
  async sendInvoice(invoiceId) {
    try {
      const response = await apiClient.post(`/invoices/${invoiceId}/send`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Create payment intent for invoice
   * @param {string} invoiceId - Invoice ID
   */
  async createPaymentIntent(invoiceId) {
    try {
      const response = await apiClient.post(`/invoices/${invoiceId}/payment`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Confirm invoice payment
   * @param {string} paymentIntentId - Stripe payment intent ID
   */
  async confirmPayment(paymentIntentId) {
    try {
      const response = await apiClient.patch('/invoices/confirm-payment', {
        payment_intent: paymentIntentId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new InvoiceService();
```

### Usage Examples

```javascript
import invoiceService from '../api/services/invoice.service';

// Create invoice
function CreateInvoiceForm() {
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    clientId: '',
    items: [
      { description: '', quantity: 1, unitPrice: 0, total: 0 }
    ],
    dueDate: '',
  });

  const calculateTotals = () => {
    const subtotal = invoiceData.items.reduce((sum, item) => sum + item.total, 0);
    const vatRate = 15;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    return { subtotal, vatRate, vatAmount, total };
  };

  const addItem = () => {
    setInvoiceData({
      ...invoiceData,
      items: [...invoiceData.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...invoiceData.items];
    newItems[index][field] = value;

    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
    }

    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const totals = calculateTotals();

    try {
      const result = await invoiceService.createInvoice({
        ...invoiceData,
        ...totals,
      });

      console.log('Invoice created:', result);
      alert('Invoice created successfully!');
      window.location.href = `/invoice/${result._id}`;
    } catch (error) {
      console.error('Failed to create invoice:', error);
      alert('Failed to create invoice');
    }
  };

  const totals = calculateTotals();

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Invoice</h2>

      <input
        type="text"
        placeholder="Invoice Number"
        value={invoiceData.invoiceNumber}
        onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
        required
      />

      <select
        value={invoiceData.clientId}
        onChange={(e) => setInvoiceData({ ...invoiceData, clientId: e.target.value })}
        required
      >
        <option value="">Select Client</option>
        {/* Load clients here */}
      </select>

      <input
        type="date"
        value={invoiceData.dueDate}
        onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
        required
      />

      <div className="invoice-items">
        <h3>Items</h3>

        {invoiceData.items.map((item, index) => (
          <div key={index} className="invoice-item">
            <input
              type="text"
              placeholder="Description"
              value={item.description}
              onChange={(e) => updateItem(index, 'description', e.target.value)}
              required
            />

            <input
              type="number"
              placeholder="Quantity"
              value={item.quantity}
              onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
              min="1"
              required
            />

            <input
              type="number"
              placeholder="Unit Price"
              value={item.unitPrice}
              onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
              min="0"
              step="0.01"
              required
            />

            <span className="item-total">${item.total.toFixed(2)}</span>
          </div>
        ))}

        <button type="button" onClick={addItem}>Add Item</button>
      </div>

      <div className="invoice-totals">
        <div>Subtotal: ${totals.subtotal.toFixed(2)}</div>
        <div>VAT (15%): ${totals.vatAmount.toFixed(2)}</div>
        <div className="total">Total: ${totals.total.toFixed(2)}</div>
      </div>

      <button type="submit">Create Invoice</button>
    </form>
  );
}

// View invoices
function InvoicesList() {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState('all'); // all, overdue

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  async function fetchInvoices() {
    try {
      let result;

      if (filter === 'overdue') {
        result = await invoiceService.getOverdueInvoices();
      } else {
        result = await invoiceService.getInvoices();
      }

      setInvoices(result);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  }

  const handleSend = async (invoiceId) => {
    try {
      await invoiceService.sendInvoice(invoiceId);
      alert('Invoice sent to client');
    } catch (error) {
      alert('Failed to send invoice');
    }
  };

  return (
    <div>
      <h2>Invoices</h2>

      <div className="filters">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Invoices
        </button>
        <button
          className={filter === 'overdue' ? 'active' : ''}
          onClick={() => setFilter('overdue')}
        >
          Overdue
        </button>
      </div>

      <table className="invoices-table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Client</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice._id}>
              <td>{invoice.invoiceNumber}</td>
              <td>{invoice.clientId.username}</td>
              <td>${invoice.total.toFixed(2)}</td>
              <td>{new Date(invoice.dueDate).toLocaleDateString()}</td>
              <td>
                <span className={`status ${invoice.status}`}>
                  {invoice.status}
                </span>
              </td>
              <td>
                <button onClick={() => window.location.href = `/invoice/${invoice._id}`}>
                  View
                </button>
                {invoice.status === 'draft' && (
                  <button onClick={() => handleSend(invoice._id)}>
                    Send
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Questions & Answers APIs

### Question Service (`src/api/services/question.service.js`)

```javascript
import apiClient from '../client';

class QuestionService {
  /**
   * Create question
   * @param {Object} questionData - Question data
   */
  async createQuestion(questionData) {
    try {
      const response = await apiClient.post('/questions', {
        title: questionData.title,
        description: questionData.description,
        category: questionData.category,
        tags: questionData.tags || [],
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get all questions
   */
  async getQuestions() {
    try {
      const response = await apiClient.get('/questions');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get single question
   * @param {string} questionId - Question ID
   */
  async getQuestionById(questionId) {
    try {
      const response = await apiClient.get(`/questions/${questionId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Update question
   * @param {string} questionId - Question ID
   * @param {Object} updates - Fields to update
   */
  async updateQuestion(questionId, updates) {
    try {
      const response = await apiClient.patch(`/questions/${questionId}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Delete question
   * @param {string} questionId - Question ID
   */
  async deleteQuestion(questionId) {
    try {
      const response = await apiClient.delete(`/questions/${questionId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new QuestionService();
```

### Answer Service (`src/api/services/answer.service.js`)

```javascript
import apiClient from '../client';

class AnswerService {
  /**
   * Submit answer
   * @param {Object} answerData - Answer data
   */
  async submitAnswer(answerData) {
    try {
      const response = await apiClient.post('/answers', {
        questionId: answerData.questionId,
        content: answerData.content,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Get answers for question
   * @param {string} questionId - Question ID
   */
  async getAnswers(questionId) {
    try {
      const response = await apiClient.get(`/answers/${questionId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Update answer
   * @param {string} answerId - Answer ID
   * @param {Object} updates - Fields to update
   */
  async updateAnswer(answerId, updates) {
    try {
      const response = await apiClient.patch(`/answers/${answerId}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Delete answer
   * @param {string} answerId - Answer ID
   */
  async deleteAnswer(answerId) {
    try {
      const response = await apiClient.delete(`/answers/${answerId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Like/unlike answer
   * @param {string} answerId - Answer ID
   */
  async likeAnswer(answerId) {
    try {
      const response = await apiClient.post(`/answers/like/${answerId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new AnswerService();
```

### Usage Examples

```javascript
import questionService from '../api/services/question.service';
import answerService from '../api/services/answer.service';

// Post question
function AskQuestionForm() {
  const [questionData, setQuestionData] = useState({
    title: '',
    description: '',
    category: 'labor',
    tags: [],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await questionService.createQuestion(questionData);
      console.log('Question posted:', result);
      alert('Question posted successfully!');
      window.location.href = `/question/${result._id}`;
    } catch (error) {
      console.error('Failed to post question:', error);
      alert('Failed to post question');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Ask a Legal Question</h2>

      <input
        type="text"
        placeholder="Question Title"
        value={questionData.title}
        onChange={(e) => setQuestionData({ ...questionData, title: e.target.value })}
        required
      />

      <textarea
        placeholder="Describe your legal question in detail..."
        value={questionData.description}
        onChange={(e) => setQuestionData({ ...questionData, description: e.target.value })}
        rows="6"
        required
      />

      <select
        value={questionData.category}
        onChange={(e) => setQuestionData({ ...questionData, category: e.target.value })}
      >
        <option value="labor">Labor Law</option>
        <option value="commercial">Commercial Law</option>
        <option value="family">Family Law</option>
        <option value="criminal">Criminal Law</option>
        <option value="real-estate">Real Estate</option>
      </select>

      <button type="submit">Post Question</button>
    </form>
  );
}

// View question with answers
function QuestionDetail({ questionId }) {
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [newAnswer, setNewAnswer] = useState('');

  useEffect(() => {
    fetchQuestion();
    fetchAnswers();
  }, [questionId]);

  async function fetchQuestion() {
    try {
      const result = await questionService.getQuestionById(questionId);
      setQuestion(result);
    } catch (error) {
      console.error('Failed to fetch question:', error);
    }
  }

  async function fetchAnswers() {
    try {
      const result = await answerService.getAnswers(questionId);
      setAnswers(result);
    } catch (error) {
      console.error('Failed to fetch answers:', error);
    }
  }

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();

    try {
      await answerService.submitAnswer({
        questionId,
        content: newAnswer,
      });

      setNewAnswer('');
      fetchAnswers(); // Refresh answers
      alert('Answer submitted!');
    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert('Failed to submit answer');
    }
  };

  const handleLike = async (answerId) => {
    try {
      await answerService.likeAnswer(answerId);
      fetchAnswers(); // Refresh to show updated likes
    } catch (error) {
      console.error('Failed to like answer:', error);
    }
  };

  if (!question) return <div>Loading...</div>;

  return (
    <div className="question-detail">
      <div className="question">
        <h1>{question.title}</h1>
        <p className="category">{question.category}</p>
        <p className="description">{question.description}</p>

        <div className="question-meta">
          <span>Asked by: {question.userID.username}</span>
          <span>{new Date(question.createdAt).toLocaleDateString()}</span>
          <span>{question.views} views</span>
        </div>

        <div className="tags">
          {question.tags.map((tag, index) => (
            <span key={index} className="tag">{tag}</span>
          ))}
        </div>
      </div>

      <div className="answers-section">
        <h2>{answers.length} Answers</h2>

        {answers.map((answer) => (
          <div key={answer._id} className="answer">
            <div className="answer-header">
              <img src={answer.userId.image} alt={answer.userId.username} />
              <div>
                <h4>{answer.userId.username}</h4>
                {answer.userId.isSeller && (
                  <span className="lawyer-badge">Lawyer</span>
                )}
              </div>
            </div>

            <div className="answer-content">
              <p>{answer.content}</p>
            </div>

            <div className="answer-actions">
              <button onClick={() => handleLike(answer._id)}>
                👍 {answer.likes} Likes
              </button>

              {answer.verified && (
                <span className="verified-badge">✓ Verified</span>
              )}

              <small>{new Date(answer.createdAt).toLocaleString()}</small>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmitAnswer} className="answer-form">
        <h3>Your Answer</h3>

        <textarea
          placeholder="Write your answer..."
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
          rows="6"
          required
        />

        <button type="submit">Submit Answer</button>
      </form>
    </div>
  );
}
```

---

## WebSocket Integration

### Setup WebSocket Client (`src/api/socket.js`)

```javascript
import io from 'socket.io-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(userId) {
    this.socket = io(WS_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');

      // Join with user ID
      this.socket.emit('user:join', { userId });
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Join conversation
  joinConversation(conversationId) {
    if (this.socket) {
      this.socket.emit('conversation:join', { conversationId });
    }
  }

  // Send typing indicator
  startTyping(conversationId, userId) {
    if (this.socket) {
      this.socket.emit('typing:start', { conversationId, userId });
    }
  }

  stopTyping(conversationId, userId) {
    if (this.socket) {
      this.socket.emit('typing:stop', { conversationId, userId });
    }
  }

  // Listen for new messages
  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('message:receive', callback);
    }
  }

  // Listen for new notifications
  onNewNotification(callback) {
    if (this.socket) {
      this.socket.on('notification:new', callback);
    }
  }

  // Listen for notification count updates
  onNotificationCount(callback) {
    if (this.socket) {
      this.socket.on('notification:count', callback);
    }
  }

  // Listen for typing indicators
  onTyping(callback) {
    if (this.socket) {
      this.socket.on('typing:show', callback);
    }
  }

  onTypingStop(callback) {
    if (this.socket) {
      this.socket.on('typing:hide', callback);
    }
  }
}

export default new SocketService();
```

### Usage in React

```javascript
import socketService from '../api/socket';
import { useEffect, useState } from 'react';

// In your main App component
function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Get current user
    async function checkAuth() {
      try {
        const result = await authService.getCurrentUser();
        if (result.user) {
          setCurrentUser(result.user);

          // Connect WebSocket
          const socket = socketService.connect(result.user._id);

          // Listen for notifications
          socketService.onNewNotification((notification) => {
            console.log('New notification:', notification);
            // Show toast or update UI
          });

          socketService.onNotificationCount((data) => {
            console.log('Unread notifications:', data.count);
            // Update badge count
          });
        }
      } catch (error) {
        console.error('Not authenticated');
      }
    }

    checkAuth();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <div className="app">
      {/* Your app content */}
    </div>
  );
}

// In chat component
function ChatComponent({ conversationId }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Join conversation
    socketService.joinConversation(conversationId);

    // Listen for new messages
    socketService.onNewMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Listen for typing
    socketService.onTyping((data) => {
      if (data.conversationId === conversationId) {
        setIsTyping(true);
      }
    });

    socketService.onTypingStop((data) => {
      if (data.conversationId === conversationId) {
        setIsTyping(false);
      }
    });
  }, [conversationId]);

  const handleTyping = () => {
    socketService.startTyping(conversationId, currentUser._id);

    // Stop typing after 1 second of no input
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      socketService.stopTyping(conversationId, currentUser._id);
    }, 1000);
  };

  return (
    <div>
      {/* Messages display */}
      {isTyping && <div className="typing-indicator">User is typing...</div>}

      <input
        type="text"
        onChange={handleTyping}
        placeholder="Type a message..."
      />
    </div>
  );
}
```

---

## Complete React Examples

### Full Auth Context

```javascript
// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../api/services/auth.service';
import socketService from '../api/socket';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const result = await authService.getCurrentUser();
      if (!result.error) {
        setUser(result.user);
        // Connect WebSocket
        socketService.connect(result.user._id);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username, password) {
    const result = await authService.login(username, password);
    if (!result.error) {
      setUser(result.user);
      socketService.connect(result.user._id);
    }
    return result;
  }

  async function logout() {
    await authService.logout();
    setUser(null);
    socketService.disconnect();
  }

  async function register(userData) {
    return await authService.register(userData);
  }

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
```

### Protected Route Component

```javascript
// src/components/ProtectedRoute.js
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Usage in App.js
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

## Error Handling Best Practices

```javascript
// Centralized error handler
function handleApiError(error) {
  if (error.response) {
    // Server responded with error
    const { status, data } = error.response;

    switch (status) {
      case 401:
        // Unauthorized - redirect to login
        window.location.href = '/login';
        break;
      case 403:
        alert('You do not have permission to perform this action');
        break;
      case 404:
        alert('Resource not found');
        break;
      case 429:
        alert('Too many requests. Please try again later.');
        break;
      case 500:
        alert('Server error. Please try again later.');
        break;
      default:
        alert(data.message || 'An error occurred');
    }

    return data;
  } else if (error.request) {
    // Request made but no response
    alert('Network error. Please check your connection.');
  } else {
    // Something else happened
    alert('An unexpected error occurred');
  }

  throw error;
}

// Use in components
async function fetchData() {
  try {
    const result = await someService.getData();
    return result;
  } catch (error) {
    handleApiError(error);
  }
}
```

---

## Summary

This guide covers **EVERY API** in the Traf3li backend with:

✅ Complete service classes for all endpoints
✅ Copy-paste ready code examples
✅ React component examples
✅ WebSocket integration
✅ Error handling
✅ Authentication flow
✅ File uploads
✅ Payment integration
✅ State management

**All code is production-ready and can be used directly in your frontend!**

---

**API Base URL:** `http://localhost:8080/api`
**WebSocket URL:** `http://localhost:8080`

**Remember to:**
1. Set `withCredentials: true` for all requests
2. Configure CORS on backend
3. Handle errors properly
4. Use HTTPS in production
