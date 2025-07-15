import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Security,
  LockOutlined,
  PersonOutline,
  Computer,
  Assessment,
  Verified,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #00A651 0%, #008A44 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
          gap: 4, 
          alignItems: 'center' 
        }}>
          {/* Left Side - Branding */}
          <Box sx={{ color: 'white', textAlign: { xs: 'center', md: 'left' } }}>
            {/* Safaricom Logo */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' } }}>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  bgcolor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 'bold',
                    color: '#00A651',
                    fontSize: '1.5rem',
                  }}
                >
                  S
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: 'bold',
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                    lineHeight: 1,
                  }}
                >
                  Safaricom
                </Typography>
              </Box>
            </Box>
            <Typography
              variant="h4"
              component="h2"
              sx={{
                fontWeight: 500,
                mb: 3,
                fontSize: { xs: '1.5rem', md: '2rem' },
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                mt: -1,
              }}
            >
              PVMG and Compliance Portal
            </Typography>
            <Typography
              variant="h6"
              sx={{
                mb: 4,
                opacity: 0.9,
                lineHeight: 1.6,
                fontSize: { xs: '1rem', md: '1.25rem' },
              }}
            >
              Secure Platform for Vulnerability Management, Asset Inventory, and Compliance Monitoring
            </Typography>
            
            {/* Feature Cards */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, 
              gap: 2, 
              mt: 2 
            }}>
              <Card sx={{ bgcolor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Computer sx={{ fontSize: 40, color: 'white', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                    Asset Management
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ bgcolor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Assessment sx={{ fontSize: 40, color: 'white', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                    Vulnerability Management
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ bgcolor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Verified sx={{ fontSize: 40, color: 'white', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                    Compliance Management
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Right Side - Login Form */}
          <Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Paper
                elevation={24}
                sx={{
                  padding: 4,
                  width: '100%',
                  maxWidth: 400,
                  borderRadius: 3,
                  backdropFilter: 'blur(20px)',
                  bgcolor: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      mb: 2,
                      boxShadow: '0 4px 16px rgba(0,166,81,0.3)',
                    }}
                  >
                    <Security sx={{ fontSize: 40, color: 'white' }} />
                  </Box>
                  <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                      fontWeight: 'bold',
                      color: 'primary.main',
                      mb: 1,
                    }}
                  >
                    Welcome Back
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Sign in to access your secure portal
                  </Typography>
                  <Divider sx={{ width: '60%', mx: 'auto' }} />
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit}>
                  <Box sx={{ position: 'relative', mb: 3 }}>
                    <PersonOutline
                      sx={{
                        position: 'absolute',
                        left: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'text.secondary',
                        zIndex: 1,
                        pointerEvents: 'none',
                      }}
                    />
                    <TextField
                      required
                      fullWidth
                      id="username"
                      label="Username"
                      name="username"
                      autoComplete="username"
                      autoFocus
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                        '& .MuiInputBase-input': {
                          pl: 6,
                        },
                      }}
                    />
                  </Box>

                  <Box sx={{ position: 'relative', mb: 4 }}>
                    <LockOutlined
                      sx={{
                        position: 'absolute',
                        left: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'text.secondary',
                        zIndex: 1,
                        pointerEvents: 'none',
                      }}
                    />
                    <TextField
                      required
                      fullWidth
                      name="password"
                      label="Password"
                      type="password"
                      id="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                        '& .MuiInputBase-input': {
                          pl: 6,
                        },
                      }}
                    />
                  </Box>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                    sx={{
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      borderRadius: 2,
                      background: 'linear-gradient(45deg, #00A651 30%, #33B96C 90%)',
                      boxShadow: '0 4px 16px rgba(0,166,81,0.3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #008A44 30%, #00A651 90%)',
                        boxShadow: '0 6px 20px rgba(0,166,81,0.4)',
                      },
                      '&:disabled': {
                        background: 'linear-gradient(45deg, #ccc 30%, #ddd 90%)',
                      },
                    }}
                  >
                    {loading ? 'Signing In...' : 'Sign In Securely'}
                  </Button>
                </Box>

                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Safaricom PVMG and Compliance Portal
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Box>
        
        {/* Copyright Footer */}
        <Box 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            textAlign: 'center', 
            py: 2, 
            bgcolor: 'rgba(0,0,0,0.2)', 
            backdropFilter: 'blur(10px)' 
          }}
        >
          <Typography variant="caption" sx={{ color: 'white', opacity: 0.8 }}>
            © {new Date().getFullYear()} Safaricom PLC. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;