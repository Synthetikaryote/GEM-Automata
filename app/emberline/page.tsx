import type { Metadata } from 'next';
import Emberline from './Emberline';
export const metadata: Metadata = {
  title: 'Emberline | Foundry Wars',
  description: 'Build the supply line. Forge an army. A portrait factory strategy game with physical conveyors and a protected economy.',
  applicationName: 'Emberline', manifest: '/emberline.webmanifest',
  appleWebApp: { capable: true, title: 'Emberline', statusBarStyle: 'black-translucent' },
  icons: { icon: '/emberline-art/icon-192.png', apple: '/emberline-art/apple-touch-icon.png' },
};
export default function Page() { return <Emberline />; }
