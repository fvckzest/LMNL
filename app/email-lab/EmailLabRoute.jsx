'use client';

import { ThemeProvider } from '../../src/components/ThemeProvider';
import EmailLab from '../../src/pages/EmailLab';

export default function EmailLabRoute() {
  return (
    <ThemeProvider>
      <EmailLab />
    </ThemeProvider>
  );
}
