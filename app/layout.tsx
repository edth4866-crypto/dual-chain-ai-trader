import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{margin:0,fontFamily:"Arial, sans-serif",background:"#0b0d10",color:"#f4f4f5"}}>
        {children}
      </body>
    </html>
  );
}