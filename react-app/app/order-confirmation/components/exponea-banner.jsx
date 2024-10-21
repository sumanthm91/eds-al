import React, { useContext, useState, useEffect } from 'react';
import CartContext from '../../../context/cart-context.jsx';

function ExponeaBanner({ content }) {
  const { placeholders } = useContext(CartContext);
  const [rating, setRating] = useState(0);
  const [visible, setVisible] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(false);

  function handleStarClick(rate) {
    setRating(rate);
    setBannerVisible(false);

    document.body.style.paddingTop = '0';
    document.body.style.transition = 'padding-top 1.5s ease';

    setTimeout(() => setVisible(false), 500);
  }

  useEffect(() => {
    if (visible) {
      setTimeout(() => setBannerVisible(true), 100);
      document.body.style.transition = 'padding-top 1.5s ease';
      document.body.style.paddingTop = '64px';
    } else {
      document.body.style.paddingTop = '0';
    }
    return () => {
      document.body.style.paddingTop = '0';
      document.body.style.transition = '';
    };
  }, [visible]);

  function handleSubmit(e) {
    e.preventDefault();
    console.log('Rating submitted:', rating);
  }

  // Function to get the appropriate icon based on the rating
  const getIconForRating = (rate) => {
    switch (rate) {
      case 1:
        return content.scaleSadIcon; // Sad icon for rating 1
      case 2:
        return content.scaleMehIcon; // Neutral icon for rating 2
      case 3:
        return content.scaleSmileIcon; // Happy icon for rating 3
      default:
        return '';
    }
  };

  return (
    visible && (
      <div className={`exponea-banner ${bannerVisible ? 'visible' : ''}`}>
        <div className="exponea-banner-body">
          <div className="exponea-question">{placeholders.exponeaQuestion}</div>
          <form className="exponea-form" onSubmit={handleSubmit}>
            <input name="answer" type="hidden" value={rating} />
            <div className="stars">
              {[3, 2, 1].map((rate) => (
                <div
                  key={rate}
                  className={`star ${rate <= rating ? 'selected' : ''}`}
                  onClick={() => handleStarClick(rate)}
                  onKeyUp={(e) => e.key === 'Enter' && handleStarClick(rate)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Rate ${rate} star`}
                >
                  <span
                    dangerouslySetInnerHTML={{
                      __html: getIconForRating(rate), // Different icon for each rating
                    }}
                  />
                </div>
              ))}
            </div>
            <input type="submit" className="exponea-button" value="Submit" />
          </form>
        </div>
      </div>
    )
  );
}

export default ExponeaBanner;
