import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (email, mat_khau) => {
    try {
      const response = await api.post('/auth/login', { email, mat_khau });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      
      // Fetch user info after successful login
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Đăng nhập thất bại. Vui lòng thử lại.' 
      };
    }
  };

  // Helper function to translate FastAPI validation errors to Vietnamese
  const translateError = (detail) => {
    if (!detail) return 'Đăng ký thất bại. Vui lòng thử lại.';
    
    if (typeof detail === 'string') {
      return detail;
    }
    
    if (Array.isArray(detail)) {
      return detail.map(err => {
        const field = err.loc[err.loc.length - 1]; // get the field name
        const type = err.type;
        
        switch (field) {
          case 'email':
            return 'Email không hợp lệ.';
          case 'mat_khau':
            if (type.includes('too_short')) return 'Mật khẩu phải dài ít nhất 8 ký tự.';
            return 'Mật khẩu không hợp lệ.';
          case 'ho_ten':
            if (type.includes('too_short')) return 'Họ tên phải dài ít nhất 2 ký tự.';
            return 'Họ tên không hợp lệ.';
          default:
            return 'Dữ liệu nhập vào chưa đúng định dạng.';
        }
      }).join(' ');
    }
    
    return 'Lỗi không xác định.';
  };

  const register = async (userData) => {
    try {
      await api.post('/auth/register', userData);
      // Auto login after successful registration
      return await login(userData.email, userData.mat_khau);
    } catch (error) {
      console.error('Registration failed:', error);
      const errorMessage = translateError(error.response?.data?.detail);
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
