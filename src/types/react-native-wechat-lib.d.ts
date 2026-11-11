declare module 'react-native-wechat-lib' {
  export function registerApp(appId: string, universalLink?: string): Promise<boolean>;
  export function isWXAppInstalled(): Promise<boolean>;
  export function sendAuthRequest(scope: string | string[], state?: string): Promise<{
    code?: string;
    state?: string;
  }>;
}
