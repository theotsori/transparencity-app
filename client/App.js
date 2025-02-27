import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import DiscussionScreen from './screens/forums/DiscussionScreen';
import { AuthProvider } from './contexts/AuthContext';

const Stack = createStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Discussion"
            component={DiscussionScreen}
            initialParams={{ proposalId: '123', proposalTitle: 'Sample Proposal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
