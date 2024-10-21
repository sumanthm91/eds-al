import React from 'react';

function LocateSvg({ hover }) {
  if (hover) {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" transform="rotate(0) scale(1, 1)">
        <path d="M17.9546 6.04533C14.666 2.7567 9.33404 2.7567 6.04542 6.04533C2.75679 9.33395 2.75679 14.6659 6.04542 17.9545C9.33404 21.2431 14.666 21.2431 17.9546 17.9545C21.2432 14.6659 21.2432 9.33395 17.9546 6.04533Z" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.6747 10.3253C12.7498 9.40036 11.2502 9.40036 10.3253 10.3253C9.40036 11.2502 9.40036 12.7498 10.3253 13.6747C11.2502 14.5997 12.7498 14.5997 13.6747 13.6747C14.5997 12.7498 14.5997 11.2502 13.6747 10.3253Z" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 2L12 5.68421" stroke="#ffffff" strokeLinecap="round" />
        <path d="M22 12H18.3158" stroke="#ffffff" strokeLinecap="round" />
        <path d="M5.68421 12H2" stroke="#ffffff" strokeLinecap="round" />
        <path d="M12 18.3159L12 22.0001" stroke="#ffffff" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" transform="rotate(0) scale(1, 1)">
      <path d="M17.9546 6.04533C14.666 2.7567 9.33404 2.7567 6.04542 6.04533C2.75679 9.33395 2.75679 14.6659 6.04542 17.9545C9.33404 21.2431 14.666 21.2431 17.9546 17.9545C21.2432 14.6659 21.2432 9.33395 17.9546 6.04533Z" stroke="#4285f4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.6747 10.3253C12.7498 9.40036 11.2502 9.40036 10.3253 10.3253C9.40036 11.2502 9.40036 12.7498 10.3253 13.6747C11.2502 14.5997 12.7498 14.5997 13.6747 13.6747C14.5997 12.7498 14.5997 11.2502 13.6747 10.3253Z" stroke="#4285f4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2L12 5.68421" stroke="#4285f4" strokeLinecap="round" />
      <path d="M22 12H18.3158" stroke="#4285f4" strokeLinecap="round" />
      <path d="M5.68421 12H2" stroke="#4285f4" strokeLinecap="round" />
      <path d="M12 18.3159L12 22.0001" stroke="#4285f4" strokeLinecap="round" />
    </svg>
  );
}

export default LocateSvg;
