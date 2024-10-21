import React from 'react';

function FullScreenSVG(props) {
  const { mapFullScreen } = props;
  if (mapFullScreen) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="74" height="74" viewBox="0 0 74 74">
        <defs>
          <path id="collapse_b" d="M37 63.208c-14.474 0-26.208-11.734-26.208-26.208 0-14.474 11.734-26.208 26.208-26.208 14.474 0 26.208 11.734 26.208 26.208 0 14.474-11.734 26.208-26.208 26.208z" />
          <path id="collapse_d" d="M33.917 40.083v9.47h-2.863v-6.607h-6.608v-2.863h9.47zm9.03-15.637v6.608h6.607v2.863h-9.47v-9.47h2.862z" />
          <filter id="collapse_a" width="136.5%" height="136.5%" x="-18.2%" y="-18.2%" filterUnits="objectBoundingBox">
            <feOffset dy="3" in="SourceAlpha" result="shadowOffsetOuter1" />
            <feGaussianBlur in="shadowOffsetOuter1" result="shadowBlurOuter1" stdDeviation="2" />
            <feColorMatrix in="shadowBlurOuter1" result="shadowMatrixOuter1" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.201370018 0" />
            <feMerge>
              <feMergeNode in="shadowMatrixOuter1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g fill="none" fillRule="evenodd" filter="url(#collapse_a)">
          <mask id="collapse_c" fill="#fff">
            <use href="#collapse_b" />
          </mask>
          <g fill="#FFF" mask="url(#collapse_c)">
            <path d="M0 0H74V74H0z" transform="rotate(-180 37 37)" />
          </g>
          <use fill="#000" href="#collapse_d" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="74"
      height="74"
      viewBox="0 0 74 74"
    >
      <defs>
        <path
          id="expand__b"
          d="M37 63.208c-14.474 0-26.208-11.734-26.208-26.208 0-14.474 11.734-26.208 26.208-26.208 14.474 0 26.208 11.734 26.208 26.208 0 14.474-11.734 26.208-26.208 26.208z"
        />
        <path
          id="expand__d"
          d="M29.071 38.321h-2.863v9.47h9.47V44.93h-6.607V38.32zm9.25-12.113v2.863h6.608v6.608h2.863v-9.47h-9.47z"
        />
        <filter
          id="expand__a"
          width="136.5%"
          height="136.5%"
          x="-18.2%"
          y="-18.2%"
          filterUnits="objectBoundingBox"
        >
          <feOffset dy="3" in="SourceAlpha" result="shadowOffsetOuter1" />
          <feGaussianBlur
            in="shadowOffsetOuter1"
            result="shadowBlurOuter1"
            stdDeviation="2"
          />
          <feColorMatrix
            in="shadowBlurOuter1"
            result="shadowMatrixOuter1"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.201370018 0"
          />
          <feMerge>
            <feMergeNode in="shadowMatrixOuter1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g fill="none" fillRule="evenodd" filter="url(#expand__a)">
        <mask id="expand__c" fill="#fff">
          <use href="#expand__b" />
        </mask>
        <g fill="#FFF" mask="url(#expand__c)">
          <path d="M0 0H74V74H0z" transform="rotate(-180 37 37)" />
        </g>
        <use fill="#000" fillRule="nonzero" href="#expand__d" />
      </g>
    </svg>

  );
}

export default FullScreenSVG;
