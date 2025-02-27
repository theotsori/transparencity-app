import React from 'react';

export const AuthContext = React.createContext();

export const AuthProvider = ({ children }) => {
  const user = { id: 'userId', fullName: 'Test User' }; // Mock logged-in user
  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);
