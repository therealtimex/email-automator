
import * as msal from '@azure/msal-node';

try {
    const publicConfig = {
        auth: {
            clientId: '',
            authority: 'https://login.microsoftonline.com/common',
        },
    };
    console.log('Attempting to create PublicClientApplication with empty clientId...');
    new msal.PublicClientApplication(publicConfig);
    console.log('Success!');
} catch (error) {
    console.error('Caught error:', error);
}
