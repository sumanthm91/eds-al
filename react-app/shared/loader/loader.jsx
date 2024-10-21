import React, { useEffect, useRef } from 'react';
import './loader.css';
import { decorateIcons } from '../../../scripts/aem';

function Loader() {
  const loaderRef = useRef(null);
  useEffect(() => {
    if (loaderRef.current) {
      decorateIcons(loaderRef.current);
    }
  }, []);

  return (
    <div className="loading-spinner" ref={loaderRef}>
      <span className="icon icon-ic-loader" />
    </div>
  );
}

export default Loader;
