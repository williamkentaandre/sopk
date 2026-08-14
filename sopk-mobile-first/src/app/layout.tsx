import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ServiceWorkerBootstrap } from "@/components/ServiceWorkerBootstrap";

import "./globals.css";

const CAPACITOR_SW_KILL = `(function(){
if(typeof navigator==='undefined'||!navigator.serviceWorker)return;
if(typeof location==='undefined')return;
var isCap=location.protocol==='capacitor:'||location.protocol==='ionic:';
if(!isCap)return;
navigator.serviceWorker.getRegistrations().then(function(rs){
rs.forEach(function(r){r.unregister();});
});
if(typeof caches!=='undefined'){
caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k);});});
}
})();`;

const DISABLE_PINCH_ZOOM = `(function(){
if(typeof document==='undefined')return;
document.addEventListener('gesturestart',function(e){e.preventDefault();},{passive:false});
document.addEventListener('gesturechange',function(e){e.preventDefault();},{passive:false});
document.addEventListener('gestureend',function(e){e.preventDefault();},{passive:false});
})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://nutrisopk.local"),
  title: "Régime SOPK - Programme mobile SOPK 30 jours",
  description:
    "Application mobile-first SOPK: onboarding, plan alimentaire 30 jours, suivi quotidien, conseils personnalisés et hydratation.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    title: "Régime SOPK",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="app-shell-bg min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: CAPACITOR_SW_KILL }} />
        <script dangerouslySetInnerHTML={{ __html: DISABLE_PINCH_ZOOM }} />
        <ServiceWorkerBootstrap />
        {children}
      </body>
    </html>
  );
}
