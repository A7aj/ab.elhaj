import React from 'react';

export const SetEndIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="20" y1="21" x2="20" y2="14"></line>
    <line x1="20" y1="10" x2="20" y2="3"></line>
    <path d="M2 14h10v-4h-10z"></path>
    <path d="M12 10l4 2-4 2"></path>
  </svg>
);