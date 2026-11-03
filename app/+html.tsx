import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

// Rammen rundt nettsiden: språk og beskrivelse som vises i Google og når lenken deles.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="nb">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta
          name="description"
          content="Ta bilde av et parkeringsskilt, så forteller Arvid deg om du kan parkere. Han er ikke blid, men han har alltid rett."
        />
        <meta property="og:title" content="Arvid: kan jeg parkere her?" />
        <meta property="og:description" content="Gretten AI som tolker parkeringsskilt for deg." />
        <meta name="theme-color" content="#F5F5F0" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
