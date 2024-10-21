export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    row.classList.add('action-cards-block');
    [...row.children].forEach((col) => {
      const divContent = document.createElement('div');
      divContent.classList.add('action-cards-content');

      const divButton = document.createElement('div');
      divButton.classList.add('action-cards-button');

      const button = col.querySelector('p.button-container');
      if (button) {
        divButton.appendChild(button);
      }

      col.classList.add('action-cards-item');
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }

      divContent.innerHTML = col.innerHTML;
      col.innerHTML = '';
      col.appendChild(divContent);
      col.appendChild(divButton);
    });
  });

  // attach event listener to first button for opening as an overlay, to be done in separate story
}
