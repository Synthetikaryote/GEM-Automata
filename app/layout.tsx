import type { Metadata, Viewport } from 'next';
import './globals.css';
const origin='https://gem-automata.synthetikaryote.chatgpt.site';
export const metadata:Metadata={
  metadataBase:new URL(origin),title:'Riftward | Keepers of the Wild',description:'A pocket-sized real-time strategy game. Build your sanctum, harvest the wild rift, and overcome a rival keeper.',
  applicationName:'Riftward',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'Riftward'},
  other:{'apple-mobile-web-app-capable':'yes'},
  icons:{icon:[{url:'/art/icon-192.png',sizes:'192x192',type:'image/png'}],apple:[{url:'/art/apple-touch-icon.png',sizes:'180x180',type:'image/png'}]},
  openGraph:{title:'GEM — Automata Duel',description:'Gather, refine, automate, defend, and overwhelm a rival machine intelligence.',type:'website',images:[{url:`${origin}/og.png`,width:1728,height:910,alt:'GEM Automata Duel — cyan and red machines battle over a golden gem'}]},
  twitter:{card:'summary_large_image',title:'GEM — Automata Duel',description:'Gather, refine, automate, defend, and overwhelm a rival machine intelligence.',images:[`${origin}/og.png`]},
};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#0b1c20'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>;}
