export default function decorate(block) {
  const cardDiv = document.createElement('div');
  cardDiv.classList.add('teaser-block');

  [...block.children].forEach((row) => {
    [...row.children].forEach((col, idx) => {
      if (idx === 0) {
        const imageDiv = document.createElement('div');
        imageDiv.classList.add('teaser-img');
        imageDiv.classList.add('teaser-item');
        imageDiv.append(col);
        cardDiv.append(imageDiv);
      } else {
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('teaser-item');
        contentDiv.classList.add('teaser-content');

        const textDiv = document.createElement('div');
        textDiv.classList.add('teaser-content-text');

        const buttons = col.querySelectorAll('p.button-container');
        const buttonDiv = document.createElement('div');
        buttonDiv.classList.add('teaser-buttons');

        const buttonContainerDiv = document.createElement('div');
        buttons.forEach((button) => {
          buttonContainerDiv.append(button);
        });

        buttonDiv.append(buttonContainerDiv);
        textDiv.append(col);
        contentDiv.append(textDiv);
        contentDiv.append(buttonDiv);
        cardDiv.append(contentDiv);
      }
    });
  });

  block.textContent = '';
  block.append(cardDiv);
}
