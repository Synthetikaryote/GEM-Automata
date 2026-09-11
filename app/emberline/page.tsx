import type { Metadata } from 'next';
import Emberline from './Emberline';
import { gamePath } from '../paths';
export const metadata: Metadata = {
  title: 'Emberline | Foundry Wars',
  description: 'Build the supply line. Forge an army. A portrait factory strategy game with physical conveyors and a protected economy.',
  applicationName: 'Emberline', manifest: gamePath('/emberline.webmanifest'),
  appleWebApp: { capable: true, title: 'Emberline', statusBarStyle: 'black-translucent' },
  icons: { icon: gamePath('/emberline-art/icon-192.png'), apple: gamePath('/emberline-art/apple-touch-icon.png') },
};
export default function Page() { return <Emberline />; }
