import React from 'react';
import {useAuth} from '../hooks/useAuth';
import UserStack from './UserStack';
import AuthStack from './AuthStack';

export default function RootNavigation() {
  const { user } = useAuth();

  return user ? React.createElement(UserStack, null) : React.createElement(AuthStack, null);

}