import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import { awsConfig } from './config';
import ChatPage from './pages/ChatPage';

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: awsConfig.userPoolId,
      userPoolClientId: awsConfig.userPoolClientId,
      identityPoolId: awsConfig.identityPoolId,
    }
  },
  API: {
    Events: {
      endpoint: awsConfig.eventApiEndpoint,
      region: awsConfig.region,
      defaultAuthMode: 'iam'
    }
  }
});

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <ChatPage signOut={signOut} user={user} />
      )}
    </Authenticator>
  );
}

export default App;
